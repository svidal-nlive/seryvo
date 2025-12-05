"""
Seryvo Platform - Stripe Payment Service
Handles payment processing via Stripe in TEST MODE (free)

Configuration:
- Test mode: No real charges, free to use
- Test cards: 4242424242424242 (Visa), 5555555555554444 (Mastercard)
- Test CVC: Any 3 digits
- Test Expiry: Any future date
"""
import os
from typing import Optional, Dict, Any
from datetime import datetime

import stripe
from stripe.error import StripeError

from app.core.config import settings


# Initialize Stripe with test key
stripe.api_key = settings.stripe_secret_key


class StripeService:
    """Stripe payment processing service for Seryvo."""
    
    # Test card numbers for development
    TEST_CARDS = {
        "visa": "4242424242424242",
        "visa_debit": "4000056655665556",
        "mastercard": "5555555555554444",
        "amex": "378282246310005",
        "discover": "6011111111111117",
        "declined": "4000000000000002",
        "insufficient_funds": "4000000000009995",
    }
    
    @staticmethod
    def is_test_mode() -> bool:
        """Check if Stripe is in test mode."""
        return settings.stripe_secret_key.startswith("sk_test_")
    
    @staticmethod
    async def create_customer(
        email: str,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Create a Stripe customer.
        Returns the Stripe customer ID.
        """
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                phone=phone,
                metadata=metadata or {}
            )
            return customer.id
        except StripeError as e:
            print(f"[Stripe] Error creating customer: {e}")
            return None
    
    @staticmethod
    async def create_payment_intent(
        amount: int,  # Amount in cents (e.g., $10.00 = 1000)
        currency: str = "usd",
        customer_id: Optional[str] = None,
        payment_method_id: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a PaymentIntent for a ride payment.
        
        Args:
            amount: Amount in cents (e.g., 4500 for $45.00)
            currency: Currency code (default: usd)
            customer_id: Optional Stripe customer ID
            payment_method_id: Optional saved payment method
            description: Description of the charge
            metadata: Additional metadata (booking_id, etc.)
            
        Returns:
            Dict with client_secret and payment_intent_id
        """
        try:
            intent_params = {
                "amount": amount,
                "currency": currency,
                "description": description or "Seryvo Ride Payment",
                "metadata": metadata or {},
                "automatic_payment_methods": {
                    "enabled": True,
                    "allow_redirects": "never"
                }
            }
            
            if customer_id:
                intent_params["customer"] = customer_id
            
            if payment_method_id:
                intent_params["payment_method"] = payment_method_id
                intent_params["confirm"] = True
            
            payment_intent = stripe.PaymentIntent.create(**intent_params)
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "client_secret": payment_intent.client_secret,
                "status": payment_intent.status,
                "amount": payment_intent.amount,
                "currency": payment_intent.currency,
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    async def confirm_payment_intent(
        payment_intent_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """
        Confirm a PaymentIntent with a payment method.
        """
        try:
            payment_intent = stripe.PaymentIntent.confirm(
                payment_intent_id,
                payment_method=payment_method_id
            )
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "amount_received": payment_intent.amount_received,
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    async def capture_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
        """
        Capture a confirmed PaymentIntent (for delayed capture scenarios).
        """
        try:
            payment_intent = stripe.PaymentIntent.capture(payment_intent_id)
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "amount_captured": payment_intent.amount_received,
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    async def refund_payment(
        payment_intent_id: str,
        amount: Optional[int] = None,  # Partial refund amount in cents
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Refund a payment (full or partial).
        
        Args:
            payment_intent_id: The PaymentIntent to refund
            amount: Optional partial refund amount in cents
            reason: Optional reason (duplicate, fraudulent, requested_by_customer)
        """
        try:
            refund_params = {
                "payment_intent": payment_intent_id,
            }
            
            if amount:
                refund_params["amount"] = amount
            
            if reason:
                refund_params["reason"] = reason
            
            refund = stripe.Refund.create(**refund_params)
            
            return {
                "success": True,
                "refund_id": refund.id,
                "status": refund.status,
                "amount": refund.amount,
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    async def create_payout_to_driver(
        amount: int,  # Amount in cents
        destination_account: str,  # Connected account ID
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a payout to a driver's connected account.
        
        Note: Requires Stripe Connect for real payouts.
        In test mode, this simulates the payout.
        """
        try:
            transfer = stripe.Transfer.create(
                amount=amount,
                currency="usd",
                destination=destination_account,
                description=description or "Seryvo Driver Payout",
                metadata=metadata or {}
            )
            
            return {
                "success": True,
                "transfer_id": transfer.id,
                "amount": transfer.amount,
                "status": "pending",  # Transfers are typically pending initially
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    async def attach_payment_method(
        payment_method_id: str,
        customer_id: str
    ) -> Dict[str, Any]:
        """
        Attach a payment method to a customer for future use.
        """
        try:
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            return {
                "success": True,
                "payment_method_id": payment_method.id,
                "type": payment_method.type,
                "card": {
                    "brand": payment_method.card.brand if payment_method.card else None,
                    "last4": payment_method.card.last4 if payment_method.card else None,
                    "exp_month": payment_method.card.exp_month if payment_method.card else None,
                    "exp_year": payment_method.card.exp_year if payment_method.card else None,
                }
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    async def get_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
        """Retrieve a PaymentIntent by ID."""
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "status": payment_intent.status,
                "amount": payment_intent.amount,
                "amount_received": payment_intent.amount_received,
                "currency": payment_intent.currency,
                "metadata": dict(payment_intent.metadata),
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    @staticmethod
    def create_setup_intent(customer_id: str) -> Dict[str, Any]:
        """
        Create a SetupIntent for saving a payment method without charging.
        Used for adding cards to customer profiles.
        """
        try:
            setup_intent = stripe.SetupIntent.create(
                customer=customer_id,
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never"
                }
            )
            
            return {
                "success": True,
                "setup_intent_id": setup_intent.id,
                "client_secret": setup_intent.client_secret,
            }
            
        except StripeError as e:
            return {
                "success": False,
                "error": str(e),
            }


# Singleton instance
stripe_service = StripeService()
