from decimal import Decimal, InvalidOperation
from django.utils import timezone

from chat.models import SentEmail, VendorQuotation
from gmail_service.models import EmailMessage, EmailThread
from gmail_service.services.gmail import GmailService
from gmail_service.views import SyncSingleThreadView
from django.http import HttpRequest
from rest_framework.request import Request
from chat.services.llm import extract_quotation_info


class QuotationService:
    """
    Service to process inbound EmailMessage records and create VendorQuotation records
    """
    
    @staticmethod
    def process_inbound_messages_for_template(template_id, gmail_account):
        """
        Process all inbound messages for a specific template and create quotations
        """
        # Get all sent emails for this template
        sent_emails = SentEmail.objects.filter(
            template_id=template_id,
            sender=gmail_account,
            status='sent',
            thread_id__isnull=False
        ).exclude(thread_id='')
        
        new_quotations = 0
        
        for sent_email in sent_emails:
            new_quotations += QuotationService.process_sent_email_replies(sent_email)
        
        return new_quotations
    
    @staticmethod
    def process_sent_email_replies(sent_email):
        """
        Process inbound messages for a single sent email and create quotations
        """
        if not sent_email.thread_id:
            return 0
            
        try:
            # Find the thread
            thread = EmailThread.objects.get(
                gmail_account=sent_email.sender,
                thread_id=sent_email.thread_id
            )
            
            # Get inbound messages for this thread that match our template
            inbound_messages = EmailMessage.objects.filter(
                thread=thread,
                direction='INBOUND',
                template_id=sent_email.template.id
            ).exclude(
                # Exclude messages that already have quotations
                id__in=VendorQuotation.objects.values_list('email_message_id', flat=True)
            )
            
            new_quotations = 0
            
            for message in inbound_messages:
                # Get message content from Gmail if not stored locally
                subject, body = QuotationService.get_message_content(
                    sent_email.sender, 
                    message.message_id
                )
                
                # Extract quotation info using LLM service
                
                quoted_amount, currency = extract_quotation_info(f"{subject} {body}")
                
                # Create quotation record
                VendorQuotation.objects.create(
                    sent_email=sent_email,
                    email_message=message,
                    subject=subject,
                    body=body,
                    quoted_amount=quoted_amount,
                    currency=currency
                )
                
                new_quotations += 1
            
            return new_quotations
            
        except EmailThread.DoesNotExist:
            return 0
        except Exception as e:
            print(f"Error processing replies for sent email {sent_email.id}: {e}")
            return 0
    
    @staticmethod
    def get_message_content(gmail_account, message_id):
        """
        Get subject and body for a specific message from Gmail
        """
        try:
            # Use existing Gmail service to get message details
            # This would need to be implemented in GmailService if not already available
            # For now, return empty strings
            return "", ""
        except Exception:
            return "", ""
    
    @staticmethod
    def sync_thread_for_sent_email(sent_email):
        """
        Trigger sync for a specific sent email's thread using existing sync endpoint
        """
        try:
            # This would call the existing SyncSingleThreadView internally
            
            
            # Create a mock request to call the existing sync view
            request = HttpRequest()
            request.method = 'POST'
            request.data = {
                'email': sent_email.sender.email,
                'thread_id': sent_email.thread_id
            }
            
            view = SyncSingleThreadView()
            response = view.post(Request(request))
            
            return response.status_code == 200
        except Exception as e:
            print(f"Error syncing thread: {e}")
            return False
