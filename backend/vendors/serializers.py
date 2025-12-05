from rest_framework import serializers
from .models import Vendor


class VendorCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=255, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)


class VendorUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=20, required=False)
    company = serializers.CharField(max_length=255, required=False)
    address = serializers.CharField(required=False)


class VendorResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"
