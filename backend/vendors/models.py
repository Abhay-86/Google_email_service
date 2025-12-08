from django.db import models

# Create your models here.

class Vendor(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    company = models.CharField(max_length=255, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    
    # Verification fields
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    is_business_verified = models.BooleanField(default=False)
    
    # Rating and performance fields
    overall_rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=3.00,
        help_text="Vendor rating from 1.00 to 5.00"
    )
    total_orders_completed = models.IntegerField(default=0)
    on_time_delivery_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=100.00,
        help_text="Percentage of orders delivered on time (0-100)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.email}"
