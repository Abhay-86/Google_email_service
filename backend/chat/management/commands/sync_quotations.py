from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from email.utils import parsedate_to_datetime
import time
from decimal import Decimal, InvalidOperation
from chat.models import SentEmail, VendorQuotation
from gmail_service.services.gmail import GmailService, GmailAccount
from gmail_service.models import EmailThread, EmailMessage
from chat.services.llm import extract_quotation_info

class Command(BaseCommand):
    help = 'Continuously sync vendor replies/quotations for sent emails'

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run once instead of continuous loop',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=300,  # 5 minutes
            help='Sync interval in seconds (default: 300)',
        )
        parser.add_argument(
            '--template-id',
            type=int,
            help='Sync only quotations for a specific template ID',
        )
        parser.add_argument(
            '--user-email',
            type=str,
            help='Sync only quotations for a specific user email',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting vendor quotation sync...')
        )

        if options['once']:
            self.sync_vendor_replies(options)
        else:
            # Continuous sync
            while True:
                try:
                    self.sync_vendor_replies(options)
                    time.sleep(options['interval'])
                except KeyboardInterrupt:
                    self.stdout.write(
                        self.style.WARNING('Sync stopped by user')
                    )
                    break
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error during sync: {e}')
                    )
                    time.sleep(60) 

    def sync_vendor_replies(self, options=None):
        """Sync replies for all sent emails that have thread_ids"""
        
        # Get all successfully sent emails with thread_ids that we haven't fully synced
        sent_emails = SentEmail.objects.filter(
            status='sent',
            thread_id__isnull=False
        ).exclude(thread_id='')
        
        # Filter by template if specified
        if options and options.get('template_id'):
            sent_emails = sent_emails.filter(template_id=options['template_id'])
            
        # Filter by user if specified
        if options and options.get('user_email'):
            try:
                gmail_account = GmailAccount.objects.get(email=options['user_email'])
                sent_emails = sent_emails.filter(sender=gmail_account)
            except GmailAccount.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Gmail account not found: {options["user_email"]}')
                )
                return

        self.stdout.write(f'Found {sent_emails.count()} sent emails to sync')

        for sent_email in sent_emails:
            try:
                self.sync_single_email_thread(sent_email)
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error syncing thread for {sent_email.vendor_name_at_time}: {e}'
                    )
                )

    def sync_single_email_thread(self, sent_email):
        """Sync a single email thread for replies"""
        
        gmail_account = sent_email.sender
        thread_id = sent_email.thread_id

        try:
            # Get thread messages from Gmail
            messages = GmailService.read_thread(gmail_account, thread_id)
            
            # Filter for inbound messages (replies from vendor)
            inbound_messages = [
                msg for msg in messages 
                if msg['direction'] == 'INBOUND'
            ]

            if not inbound_messages:
                return

            # Store the thread record
            thread, _ = EmailThread.objects.get_or_create(
                gmail_account=gmail_account,
                thread_id=thread_id,
                defaults={'recipient_email': sent_email.vendor_email_at_time}
            )

            new_quotations = 0

            for msg in inbound_messages:
                self.stdout.write(f'Processing inbound message: {msg.get("message_id", "unknown")}')
                
                # Create EmailMessage record first
                email_message, created = EmailMessage.objects.get_or_create(
                    message_id=msg['message_id'],
                    defaults={
                        'thread': thread,
                        'direction': msg['direction'],
                        'timestamp': timezone.now(),
                        'template_id': sent_email.template.id,
                    }
                )

                # Check if we already have a quotation for this email message
                existing_quotation = VendorQuotation.objects.filter(email_message=email_message).first()
                
                if existing_quotation:
                    # If quotation exists but is empty (no amount/currency), try to update it
                    if not existing_quotation.quoted_amount and not existing_quotation.currency:
                        # email_content = msg.get('body', '').strip() or msg.get('subject', '').strip()
                        email_content = msg.get('body', '').strip()
                        
                        if email_content:
                            self.stdout.write(
                                self.style.WARNING(
                                    f'Updating empty quotation {existing_quotation.id} with new content'
                                )
                            )
                            
                            # Parse quotation amount from email body using centralized LLM service
                            
                            quoted_amount, currency = extract_quotation_info(email_content)
                            
                            # Update the existing empty quotation
                            existing_quotation.subject = msg.get('subject', '')
                            existing_quotation.body = msg.get('body', '')
                            existing_quotation.quoted_amount = quoted_amount
                            existing_quotation.currency = currency
                            existing_quotation.save()
                            
                            # Log LLM extraction results
                            if quoted_amount and currency:
                                self.stdout.write(
                                    self.style.SUCCESS(
                                        f'Updated quotation {existing_quotation.id}: {quoted_amount} {currency}'
                                    )
                                )
                                new_quotations += 1
                            else:
                                self.stdout.write(
                                    self.style.WARNING(
                                        f'LLM found no quotation in updated message'
                                    )
                                )
                        else:
                            self.stdout.write(
                                self.style.WARNING(
                                    f'Quotation {existing_quotation.id} still has no content to process'
                                )
                            )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Quotation already exists and has data: {existing_quotation.quoted_amount} {existing_quotation.currency}'
                            )
                        )
                    continue

                # Parse timestamp
                try:
                    if isinstance(msg["timestamp"], str):
                        timestamp_obj = parse_datetime(msg["timestamp"])
                        if timestamp_obj is None:
                            timestamp_obj = parsedate_to_datetime(msg["timestamp"])
                    else:
                        timestamp_obj = msg["timestamp"]
                    
                    if timestamp_obj.tzinfo is None:
                        timestamp_obj = timezone.make_aware(timestamp_obj)
                except Exception:
                    timestamp_obj = timezone.now()

                # Update the EmailMessage timestamp if it was just created
                if created:
                    email_message.timestamp = timestamp_obj
                    email_message.save()

                # Check if there's actual email content to process
                email_content = msg.get('body', '').strip() or msg.get('subject', '').strip()
                
                if not email_content:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping message {msg.get("message_id", "unknown")} - no content to process'
                        )
                    )
                    continue

                # Parse quotation amount from email body using centralized LLM service
                
                quoted_amount, currency = extract_quotation_info(email_content)
                
                # Log LLM extraction results
                if quoted_amount and currency:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'LLM extracted: {quoted_amount} {currency} from message {msg.get("message_id", "unknown")}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'LLM found no quotation in message {msg.get("message_id", "unknown")}'
                        )
                    )

                # Create VendorQuotation record
                VendorQuotation.objects.create(
                    sent_email=sent_email,
                    email_message=email_message,
                    subject=msg.get('subject', ''),
                    body=msg.get('body', ''),
                    quoted_amount=quoted_amount,
                    currency=currency,
                )

                new_quotations += 1

            if new_quotations > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Added {new_quotations} new quotation(s) from {sent_email.vendor_name_at_time}'
                    )
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Failed to sync thread {thread_id}: {e}'
                )
            )
