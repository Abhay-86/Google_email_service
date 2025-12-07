from django.db import models
from gmail_service.models import GmailAccount

class ChatSession(models.Model):
    """
    One chat conversation between a Gmail user and the AI.
    Works like a ChatGPT session (history + draft JSON).
    """
    gmail_account = models.ForeignKey(GmailAccount, related_name="chat_sessions", on_delete=models.CASCADE)

    title = models.CharField(max_length=255, default="New Chat") 
    draft_json = models.JSONField(default=dict)

    is_closed = models.BooleanField(default=False)   
    is_submitted = models.BooleanField(default=False)   

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatSession {self.id} ({self.gmail_account.email})"


class ChatMessage(models.Model):
    """
    Each message in a chat session.
    Stores user + AI messages in order (like ChatGPT message bubbles).
    """
    session = models.ForeignKey(ChatSession, related_name="messages", on_delete=models.CASCADE)

    role = models.CharField(max_length=10, choices=[("user", "user"), ("assistant", "assistant")])
    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"] 

    def __str__(self):
        return f"{self.role}: {self.content[:40]}"


class EmailTemplate(models.Model):
    """
    Generated email template and subject for a chat session.
    Created when user submits a chat session for email generation.
    """
    session = models.OneToOneField(ChatSession, related_name="email_template", on_delete=models.CASCADE)
    
    subject = models.CharField(max_length=500)
    template_body = models.TextField()
    
    # Track generation metadata
    generated_at = models.DateTimeField(auto_now_add=True)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Email Template for Session {self.session.id}: {self.subject[:50]}"
