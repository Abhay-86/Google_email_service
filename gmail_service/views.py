from django.shortcuts import render
from django.conf import settings
from gmail_service.models import GmailAccount
from gmail_service.services.gmail import GmailService
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from gmail_service.serializers import (
    GmailConnectSerializer,
    GmailCallbackSerializer,
    SendEmailSerializer,
    ReadThreadQuerySerializer
)

class GmailConnectView(APIView):

    @extend_schema(
        operation_id="gmail_connect",
        description="Start Gmail OAuth by submitting an email. Returns Google OAuth URL or connection status.",
        request=GmailConnectSerializer,
        responses={200: dict},
    )
    def post(self, request):
        serializer = GmailConnectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            gmail_account = GmailAccount.objects.get(email=email)

            if gmail_account.has_valid_access_token():
                return Response({
                    "connected": True,
                    "email": email,
                    "message": "Gmail already connected."
                }, status=status.HTTP_200_OK)

            GmailService.refresh_access_token(gmail_account)

            return Response({
                "connected": True,
                "email": email,
                "message": "Access token refreshed. Gmail is connected."
            }, status=status.HTTP_200_OK)

        except GmailAccount.DoesNotExist:
            pass 
        
        redirect_uri = settings.BACKEND_URL + "/api/gmail/callback/"
        auth_url = GmailService.generate_auth_url(email, redirect_uri)

        return Response({
            "connected": False,
            "auth_url": auth_url,
            "message": "Redirect user to Google OAuth to connect Gmail."
        }, status=status.HTTP_200_OK)

    
class GmailCallbackView(APIView):

    @extend_schema(
        responses={200: GmailCallbackSerializer},
        description="OAuth callback from Google. Exchanges code for tokens and saves them."
    )
    def get(self, request):
        code = request.GET.get("code")
        email_state = request.GET.get("state")

        redirect_uri = settings.BACKEND_URL + "/api/gmail/callback/"
        tokens = GmailService.exchange_code_for_token(
            email=email_state,
            code=code,
            redirect_uri=redirect_uri
        )

        response_data = {
            "success": True,
            "email": tokens["email"],
        }

        serializer = GmailCallbackSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SendEmailView(APIView):
    @extend_schema(
        description="Send an email using the connected Gmail account.",
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "from_email": {"type": "string", "format": "email"},
                    "to_email": {"type": "string", "format": "email"},
                    "subject": {"type": "string"},
                    "body": {"type": "string"},
                    "attachments": {
                        "type": "array",
                        "items": {"type": "string", "format": "binary"}
                    }
                },
                "required": ["from_email", "to_email", "subject", "body"]
            }
        },
        responses={200: dict},
    )
    def post(self, request):
        serializer = SendEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # attachments (from form-data)
        attachments = request.FILES.getlist("attachments")

        # Look up the Gmail account using the DB model
        try:
            acc = GmailAccount.objects.get(email=data["from_email"])
        except GmailAccount.DoesNotExist:
            return Response(
                {"error": "This email is not connected via OAuth"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Send the email
        result = GmailService.send_email(
            acc,
            data["to_email"],
            data["subject"],
            data["body"],
            attachments=attachments
        )

        return Response(result, status=status.HTTP_200_OK)

class ReadThreadView(APIView):

    @extend_schema(
        parameters=[ReadThreadQuerySerializer],
        responses={200: dict},
        description="Read all replies inside a Gmail thread"
    )
    def get(self, request):
        serializer = ReadThreadQuerySerializer(data=request.GET)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        acc = GmailAccount.objects.get(email=data["email"])

        msgs = GmailService.read_thread(acc, data["thread_id"])
        return Response({"messages": msgs}, status=status.HTTP_200_OK)
