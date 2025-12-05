from django.urls import path
from .views import VendorListCreateView, VendorDetailView

urlpatterns = [
    path("", VendorListCreateView.as_view(), name="vendor-list-create"),
    path("<int:pk>/", VendorDetailView.as_view(), name="vendor-detail"),
]
