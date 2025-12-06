from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiExample

from gmail_service.models import GmailAccount
from vendors.models import Vendor
from gmail_service.services.gmail import GmailService
from .models import ChatSession, ChatMessage, EmailTemplate
from .serializers import (
    ChatRequestSerializer,
    StartChatSerializer,
    ChatMessageSerializer,
    ChatHistorySerializer,
    SubmitChatSerializer,
    ChatStartResponseSerializer,
    ChatMessageResponseSerializer,
    ChatHistoryResponseSerializer,
    ChatSubmitResponseSerializer,
    EmailTemplateGenerationSerializer,
    VendorSelectionResponseSerializer,
    SendTemplateEmailSerializer,
    SendTemplateEmailResponseSerializer
)
from .services.chat_service import ChatService
from .services.email_service import generate_email_template


class ChatView(APIView):
    """
    Chat API for RFP conversation management.
    
    Supports multiple actions:
    - start: Create a new chat session
    - message: Send a message and get AI response  
    - history: Get full chat history
    - submit: Submit and close the chat
    """

    @extend_schema(
        summary="Chat API - Multiple Actions",
        description="Handle chat operations. Use 'action' field to specify the operation.",
        request=ChatRequestSerializer,
        responses={
            200: ChatMessageResponseSerializer,
            400: OpenApiExample("Error", value={"error": "Invalid request"}),
            404: OpenApiExample("Not Found", value={"error": "Session not found"}),
            500: OpenApiExample("Server Error", value={"error": "Internal error"})
        },
        examples=[
            OpenApiExample(
                name="Start Chat",
                description="Start a new chat session",
                value={
                    "action": "start",
                    "email": "user@gmail.com"
                }
            ),
            OpenApiExample(
                name="Send Message", 
                description="Send a message in existing chat",
                value={
                    "action": "message",
                    "session_id": 1,
                    "message": "I need 10 laptops for my office"
                }
            ),
            OpenApiExample(
                name="Get History",
                description="Get chat conversation history",
                value={
                    "action": "history", 
                    "session_id": 1
                }
            ),
            OpenApiExample(
                name="Submit Chat",
                description="Submit and close the chat session",
                value={
                    "action": "submit",
                    "session_id": 1
                }
            )
        ]
    )
    def post(self, request):
        """
        Main POST endpoint for all chat operations.
        """
        # Validate using the main serializer
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data.get("action")

        if action == "start":
            return self.start_chat(request)
        elif action == "message":
            return self.send_message(request)
        elif action == "history":
            return self.get_history(request)
        elif action == "submit":
            return self.submit(request)
        elif action == "confirm":
            return self.confirm_submit(request)
        elif action == "list":
            return self.list_sessions(request)

        return Response({"error": "Invalid action"}, status=400)

    def start_chat(self, request):
        serializer = StartChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            gmail_account = GmailAccount.objects.get(email=email)
        except GmailAccount.DoesNotExist:
            return Response({"error": "Gmail account not connected yet"}, status=400)

        session = ChatSession.objects.create(gmail_account=gmail_account)

        return Response({
            "session_id": session.id,
            "title": session.title,
            "message": "New chat session started."
        })

    def send_message(self, request):
        serializer = ChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data["session_id"]
        user_msg = serializer.validated_data["message"]

        try:
            session = ChatSession.objects.get(id=session_id)
        except ChatSession.DoesNotExist:
            return Response({"error": "Chat session not found."}, status=404)

        if session.is_closed:
            return Response({"error": "Chat is closed."}, status=400)

        try:
            llm_response = ChatService.process_message(session, user_msg)
            
            return Response({
                "assistant_reply": llm_response["assistant_reply"],
                "draft_json": llm_response["updated_json"],
                "missing_fields": llm_response.get("missing_fields", []),
                "provider": llm_response.get("provider", "unknown")
            })
            
        except Exception as e:
            return Response({
                "error": f"Failed to process message: {str(e)}"
            }, status=500)

    def get_history(self, request):
        serializer = ChatHistorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session = ChatSession.objects.get(id=serializer.validated_data["session_id"])
        except ChatSession.DoesNotExist:
            return Response({"error": "Chat session not found."}, status=404)

        session_summary = ChatService.get_session_summary(session)
        
        return Response(session_summary)

    def submit(self, request):
        serializer = SubmitChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session = ChatSession.objects.get(id=serializer.validated_data["session_id"])
        except ChatSession.DoesNotExist:
            return Response({"error": "Chat session not found."}, status=404)

        # Generate email template from draft_json
        try:
            # Check if draft_json exists and is not empty
            if not session.draft_json:
                return Response({
                    "error": "No conversation data found. Please have a conversation first."
                }, status=400)
                
            email_data = generate_email_template(session.draft_json)
            
            return Response({
                "status": "preview", 
                "session_id": session.id,
                "email_preview": {
                    "subject": email_data["subject"],
                    "body": email_data["body"]
                },
                "message": "Email template generated. Please review and confirm."
            })
        except Exception as e:
            return Response({
                "error": f"Failed to generate email template: {str(e)}"
            }, status=500)

    def list_sessions(self, request):
        """Get all chat sessions for a user"""
        # Extract email from request data
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        try:
            gmail_account = GmailAccount.objects.get(email=email)
        except GmailAccount.DoesNotExist:
            return Response({"error": "Gmail account not found"}, status=404)

        # Get all sessions for this user, ordered by newest first
        sessions = ChatSession.objects.filter(gmail_account=gmail_account).order_by('-created_at')

        session_list = [{
            "id": session.id,
            "title": session.title,
            "is_closed": session.is_closed,
            "is_submitted": session.is_submitted,
            "created_at": session.created_at.isoformat()
        } for session in sessions]

        return Response({
            "sessions": session_list,
            "total": len(session_list)
        })

    def confirm_submit(self, request):
        """Confirm and finalize the email template submission"""
        # Expect session_id, subject, and body in the request
        session_id = request.data.get("session_id")
        subject = request.data.get("subject")
        body = request.data.get("body")
        
        if not all([session_id, subject, body]):
            return Response({
                "error": "session_id, subject, and body are required"
            }, status=400)

        try:
            session = ChatSession.objects.get(id=session_id)
        except ChatSession.DoesNotExist:
            return Response({"error": "Chat session not found."}, status=404)

        # Save the email template
        # Check if template already exists for this session
        try:
            email_template = EmailTemplate.objects.get(session=session)
            # Update existing template
            email_template.subject = subject
            email_template.template_body = body
            email_template.save()
        except EmailTemplate.DoesNotExist:
            # Create new template
            email_template = EmailTemplate.objects.create(
                session=session,
                subject=subject,
                template_body=body
            )

        # Mark session as submitted and closed
        session.is_closed = True
        session.is_submitted = True
        session.save()

        return Response({
            "status": "confirmed",
            "template_id": email_template.id,
            "message": "Email template saved successfully.",
            "redirect_to": "vendor_selection",
            "template": {
                "id": email_template.id,
                "subject": email_template.subject,
                "body": email_template.template_body
            }
        })


class EmailTemplateView(APIView):
    """
    Generate and save email template for a chat session.
    """
    
    @extend_schema(
        summary="Generate Email Template",
        description="Generate subject and body for RFP email based on session's draft_json",
        request=EmailTemplateGenerationSerializer,
        responses={
            200: {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "email_template": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "subject": {"type": "string"},
                            "template_body": {"type": "string"},
                            "generated_at": {"type": "string", "format": "date-time"}
                        }
                    }
                }
            },
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
            404: {"type": "object", "properties": {"error": {"type": "string"}}}
        }
    )
    def post(self, request):
        serializer = EmailTemplateGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        session_id = serializer.validated_data['session_id']
        email = serializer.validated_data['email']
        
        try:
            gmail_account = GmailAccount.objects.get(email=email)
        except GmailAccount.DoesNotExist:
            return Response({"error": "Gmail account not found"}, status=404)
        
        try:
            session = ChatSession.objects.get(id=session_id, gmail_account=gmail_account)
        except ChatSession.DoesNotExist:
            return Response({"error": "Chat session not found"}, status=404)
        
        # Check if email template already exists
        existing_template = EmailTemplate.objects.filter(session=session).first()
        if existing_template:
            return Response({
                "success": True,
                "email_template": {
                    "id": existing_template.id,
                    "subject": existing_template.subject,
                    "template_body": existing_template.template_body,
                    "generated_at": existing_template.generated_at.isoformat()
                },
                "message": "Email template already exists for this session"
            })
        
        # Generate email template using AI
        try:
            email_result = generate_email_template(session.draft_json)
            
            # Save the generated template
            email_template = EmailTemplate.objects.create(
                session=session,
                subject=email_result['subject'],
                template_body=email_result['body']
            )
            
            return Response({
                "success": True,
                "email_template": {
                    "id": email_template.id,
                    "subject": email_template.subject,
                    "template_body": email_template.template_body,
                    "generated_at": email_template.generated_at.isoformat()
                }
            })
            
        except Exception as e:
            return Response({"error": f"Failed to generate email template: {str(e)}"}, status=500)


class VendorSelectionView(APIView):
    """
    Get vendors for email template sending
    """
    
    @extend_schema(
        summary="Get All Vendors",
        description="Get list of all vendors to send RFP emails to",
        responses={200: VendorSelectionResponseSerializer}
    )
    def get(self, request):
        try:
            vendors = Vendor.objects.all()
            vendor_list = [{
                "id": vendor.id,
                "name": vendor.name,
                "email": vendor.email,
                "company": vendor.company,
                "phone": vendor.phone
            } for vendor in vendors]
            
            return Response({
                "vendors": vendor_list,
                "total": len(vendor_list)
            })
        except Exception as e:
            return Response({"error": f"Failed to get vendors: {str(e)}"}, status=500)


class SendTemplateEmailView(APIView):
    """
    Send email template to selected vendors
    """
    
    @extend_schema(
        summary="Send Template Email",
        description="Send RFP email template to selected vendors",
        request=SendTemplateEmailSerializer,
        responses={200: SendTemplateEmailResponseSerializer}
    )
    def post(self, request):
        serializer = SendTemplateEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template_id = serializer.validated_data['template_id']
        vendor_ids = serializer.validated_data['vendor_ids']
        sender_email = serializer.validated_data['sender_email']
        
        try:
            # Get the email template
            email_template = EmailTemplate.objects.get(id=template_id)
            
            # Get sender's Gmail account
            gmail_account = GmailAccount.objects.get(email=sender_email)
            
            # Get selected vendors
            vendors = Vendor.objects.filter(id__in=vendor_ids)
            
            sent_emails = []
            failed_emails = []
            
            for vendor in vendors:
                try:
                    # Send email using Gmail service
                    result = GmailService.send_email(
                        gmail_account=gmail_account,
                        to_email=vendor.email,
                        subject=email_template.subject,
                        body=email_template.template_body,
                        attachments=[]
                    )
                    
                    sent_emails.append({
                        "vendor": vendor.name,
                        "email": vendor.email,
                        "message_id": result.get("message_id"),
                        "thread_id": result.get("thread_id")
                    })
                    
                except Exception as e:
                    failed_emails.append({
                        "vendor": vendor.name,
                        "email": vendor.email,
                        "error": str(e)
                    })
            
            return Response({
                "status": "completed",
                "sent_emails": sent_emails,
                "failed_emails": failed_emails,
                "total_sent": len(sent_emails),
                "total_failed": len(failed_emails)
            })
            
        except EmailTemplate.DoesNotExist:
            return Response({"error": "Email template not found"}, status=404)
        except GmailAccount.DoesNotExist:
            return Response({"error": "Gmail account not found"}, status=404)
        except Exception as e:
            return Response({"error": f"Failed to send emails: {str(e)}"}, status=500)


class UserTemplatesView(APIView):
    """
    Get email templates for a specific user
    """
    
    @extend_schema(
        summary="Get User Email Templates",
        description="Get all email templates for a specific user by email",
        responses={200: dict}
    )
    def get(self, request):
        email = request.GET.get('email')
        if not email:
            return Response({"error": "Email parameter is required"}, status=400)
        
        try:
            gmail_account = GmailAccount.objects.get(email=email)
        except GmailAccount.DoesNotExist:
            return Response({"error": "Gmail account not found"}, status=404)
        
        try:
            # Get all sessions for this user that have templates
            sessions_with_templates = ChatSession.objects.filter(
                gmail_account=gmail_account,
                is_submitted=True
            ).select_related('email_template').order_by('-created_at')
            
            templates = []
            for session in sessions_with_templates:
                if hasattr(session, 'email_template'):
                    templates.append({
                        "id": session.email_template.id,
                        "subject": session.email_template.subject,
                        "template_body": session.email_template.template_body,
                        "session_id": session.id,
                        "generated_at": session.email_template.generated_at.isoformat()
                    })
            
            return Response({
                "templates": templates,
                "total": len(templates)
            })
            
        except Exception as e:
            return Response({"error": f"Failed to get templates: {str(e)}"}, status=500)
