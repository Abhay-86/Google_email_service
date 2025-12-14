from django.shortcuts import render
from django.conf import settings
from django.utils import timezone 
from django.utils.dateparse import parse_datetime
from email.utils import parsedate_to_datetime
from gmail_service.models import GmailAccount
from gmail_service.services.gmail import GmailService 
from gmail_service.models import EmailThread, EmailMessage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from chat.models import SentEmail
from gmail_service.serializers import (
    GmailConnectSerializer,
    GmailCallbackSerializer,
    GmailTokenExchangeSerializer,
    SendEmailSerializer,
    ReadThreadQuerySerializer,
    SyncSingleThreadSerializer,
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
        
        # Dynamically determine frontend URL based on request origin
        origin = request.META.get('HTTP_ORIGIN')
        if origin and origin.startswith(('http://', 'https://')):
            frontend_url = origin
        else:
            # Fallback to settings
            frontend_url = settings.FRONTEND_URL
            
        redirect_uri = frontend_url + "/auth/callback"
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

        # Dynamically determine frontend URL based on request origin
        origin = request.META.get('HTTP_ORIGIN')
        if origin and origin.startswith(('http://', 'https://')):
            frontend_url = origin
        else:
            # Fallback to settings
            frontend_url = settings.FRONTEND_URL
            
        redirect_uri = frontend_url + "/auth/callback"
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


class GmailTokenExchangeView(APIView):
    """
    New endpoint for frontend to exchange OAuth code for tokens
    """
    
    @extend_schema(
        request=GmailTokenExchangeSerializer,
        responses={200: GmailCallbackSerializer},
        description="Exchange OAuth code for access tokens (called by frontend)"
    )
    def post(self, request):
        serializer = GmailTokenExchangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]
        email_state = serializer.validated_data["state"]

        # Dynamically determine frontend URL based on request origin
        origin = request.META.get('HTTP_ORIGIN')
        if origin and origin.startswith(('http://', 'https://')):
            frontend_url = origin
        else:
            # Fallback to settings
            frontend_url = settings.FRONTEND_URL
            
        redirect_uri = frontend_url + "/auth/callback"
        tokens = GmailService.exchange_code_for_token(
            email=email_state,
            code=code,
            redirect_uri=redirect_uri
        )

        response_data = {
            "success": True,
            "email": tokens["email"],
            "access_token": tokens.get("access_token"), 
        }

        return Response(response_data, status=status.HTTP_200_OK)


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
        attachments = request.FILES.getlist("attachments")

        try:
            acc = GmailAccount.objects.get(email=data["from_email"])
        except GmailAccount.DoesNotExist:
            return Response({"error": "This email is not connected via OAuth"}, status=400)

        # send email
        result = GmailService.send_email(
            acc,
            data["to_email"],
            data["subject"],
            data["body"],
            attachments=attachments
        )

        thread_id = result["thread_id"]
        message_id = result["message_id"]

        thread, _ = EmailThread.objects.get_or_create(
            gmail_account=acc,
            recipient_email=data["to_email"],
            thread_id=thread_id
        )

        EmailMessage.objects.create(
            thread=thread,
            message_id=message_id,
            direction="OUTBOUND",
            timestamp=timezone.now(),   
            template_id=None,
        )


        return Response(result, status=200)

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
        thread_id = data["thread_id"]

        msgs = GmailService.read_thread(acc, thread_id)

        # store new messages
        thread, created = EmailThread.objects.get_or_create(
            gmail_account=acc,
            thread_id=thread_id,
            defaults={'recipient_email': None}
        )
        for m in msgs:
            # Parse timestamp - it's already an ISO string from the service
            try:
                if isinstance(m["timestamp"], str):
                    # If it's already an ISO string, parse it directly
                    timestamp_obj = parse_datetime(m["timestamp"])
                    if timestamp_obj is None:
                        # Fallback to parsedate_to_datetime
                        timestamp_obj = parsedate_to_datetime(m["timestamp"])
                else:
                    timestamp_obj = m["timestamp"]
                
                if timestamp_obj.tzinfo is None:
                    timestamp_obj = timezone.make_aware(timestamp_obj)
            except Exception as e:
                # If all else fails, use current time
                timestamp_obj = timezone.now()

            if not EmailMessage.objects.filter(message_id=m["message_id"]).exists():
                # Find the template_id for this thread by looking at SentEmail records
                template_id = None
                try:
                    
                    sent_email = SentEmail.objects.filter(
                        sender=acc,
                        thread_id=thread_id,
                        status='sent'
                    ).first()
                    if sent_email:
                        template_id = sent_email.template.id
                except Exception:
                    pass
                    
                EmailMessage.objects.create(
                    thread=thread,
                    message_id=m["message_id"],
                    direction=m["direction"],
                    timestamp=timestamp_obj,
                    template_id=template_id
                )

        return Response({"messages": msgs}, status=200)

class SyncSingleThreadView(APIView):

    @extend_schema(
        description="Sync inbound/outbound messages for a single Gmail thread.",
        request=SyncSingleThreadSerializer,
        responses={200: dict},
    )
    def post(self, request):
        serializer = SyncSingleThreadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        thread_id = serializer.validated_data["thread_id"]

        # Find connected Gmail account
        try:
            acc = GmailAccount.objects.get(email=email)
        except GmailAccount.DoesNotExist:
            return Response({"error": "This Gmail account is not connected"}, status=400)

        # Find the thread belonging to this account
        try:
            thread = EmailThread.objects.get(gmail_account=acc, thread_id=thread_id)
        except EmailThread.DoesNotExist:
            return Response({"error": "Thread not found for this account"}, status=404)

        # Read the thread from Gmail
        msgs = GmailService.read_thread(acc, thread_id)

        new_msg_count = 0

        for m in msgs:
            msg_id = m["message_id"]

            if EmailMessage.objects.filter(message_id=msg_id).exists():
                continue

            # Parse timestamp - it's already an ISO string from the service
            try:
                if isinstance(m["timestamp"], str):
                    # If it's already an ISO string, parse it directly
                    timestamp_obj = parse_datetime(m["timestamp"])
                    if timestamp_obj is None:
                        # Fallback to parsedate_to_datetime
                        timestamp_obj = parsedate_to_datetime(m["timestamp"])
                else:
                    timestamp_obj = m["timestamp"]
                
                if timestamp_obj.tzinfo is None:
                    timestamp_obj = timezone.make_aware(timestamp_obj)
            except Exception as e:
                # If all else fails, use current time
                timestamp_obj = timezone.now()

            # Find the template_id for this thread by looking at SentEmail records
            template_id = None
            try:
                sent_email = SentEmail.objects.filter(
                    sender=acc,
                    thread_id=thread_id,
                    status='sent'
                ).first()
                if sent_email:
                    template_id = sent_email.template.id
            except Exception:
                pass

            EmailMessage.objects.create(
                thread=thread,
                message_id=msg_id,
                direction=m["direction"],
                timestamp=timestamp_obj,
                template_id=template_id,
            )

            new_msg_count += 1

        return Response(
            {
                "thread_id": thread_id,
                "new_messages_added": new_msg_count,
                "status": "sync completed",
            },
            status=200,
        )
