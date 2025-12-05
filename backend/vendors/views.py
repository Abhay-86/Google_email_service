from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from .models import Vendor
from .serializers import (
    VendorCreateSerializer,
    VendorUpdateSerializer,
    VendorResponseSerializer,
)


class VendorListCreateView(APIView):

    @extend_schema(
        description="List all vendors",
        responses={200: VendorResponseSerializer(many=True)}
    )
    def get(self, request):
        vendors = Vendor.objects.all()
        serializer = VendorResponseSerializer(vendors, many=True)
        return Response(serializer.data)

    @extend_schema(
        description="Create a new vendor",
        request=VendorCreateSerializer,
        responses={201: VendorResponseSerializer}
    )
    def post(self, request):
        serializer = VendorCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vendor = Vendor.objects.create(**serializer.validated_data)
        return Response(VendorResponseSerializer(vendor).data, status=201)

class VendorDetailView(APIView):

    @extend_schema(
        description="Get vendor by ID",
        responses={200: VendorResponseSerializer}
    )
    def get(self, request, pk):
        try:
            vendor = Vendor.objects.get(pk=pk)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)

        return Response(VendorResponseSerializer(vendor).data)

    @extend_schema(
        description="Update vendor",
        request=VendorUpdateSerializer,
        responses={200: VendorResponseSerializer}
    )
    def put(self, request, pk):
        try:
            vendor = Vendor.objects.get(pk=pk)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)

        serializer = VendorUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(vendor, field, value)

        vendor.save()
        return Response(VendorResponseSerializer(vendor).data)

    @extend_schema(
        description="Delete vendor",
        responses={204: None}
    )
    def delete(self, request, pk):
        try:
            vendor = Vendor.objects.get(pk=pk)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=404)

        vendor.delete()
        return Response(status=204)
