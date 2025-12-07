from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiExample

from gmail_service.models import GmailAccount
from vendors.models import Vendor
from gmail_service.services.gmail import GmailService
from .models import ChatSession, ChatMessage, EmailTemplate, SentEmail
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
    Get vendors for email template sending, filtering out already sent vendors
    """
    
    @extend_schema(
        summary="Get Available Vendors",
        description="Get list of vendors to send RFP emails to, excluding those already sent the selected template",
        responses={200: VendorSelectionResponseSerializer}
    )
    def get(self, request):
        try:
            template_id = request.GET.get('template_id')
            user_email = request.GET.get('user_email')
            
            vendors = Vendor.objects.all()
            
            # If template_id is provided, filter out vendors that already received this template
            if template_id:
                try:
                    email_template = EmailTemplate.objects.get(id=template_id)
                    
                    # Get vendors that have already been sent this template
                    sent_vendor_ids = SentEmail.objects.filter(
                        template=email_template,
                        status='sent'  # Only exclude successfully sent emails
                    ).values_list('vendor_id', flat=True)
                    
                    # Exclude vendors that already received the email
                    vendors = vendors.exclude(id__in=sent_vendor_ids)
                    
                except EmailTemplate.DoesNotExist:
                    pass  # If template doesn't exist, show all vendors
            
            vendor_list = []
            for vendor in vendors:
                vendor_data = {
                    "id": vendor.id,
                    "name": vendor.name,
                    "email": vendor.email,
                    "company": vendor.company,
                    "phone": vendor.phone
                }
                
                # Add sent status if template_id is provided
                if template_id:
                    sent_email = SentEmail.objects.filter(
                        template_id=template_id,
                        vendor=vendor
                    ).first()
                    
                    if sent_email:
                        vendor_data["email_status"] = {
                            "status": sent_email.status,
                            "sent_at": sent_email.sent_at.isoformat() if sent_email.sent_at else None,
                            "error": sent_email.error_message
                        }
                    else:
                        vendor_data["email_status"] = {"status": "not_sent"}
                
                vendor_list.append(vendor_data)
            
            # If template_id is provided, also return send statistics
            response_data = {
                "vendors": vendor_list,
                "total": len(vendor_list)
            }
            
            if template_id:
                try:
                    email_template = EmailTemplate.objects.get(id=template_id)
                    sent_count = SentEmail.objects.filter(
                        template=email_template,
                        status='sent'
                    ).count()
                    
                    failed_count = SentEmail.objects.filter(
                        template=email_template,
                        status='failed'
                    ).count()
                    
                    total_vendors = Vendor.objects.count()
                    
                    response_data["email_stats"] = {
                        "sent_count": sent_count,
                        "failed_count": failed_count,
                        "remaining_count": len(vendor_list),
                        "total_vendors": total_vendors,
                        "template_subject": email_template.subject
                    }
                except EmailTemplate.DoesNotExist:
                    pass
            
            return Response(response_data)
            
        except Exception as e:
            return Response({"error": f"Failed to get vendors: {str(e)}"}, status=500)


class SendTemplateEmailView(APIView):
    """
    Send email template to a single vendor
    """
    
    @extend_schema(
        summary="Send Template Email",
        description="Send RFP email template to a single vendor",
        request=SendTemplateEmailSerializer,
        responses={200: SendTemplateEmailResponseSerializer}
    )
    def post(self, request):
        serializer = SendTemplateEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template_id = serializer.validated_data['template_id']
        vendor_id = serializer.validated_data['vendor_id']
        user_email = serializer.validated_data['user_email']
        
        try:
            # Get the email template
            email_template = EmailTemplate.objects.get(id=template_id)
            
            # Get sender's Gmail account
            gmail_account = GmailAccount.objects.get(email=user_email)
            
            # Get the vendor
            vendor = Vendor.objects.get(id=vendor_id)
            
            # Check if email was already sent to this vendor with this template
            existing_send = SentEmail.objects.filter(
                template=email_template,
                vendor=vendor
            ).first()
            
            if existing_send:
                return Response({
                    "success": False,
                    "message": f"Email already sent to {vendor.name}",
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "vendor_email": vendor.email,
                    "error": f"This template was already sent to {vendor.name} on {existing_send.sent_at.strftime('%Y-%m-%d %H:%M')}"
                }, status=400)
            
            try:
                # Send email using Gmail service
                result = GmailService.send_email(
                    gmail_account=gmail_account,
                    to_email=vendor.email,
                    subject=email_template.subject,
                    body=email_template.template_body,
                    attachments=[]
                )
                
                # Record successful send
                sent_email = SentEmail.objects.create(
                    template=email_template,
                    vendor=vendor,
                    sender=gmail_account,
                    vendor_email_at_time=vendor.email,
                    vendor_name_at_time=vendor.name,
                    vendor_company_at_time=vendor.company,
                    message_id=result.get("message_id"),
                    thread_id=result.get("thread_id"),
                    status='sent'
                )
                
                return Response({
                    "success": True,
                    "message": f"Email sent successfully to {vendor.name}",
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "vendor_email": vendor.email,
                    "message_id": result.get("message_id"),
                    "thread_id": result.get("thread_id"),
                    "sent_at": sent_email.sent_at.isoformat()
                })
                
            except Exception as e:
                # Record failed send
                SentEmail.objects.create(
                    template=email_template,
                    vendor=vendor,
                    sender=gmail_account,
                    vendor_email_at_time=vendor.email,
                    vendor_name_at_time=vendor.name,
                    vendor_company_at_time=vendor.company,
                    status='failed',
                    error_message=str(e)
                )
                
                return Response({
                    "success": False,
                    "message": f"Failed to send email to {vendor.name}",
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "vendor_email": vendor.email,
                    "error": str(e)
                }, status=400)
            
        except EmailTemplate.DoesNotExist:
            return Response({
                "success": False,
                "message": "Email template not found",
                "error": "Template does not exist"
            }, status=404)
        except GmailAccount.DoesNotExist:
            return Response({
                "success": False, 
                "message": "Gmail account not found",
                "error": "Please connect your Gmail account first"
            }, status=404)
        except Vendor.DoesNotExist:
            return Response({
                "success": False,
                "message": "Vendor not found",
                "error": "Vendor does not exist"
            }, status=404)
        except Exception as e:
            return Response({
                "success": False,
                "message": "Failed to send email",
                "error": str(e)
            }, status=500)


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
