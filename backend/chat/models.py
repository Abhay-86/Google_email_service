from django.db import models
from gmail_service.models import GmailAccount
from vendors.models import Vendor

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


class SentEmail(models.Model):
    """
    Track emails sent to vendors using templates.
    Prevents duplicate sends and provides email history.
    """
    template = models.ForeignKey(EmailTemplate, related_name="sent_emails", on_delete=models.CASCADE)
    vendor = models.ForeignKey(Vendor, related_name="received_emails", on_delete=models.CASCADE)
    sender = models.ForeignKey(GmailAccount, related_name="sent_emails", on_delete=models.CASCADE)
    vendor_email_at_time = models.EmailField(help_text="Vendor's email when email was sent")
    vendor_name_at_time = models.CharField(max_length=255, help_text="Vendor's name when email was sent")
    vendor_company_at_time = models.CharField(max_length=255, null=True, blank=True, help_text="Vendor's company when email was sent")
    message_id = models.CharField(max_length=255, null=True, blank=True)
    thread_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20, 
        choices=[
            ('sent', 'Sent Successfully'),
            ('failed', 'Failed to Send'),
            ('pending', 'Pending Send')
        ],
        default='pending'
    )
    error_message = models.TextField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('template', 'vendor')
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"Email: {self.template.subject[:30]} -> {self.vendor_name_at_time} ({self.status})"


class VendorQuotation(models.Model):
    """
    Store vendor replies/quotations received for sent emails.
    Links to EmailMessage (INBOUND) and SentEmail to track quotations.
    """
    sent_email = models.ForeignKey(SentEmail, related_name="quotations", on_delete=models.CASCADE)
    email_message = models.OneToOneField(
        'gmail_service.EmailMessage', 
        related_name="quotation", 
        on_delete=models.CASCADE,
        help_text="Link to the INBOUND EmailMessage record"
    )
    subject = models.CharField(max_length=500, blank=True)
    body = models.TextField(blank=True)
    quoted_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, help_text="Extracted quotation amount")
    currency = models.CharField(max_length=10, null=True, blank=True, help_text="Currency code (USD, EUR, etc.)")
    is_reviewed = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True, help_text="Admin notes about this quotation")
    parsed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-email_message__timestamp']
        
    def __str__(self):
        return f"Quotation from {self.sent_email.vendor_name_at_time} - {self.subject}"
    
    @property
    def received_at(self):
        return self.email_message.timestamp
