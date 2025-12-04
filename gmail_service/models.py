from django.db import models
from django.utils import timezone

class GmailAccount(models.Model):
    """
    Stores Gmail OAuth tokens for each email account.
    """
    email = models.EmailField(unique=True)

    # Tokens
    refresh_token = models.TextField(null=True, blank=True)
    access_token = models.TextField(null=True, blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)

    # Debug or tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def has_valid_access_token(self):
        return self.access_token and self.token_expires_at and timezone.now() < self.token_expires_at

    def __str__(self):
        return self.email

class EmailThread(models.Model):
    gmail_account = models.ForeignKey(GmailAccount, on_delete=models.CASCADE)
    thread_id = models.CharField(max_length=255)
    recipient_email = models.EmailField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ("gmail_account", "thread_id")

    def __str__(self):
        return self.thread_id
class EmailMessage(models.Model):
    DIRECTION = (
        ("OUTBOUND", "Sent by sender"),
        ("INBOUND", "Received from recipient"),
    )
    thread = models.ForeignKey(EmailThread, on_delete=models.CASCADE)
    message_id = models.CharField(max_length=255, unique=True)
    direction = models.CharField(max_length=20, choices=DIRECTION)
    template_id = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.direction} - {self.message_id}"
