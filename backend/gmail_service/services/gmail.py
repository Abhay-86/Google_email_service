# gmail_service/services/gmail_service.py

from email.utils import parsedate_to_datetime
import requests
from urllib.parse import urlencode
from django.conf import settings
from datetime import timedelta
from django.utils import timezone
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import mimetypes
import base64

from gmail_service.models import GmailAccount


class GmailService:

    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.readonly",
    ]

    @classmethod
    def generate_auth_url(cls, email: str, redirect_uri: str) -> str:
        """
        Step 1: User enters Gmail → return Google OAuth URL
        """

        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(cls.SCOPES),
            "access_type": "offline",     # <-- IMPORTANT for refresh token
            "prompt": "consent",          # <-- ALWAYS show consent to get refresh token
            "state": email,               # <-- We pass email to callback
        }

        return f"{cls.GOOGLE_AUTH_URL}?{urlencode(params)}"

    @classmethod
    def exchange_code_for_token(cls, email: str, code: str, redirect_uri: str) -> dict:
        """
        Step 2: Exchange the Google OAuth `code` for tokens.
        We already know the user's Gmail address (stored in `state`).
        """

        payload = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        res = requests.post(cls.GOOGLE_TOKEN_URL, data=payload)
        res.raise_for_status()

        token_data = res.json()

        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data["expires_in"]

        # Save or update
        gmail_account, _ = GmailAccount.objects.update_or_create(
            email=email,
            defaults={
                "refresh_token": refresh_token,
                "access_token": access_token,
                "token_expires_at": timezone.now() + timedelta(seconds=expires_in),
            }
        )

        return {
            "email": email,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    @classmethod
    def refresh_access_token(cls, gmail_account: GmailAccount):
        """
        Google access tokens only last 1 hour — refresh using refresh_token.
        """

        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": gmail_account.refresh_token,
            "grant_type": "refresh_token",
        }

        res = requests.post(cls.GOOGLE_TOKEN_URL, data=data)
        res.raise_for_status()

        token_data = res.json()
        gmail_account.access_token = token_data["access_token"]
        gmail_account.token_expires_at = timezone.now() + timedelta(seconds=token_data["expires_in"])
        gmail_account.save()

    @classmethod
    def get_credentials(cls, gmail_account: GmailAccount):
        """
        Returns Google Credential object for Gmail API calls.
        """

        # Refresh token if expired
        if gmail_account.token_expires_at < timezone.now():
            cls.refresh_access_token(gmail_account)

        return Credentials(
            token=gmail_account.access_token,
            refresh_token=gmail_account.refresh_token,
            token_uri=cls.GOOGLE_TOKEN_URL,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=cls.SCOPES,
        )
    @classmethod
    def send_email(cls, gmail_account, to_email, subject, body, attachments=None):
        """
        Sends email using Gmail API on behalf of connected Gmail account.
        Supports multiple attachments.
        """

        creds = cls.get_credentials(gmail_account)
        service = build("gmail", "v1", credentials=creds)

        # Create multipart message
        message = MIMEMultipart()
        message["to"] = to_email
        message["From"] = gmail_account.email 
        message["subject"] = subject
        message["Content-Type"] = "multipart/mixed"

        # Attach email body
        message.attach(MIMEText(body, "plain"))

        # Attach files if provided
        if attachments:
            for file_obj in attachments:
                filename = file_obj.name
                file_data = file_obj.read()
                file_obj.seek(0)

                ctype, encoding = mimetypes.guess_type(filename)
                if ctype is None:
                    ctype = "application/octet-stream"

                maintype, subtype = ctype.split("/", 1)

                mime_part = MIMEBase(maintype, subtype)
                mime_part.set_payload(file_data)
                encoders.encode_base64(mime_part)

                mime_part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{filename}"'
                )

                message.attach(mime_part)

        # Encode message to base64
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        # Send using Gmail API
        sent_msg = service.users().messages().send(
            userId="me",
            body={"raw": raw_message}
        ).execute()

        return {
            "message_id": sent_msg["id"],
            "thread_id": sent_msg["threadId"],
        }

    @classmethod
    def read_thread(cls, gmail_account, thread_id):
        creds = cls.get_credentials(gmail_account)
        service = build("gmail", "v1", credentials=creds)

        thread = service.users().threads().get(
            userId="me",
            id=thread_id,
            format="full"
        ).execute()

        messages = []

        for msg in thread.get("messages", []):
            payload = msg.get("payload", {})
            headers = {h["name"]: h["value"] for h in payload.get("headers", [])}
            
            from_email = headers.get("From", "")
            subject = headers.get("Subject", "")
            direction = "OUTBOUND" if gmail_account.email in from_email else "INBOUND"

            # Extract email body
            body = ""
            def extract_body(payload):
                """Recursively extract text body from email payload"""
                if payload.get("mimeType") == "text/plain":
                    data = payload.get("body", {}).get("data", "")
                    if data:
                        import base64
                        return base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                elif payload.get("mimeType") == "text/html":
                    data = payload.get("body", {}).get("data", "")
                    if data:
                        import base64
                        html_content = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                        # Simple HTML to text conversion (remove HTML tags)
                        import re
                        return re.sub('<[^<]+?>', '', html_content)
                elif "parts" in payload:
                    for part in payload["parts"]:
                        text = extract_body(part)
                        if text:
                            return text
                return ""

            body = extract_body(payload)

            date_header = headers.get("Date")

            if date_header:
                try:
                    timestamp = parsedate_to_datetime(date_header)
                    if timestamp.tzinfo is None:
                        timestamp = timezone.make_aware(timestamp)
                except Exception:
                    timestamp = timezone.datetime.fromtimestamp(
                        int(msg["internalDate"]) / 1000, tz=timezone.utc
                    )
            else:
                timestamp = timezone.datetime.fromtimestamp(
                    int(msg["internalDate"]) / 1000, tz=timezone.utc
                )

            messages.append({
                "message_id": msg["id"],
                "from": from_email,
                "subject": subject,
                "body": body,
                "snippet": msg.get("snippet"),
                "timestamp": timestamp.isoformat(),
                "direction": direction,
            })

        return messages
