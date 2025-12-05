from django.urls import path
from gmail_service.views import (
    GmailConnectView,
    GmailCallbackView,
    SendEmailView,
    ReadThreadView,
    SyncSingleThreadView,
)

urlpatterns = [
    path("connect/", GmailConnectView.as_view(), name="gmail-connect"),
    path("callback/", GmailCallbackView.as_view(), name="gmail-callback"),
    path("send/", SendEmailView.as_view(), name="gmail-send"),
    path("thread/", ReadThreadView.as_view(), name="gmail-thread"),
    path("sync-thread/", SyncSingleThreadView.as_view(), name="gmail-sync-thread"),
]