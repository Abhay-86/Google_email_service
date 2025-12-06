from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiExample

from gmail_service.models import GmailAccount
from .models import ChatSession, ChatMessage
from .serializers import (
    ChatRequestSerializer,
    StartChatSerializer,
    ChatMessageSerializer,
    ChatHistorySerializer,
    SubmitChatSerializer,
    ChatStartResponseSerializer,
    ChatMessageResponseSerializer,
    ChatHistoryResponseSerializer,
    ChatSubmitResponseSerializer
)
from .services.chat_service import ChatService


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

        session.is_closed = True
        session.is_submitted = True
        session.save()

        return Response({
            "status": "submitted",
            "message": "Chat session submitted and closed."
        })

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
