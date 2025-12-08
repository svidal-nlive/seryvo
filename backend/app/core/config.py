"""
Seryvo Platform Backend Configuration
"""
from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "Seryvo Platform"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./seryvo.db"
    
    # JWT Authentication
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Demo Mode
    demo_mode: bool = True
    
    # ===========================================
    # STRIPE - Payment Processing (TEST MODE)
    # ===========================================
    # Get test keys from: https://dashboard.stripe.com/test/apikeys
    # Test mode is FREE - no charges are made
    stripe_publishable_key: str = ""  # pk_test_...
    stripe_secret_key: str = ""  # sk_test_...
    stripe_webhook_secret: str = ""  # whsec_...
    
    # ===========================================
    # RESEND - Email Notifications (FREE TIER)
    # ===========================================
    # 3,000 emails/month free
    # Get API key from: https://resend.com/api-keys
    resend_api_key: str = ""
    resend_from_email: str = "Seryvo <noreply@seryvo.demo>"
    
    # ===========================================
    # WEBPUSH - Push Notifications (FREE)
    # ===========================================
    # Generate VAPID keys: npx web-push generate-vapid-keys
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_mailto: str = "mailto:admin@seryvo.demo"
    
    # ===========================================
    # REDIS - Caching and Rate Limiting
    # ===========================================
    redis_url: str = "redis://seryvo-redis:6379"
    
    # ===========================================
    # RATE LIMITING
    # ===========================================
    rate_limit_enabled: bool = True
    rate_limit_default: str = "100/minute"  # Default limit per endpoint
    rate_limit_auth: str = "20/minute"  # Stricter for auth endpoints
    rate_limit_sensitive: str = "10/minute"  # For password reset, etc.
    
    # ===========================================
    # PRICING DEFAULTS (fallback if no PricingRule)
    # ===========================================
    pricing_default_base_fare: float = 5.0  # Base fare in default currency
    pricing_default_per_km: float = 1.5  # Per kilometer rate
    pricing_default_per_minute: float = 0.3  # Per minute rate
    pricing_default_minimum_fare: float = 10.0  # Minimum fare
    pricing_default_currency: str = "USD"  # Default currency
    pricing_avg_city_speed_kmh: float = 30.0  # Average city speed for duration estimates
    
    # ===========================================
    # PLATFORM FEES
    # ===========================================
    platform_commission_percent: float = 20.0  # Platform commission percentage
    
    # ===========================================
    # DRIVER SETTINGS
    # ===========================================
    driver_location_stale_minutes: int = 15  # Minutes before driver location is considered stale
    driver_offer_timeout_seconds: int = 60  # Seconds driver has to accept a booking offer
    
    # ===========================================
    # BOOKING SETTINGS
    # ===========================================
    booking_max_scheduled_days_ahead: int = 30  # Maximum days in advance for scheduling
    booking_cancellation_free_minutes: int = 5  # Free cancellation window in minutes
    booking_no_show_wait_minutes: int = 10  # Minutes driver waits before marking no-show
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def is_development(self) -> bool:
        return self.app_env == "development"
    
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
