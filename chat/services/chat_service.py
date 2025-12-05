from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from chat.models import ChatSession, ChatMessage
from chat.services.llm import run_llm


class ChatService:
    """
    Handles the complete chat flow:
    1. Save user message to DB
    2. Call LLM for response
    3. Update session draft_json
    4. Save assistant message to DB
    5. Broadcast response via WebSocket
    """

    @staticmethod
    def process_message(session: ChatSession, user_text: str):
        """
        Main method to process a user message through the complete chat pipeline.
        
        Args:
            session (ChatSession): The chat session
            user_text (str): User's message content
            
        Returns:
            dict: LLM response with assistant_reply, updated_json, missing_fields
        """

        ChatMessage.objects.create(
            session=session,
            role="user",
            content=user_text
        )

        try:
            llm_result = run_llm(user_text, session.draft_json)
            
            assistant_reply = llm_result["assistant_reply"]
            updated_json = llm_result["updated_json"]
            missing_fields = llm_result.get("missing_fields", [])
            
        except Exception as e:
            assistant_reply = f"I'm sorry, I encountered an error: {str(e)}. Please try again."
            updated_json = session.draft_json
            missing_fields = []
            llm_result = {
                "assistant_reply": assistant_reply,
                "updated_json": updated_json,
                "missing_fields": missing_fields,
                "error": str(e)
            }

        # 3️⃣ Update session state with new draft JSON
        session.draft_json = updated_json
        session.save()

        # 4️⃣ Save assistant message to database
        ChatMessage.objects.create(
            session=session,
            role="assistant",
            content=assistant_reply
        )

        # 5️⃣ Broadcast message via WebSocket to connected clients
        ChatService._broadcast_message(session, assistant_reply, updated_json, missing_fields)

        return llm_result

    @staticmethod
    def _broadcast_message(session: ChatSession, assistant_reply: str, updated_json: dict, missing_fields: list):
        """
        Send message to WebSocket subscribers for real-time updates.
        
        Args:
            session (ChatSession): The chat session
            assistant_reply (str): Assistant's response text
            updated_json (dict): Updated RFP draft
            missing_fields (list): Fields that still need clarification
        """
        try:
            channel_layer = get_channel_layer()
            
            # Send to WebSocket group for this session
            async_to_sync(channel_layer.group_send)(
                f"chat_{session.id}",
                {
                    "type": "chat_message",
                    "message": {
                        "role": "assistant",
                        "content": assistant_reply,
                        "draft_json": updated_json,
                        "missing_fields": missing_fields,
                        "timestamp": str(session.messages.last().created_at)
                    }
                }
            )
        except Exception as e:
            # Log error but don't fail the main flow
            print(f"WebSocket broadcast error: {e}")

    @staticmethod
    def get_session_summary(session: ChatSession):
        """
        Get a summary of the chat session including messages and current draft.
        
        Args:
            session (ChatSession): The chat session
            
        Returns:
            dict: Session summary with messages and draft_json
        """
        messages = [
            {
                "role": m.role,
                "content": m.content,
                "timestamp": str(m.created_at)
            }
            for m in session.messages.all()
        ]

        return {
            "session_id": session.id,
            "title": session.title,
            "messages": messages,
            "draft_json": session.draft_json,
            "is_closed": session.is_closed,
            "is_submitted": session.is_submitted,
            "created_at": str(session.created_at)
        }
