from decimal import Decimal
from datetime import datetime
from django.utils import timezone
from chat.models import VendorScore, SentEmail, VendorQuotation
from vendors.models import Vendor


class ScoringService:
    """
    Service to calculate vendor scores based on price and quality metrics.
    Final Score = (Price Score × 50%) + (Vendor Quality Score × 50%)
    """
    
    # Component weights for vendor quality (totals to 1.0)
    VERIFICATION_WEIGHT = 0.286  # 20/70
    RATING_WEIGHT = 0.357        # 25/70
    DELIVERY_WEIGHT = 0.143      # 10/70
    WARRANTY_WEIGHT = 0.143      # 10/70
    RESPONSE_WEIGHT = 0.071      # 5/70
    
    @staticmethod
    def calculate_price_score(quoted_price, budget):
        """
        Calculate price score based on quoted price vs budget.
        Lower price = higher score, but over-budget gets penalty.
        
        Args:
            quoted_price (Decimal): Vendor's quoted price in USD
            budget (Decimal): RFP budget in USD
            
        Returns:
            Decimal: Price score (0-100)
        """
        if not quoted_price or not budget or budget <= 0:
            return Decimal('0.00')
        
        quoted_price = Decimal(str(quoted_price))
        budget = Decimal(str(budget))
        
        if quoted_price <= budget:
            # Within budget: higher score for lower price
            score = ((budget - quoted_price) / budget) * 100
        else:
            # Over budget: penalty
            score = max(0, 50 - ((quoted_price - budget) / budget) * 100)
        
        return Decimal(str(round(score, 2)))
    
    @staticmethod
    def calculate_verification_score(vendor):
        """
        Calculate verification score based on vendor verifications.
        
        Args:
            vendor (Vendor): Vendor instance
            
        Returns:
            Decimal: Verification score (0-100)
        """
        score = Decimal('0.00')
        
        if vendor.is_email_verified:
            score += Decimal('33.33')
        if vendor.is_phone_verified:
            score += Decimal('33.33')
        if vendor.is_business_verified:
            score += Decimal('33.34')
        
        return score
    
    @staticmethod
    def calculate_rating_score(vendor):
        """
        Calculate rating score from vendor's overall rating.
        
        Args:
            vendor (Vendor): Vendor instance
            
        Returns:
            Decimal: Rating score (0-100)
        """
        # Convert 1-5 rating to 0-100 scale
        rating = Decimal(str(vendor.overall_rating))
        score = (rating / Decimal('5.00')) * 100
        return Decimal(str(round(score, 2)))
    
    @staticmethod
    def calculate_delivery_score(vendor):
        """
        Calculate delivery score from on-time delivery rate.
        
        Args:
            vendor (Vendor): Vendor instance
            
        Returns:
            Decimal: Delivery score (0-100)
        """
        return Decimal(str(vendor.on_time_delivery_rate))
    
    @staticmethod
    def calculate_warranty_score(warranty_years):
        """
        Calculate warranty score based on warranty period offered.
        
        Args:
            warranty_years (float): Warranty period in years
            
        Returns:
            Decimal: Warranty score (0-100)
        """
        if not warranty_years:
            return Decimal('50.00')  # Default if not specified
        
        warranty_years = float(warranty_years)
        
        if warranty_years >= 3:
            score = 100
        elif warranty_years >= 2:
            score = 75
        elif warranty_years >= 1:
            score = 50
        else:
            score = 25
        
        return Decimal(str(score))
    
    @staticmethod
    def calculate_response_score(sent_at, received_at):
        """
        Calculate response score based on how quickly vendor responded.
        
        Args:
            sent_at (datetime): When RFP email was sent
            received_at (datetime): When vendor responded
            
        Returns:
            Decimal: Response score (0-100)
        """
        if not sent_at or not received_at:
            return Decimal('50.00')  # Default if timestamps missing
        
        # Calculate response time in hours
        time_diff = received_at - sent_at
        response_hours = time_diff.total_seconds() / 3600
        
        if response_hours <= 24:
            score = 100
        elif response_hours <= 48:
            score = 80
        elif response_hours <= 72:
            score = 60
        else:
            score = max(40, 100 - (response_hours / 24) * 5)
        
        return Decimal(str(round(score, 2)))
    
    @staticmethod
    def calculate_vendor_quality_score(verification, rating, delivery, warranty, response):
        """
        Calculate combined vendor quality score from component scores.
        
        Args:
            verification, rating, delivery, warranty, response (Decimal): Component scores
            
        Returns:
            Decimal: Vendor quality score (0-100)
        """
        quality_score = (
            verification * Decimal(str(ScoringService.VERIFICATION_WEIGHT)) +
            rating * Decimal(str(ScoringService.RATING_WEIGHT)) +
            delivery * Decimal(str(ScoringService.DELIVERY_WEIGHT)) +
            warranty * Decimal(str(ScoringService.WARRANTY_WEIGHT)) +
            response * Decimal(str(ScoringService.RESPONSE_WEIGHT))
        )
        
        return Decimal(str(round(quality_score, 2)))
    
    @staticmethod
    def calculate_final_score(price_score, vendor_quality_score):
        """
        Calculate final score: 50% price + 50% quality.
        
        Args:
            price_score (Decimal): Price component score
            vendor_quality_score (Decimal): Quality component score
            
        Returns:
            Decimal: Final score (0-100)
        """
        final = (price_score * Decimal('0.50')) + (vendor_quality_score * Decimal('0.50'))
        return Decimal(str(round(final, 2)))
    
    @classmethod
    def calculate_score_for_vendor(cls, sent_email, budget, warranty_years=None):
        """
        Calculate all scores for a vendor for a specific RFP.
        
        Args:
            sent_email (SentEmail): The sent email record
            budget (Decimal): RFP budget
            warranty_years (float, optional): Warranty period offered
            
        Returns:
            dict: All calculated scores
        """
        vendor = sent_email.vendor
        
        # Get quotation if exists
        quotation = VendorQuotation.objects.filter(sent_email=sent_email).first()
        quoted_price = quotation.quoted_amount if quotation else None
        
        # Calculate component scores
        price_score = cls.calculate_price_score(quoted_price, budget)
        verification_score = cls.calculate_verification_score(vendor)
        rating_score = cls.calculate_rating_score(vendor)
        delivery_score = cls.calculate_delivery_score(vendor)
        warranty_score = cls.calculate_warranty_score(warranty_years)
        
        # Calculate response score
        received_at = quotation.received_at if quotation else None
        response_score = cls.calculate_response_score(sent_email.sent_at, received_at)
        
        # Calculate combined scores
        vendor_quality_score = cls.calculate_vendor_quality_score(
            verification_score,
            rating_score,
            delivery_score,
            warranty_score,
            response_score
        )
        
        final_score = cls.calculate_final_score(price_score, vendor_quality_score)
        
        return {
            'price_score': price_score,
            'verification_score': verification_score,
            'rating_score': rating_score,
            'delivery_score': delivery_score,
            'warranty_score': warranty_score,
            'response_score': response_score,
            'vendor_quality_score': vendor_quality_score,
            'final_score': final_score
        }
    
    @classmethod
    def calculate_scores_for_template(cls, template, budget):
        """
        Calculate scores for all vendors who received and responded to an RFP template.
        
        Args:
            template (EmailTemplate): The email template/RFP
            budget (Decimal): RFP budget
            
        Returns:
            list: Created/updated VendorScore instances
        """
        # Get all sent emails with quotations for this template
        sent_emails = SentEmail.objects.filter(
            template=template,
            status='sent'
        ).select_related('vendor')
        
        vendor_scores = []
        
        for sent_email in sent_emails:
            # Calculate scores
            scores = cls.calculate_score_for_vendor(sent_email, budget)
            
            # Create or update VendorScore
            vendor_score, created = VendorScore.objects.update_or_create(
                sent_email=sent_email,
                defaults=scores
            )
            
            vendor_scores.append(vendor_score)
        
        # Rank vendors by final score
        vendor_scores.sort(key=lambda x: x.final_score, reverse=True)
        for rank, score in enumerate(vendor_scores, start=1):
            score.rank = rank
            score.save()
        
        return vendor_scores
