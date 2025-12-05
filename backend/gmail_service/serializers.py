from rest_framework import serializers


class GmailConnectSerializer(serializers.Serializer):
    """User enters their Gmail to start OAuth"""
    email = serializers.EmailField()


class GmailCallbackSerializer(serializers.Serializer):
    """Callback response after OAuth redirect"""
    success = serializers.BooleanField()
    email = serializers.EmailField()


class SendEmailSerializer(serializers.Serializer):
    """Payload for sending an email"""
    from_email = serializers.EmailField()
    to_email = serializers.EmailField()
    subject = serializers.CharField()
    body = serializers.CharField()
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False
    )
    class Meta:
        swagger_schema_fields = {
            "type": "object",
            "properties": {
                "from_email": {"type": "string", "format": "email"},
                "to_email": {"type": "string", "format": "email"},
                "subject": {"type": "string"},
                "body": {"type": "string"},
                "attachments": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "format": "binary"
                    }
                }
            },
            "required": ["from_email", "to_email", "subject", "body"]
        }



class ReadThreadQuerySerializer(serializers.Serializer):
    """Query parameters for thread reading"""
    email = serializers.EmailField()
    thread_id = serializers.CharField()


class SyncSingleThreadSerializer(serializers.Serializer):
    """Payload for syncing a single thread"""
    email = serializers.EmailField()
    thread_id = serializers.CharField()