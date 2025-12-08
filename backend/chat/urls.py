from django.urls import path
from .views import (
    ChatView, 
    EmailTemplateView, 
    VendorSelectionView, 
    SendTemplateEmailView, 
    UserTemplatesView,
    VendorQuotationsView,
    SyncQuotationsView,
    CalculateVendorScoresView
)

urlpatterns = [
    path("", ChatView.as_view(), name="chat-api"),
    path("email-template/", EmailTemplateView.as_view(), name="email-template"),
    path("vendors/", VendorSelectionView.as_view(), name="vendor-selection"),
    path("send-email/", SendTemplateEmailView.as_view(), name="send-template-email"),
    path("user-templates/", UserTemplatesView.as_view(), name="user-templates"),
    path("quotations/", VendorQuotationsView.as_view(), name="vendor-quotations"),
    path("sync-quotations/", SyncQuotationsView.as_view(), name="sync-quotations"),
    path("calculate-scores/", CalculateVendorScoresView.as_view(), name="calculate-vendor-scores"),
]