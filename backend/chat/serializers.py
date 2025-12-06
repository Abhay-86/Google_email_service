from rest_framework import serializers


class ChatRequestSerializer(serializers.Serializer):
    """
    Main serializer for all chat actions. The action field determines which operation to perform.
    """
    action = serializers.ChoiceField(
        choices=['start', 'message', 'history', 'submit', 'confirm', 'list'],
        help_text="The action to perform: 'start' to begin a new chat, 'message' to send a message, 'history' to get chat history, 'submit' to finalize the chat, 'confirm' to confirm email template, 'list' to get all sessions"
    )
    email = serializers.EmailField(
        required=False,
        help_text="Required for 'start' action. Email address of the Gmail account to start chat with."
    )
    session_id = serializers.IntegerField(
        required=False,
        help_text="Required for 'message', 'history', and 'submit' actions. The ID of the chat session."
    )
    message = serializers.CharField(
        required=False,
        help_text="Required for 'message' action. The user's message content."
    )
    subject = serializers.CharField(
        required=False,
        help_text="Required for 'confirm' action. Email subject."
    )
    body = serializers.CharField(
        required=False,
        help_text="Required for 'confirm' action. Email body content."
    )

    def validate(self, attrs):
        action = attrs.get('action')
        
        if action == 'start' or action == 'list':
            if not attrs.get('email'):
                raise serializers.ValidationError("'email' field is required for start and list actions")
        
        elif action in ['message', 'history', 'submit']:
            if not attrs.get('session_id'):
                raise serializers.ValidationError("'session_id' field is required for this action")
            
            if action == 'message' and not attrs.get('message'):
                raise serializers.ValidationError("'message' field is required for message action")
        
        elif action == 'confirm':
            if not attrs.get('session_id'):
                raise serializers.ValidationError("'session_id' field is required for confirm action")
            if not attrs.get('subject'):
                raise serializers.ValidationError("'subject' field is required for confirm action")
            if not attrs.get('body'):
                raise serializers.ValidationError("'body' field is required for confirm action")
        
        return attrs


class StartChatSerializer(serializers.Serializer):
    """Serializer for starting a new chat session"""
    email = serializers.EmailField(
        help_text="Email address of the connected Gmail account"
    )


class ChatMessageSerializer(serializers.Serializer):
    """Serializer for sending a message in a chat session"""
    session_id = serializers.IntegerField(
        help_text="The ID of the chat session"
    )
    message = serializers.CharField(
        help_text="The user's message content"
    )


class ChatHistorySerializer(serializers.Serializer):
    """Serializer for retrieving chat history"""
    session_id = serializers.IntegerField(
        help_text="The ID of the chat session to get history for"
    )


class SubmitChatSerializer(serializers.Serializer):
    """Serializer for submitting and closing a chat session"""
    session_id = serializers.IntegerField(
        help_text="The ID of the chat session to submit"
    )


# Response Serializers for documentation
class ChatStartResponseSerializer(serializers.Serializer):
    """Response when starting a new chat"""
    session_id = serializers.IntegerField()
    title = serializers.CharField()
    message = serializers.CharField()


class ChatMessageResponseSerializer(serializers.Serializer):
    """Response when sending a message"""
    assistant_reply = serializers.CharField()
    draft_json = serializers.JSONField()
    missing_fields = serializers.ListField(child=serializers.CharField())
    provider = serializers.CharField()


class ChatHistoryResponseSerializer(serializers.Serializer):
    """Response when getting chat history"""
    session_id = serializers.IntegerField()
    title = serializers.CharField()
    messages = serializers.ListField()
    draft_json = serializers.JSONField()
    is_closed = serializers.BooleanField()
    is_submitted = serializers.BooleanField()
    created_at = serializers.CharField()


class ChatSubmitResponseSerializer(serializers.Serializer):
    """Response when submitting a chat"""
    status = serializers.CharField()
    message = serializers.CharField()


class EmailTemplateGenerationSerializer(serializers.Serializer):
    """Serializer for generating email template"""
    session_id = serializers.IntegerField(
        help_text="Chat session ID to generate template for"
    )
    email = serializers.EmailField(
        help_text="Gmail account email"
    )


class VendorSerializer(serializers.Serializer):
    """Serializer for vendor information"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    company = serializers.CharField()
    phone = serializers.CharField()


class VendorSelectionResponseSerializer(serializers.Serializer):
    """Response for vendor selection"""
    vendors = VendorSerializer(many=True)
    total = serializers.IntegerField()


class SendTemplateEmailSerializer(serializers.Serializer):
    """Serializer for sending template emails to vendors"""
    template_id = serializers.IntegerField(
        help_text="ID of the email template to send"
    )
    vendor_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of vendor IDs to send emails to"
    )
    sender_email = serializers.EmailField(
        help_text="Email address of the sender (Gmail account)"
    )


class EmailResultSerializer(serializers.Serializer):
    """Serializer for individual email send result"""
    vendor = serializers.CharField()
    email = serializers.EmailField()
    message_id = serializers.CharField(required=False)
    thread_id = serializers.CharField(required=False)
    error = serializers.CharField(required=False)


class SendTemplateEmailResponseSerializer(serializers.Serializer):
    """Response for sending template emails"""
    status = serializers.CharField()
    sent_emails = EmailResultSerializer(many=True)
    failed_emails = EmailResultSerializer(many=True)
    total_sent = serializers.IntegerField()
    total_failed = serializers.IntegerField()
