from rest_framework import serializers
from .models import Vendor


class VendorCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    
    # Verification fields
    is_email_verified = serializers.BooleanField(default=False, required=False)
    is_phone_verified = serializers.BooleanField(default=False, required=False)
    is_business_verified = serializers.BooleanField(default=False, required=False)
    
    # Rating and performance fields
    overall_rating = serializers.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=3.00,
        required=False,
        min_value=1.00,
        max_value=5.00
    )
    total_orders_completed = serializers.IntegerField(default=0, required=False, min_value=0)
    on_time_delivery_rate = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=100.00,
        required=False,
        min_value=0.00,
        max_value=100.00
    )


class VendorUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    
    # Verification fields
    is_email_verified = serializers.BooleanField(required=False)
    is_phone_verified = serializers.BooleanField(required=False)
    is_business_verified = serializers.BooleanField(required=False)
    
    # Rating and performance fields
    overall_rating = serializers.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        required=False,
        min_value=1.00,
        max_value=5.00
    )
    total_orders_completed = serializers.IntegerField(required=False, min_value=0)
    on_time_delivery_rate = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        required=False,
        min_value=0.00,
        max_value=100.00
    )


class VendorResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"
