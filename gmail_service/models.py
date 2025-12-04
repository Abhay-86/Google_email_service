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
