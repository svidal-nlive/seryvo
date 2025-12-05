import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign } from 'lucide-react';
import Button from '../components/ui/Button';
import PricingConfig, {
  type FareModelConfig,
  type SurchargeConfig,
} from '../components/admin/PricingConfig';

// Mock data - in real app this would come from backend
const INITIAL_FARE_MODELS: FareModelConfig[] = [
  {
    id: 'fare-standard',
    name: 'Standard Fare',
    service_type: 'standard',
    base_fare_cents: 500,
    per_km_rate_cents: 150,
    per_minute_rate_cents: 25,
    minimum_fare_cents: 800,
    booking_fee_cents: 200,
    platform_fee_percent: 20,
    is_active: true,
  },
  {
    id: 'fare-premium',
    name: 'Premium Fare',
    service_type: 'premium',
    base_fare_cents: 1200,
    per_km_rate_cents: 250,
    per_minute_rate_cents: 40,
    minimum_fare_cents: 1500,
    booking_fee_cents: 300,
    platform_fee_percent: 20,
    is_active: true,
  },
  {
    id: 'fare-van',
    name: 'Van / XL Fare',
    service_type: 'van',
    base_fare_cents: 1500,
    per_km_rate_cents: 200,
    per_minute_rate_cents: 35,
    minimum_fare_cents: 2000,
    booking_fee_cents: 300,
    platform_fee_percent: 20,
    is_active: true,
  },
];

const INITIAL_SURCHARGES: SurchargeConfig[] = [
  {
    id: 'surge-airport',
    name: 'Airport Pickup/Dropoff',
    type: 'fixed',
    value: 500,
    applies_to: 'all',
    conditions: 'Pickup or dropoff at airport locations',
    is_active: true,
  },
  {
    id: 'surge-night',
    name: 'Night Rate',
    type: 'multiplier',
    value: 1.25,
    applies_to: 'all',
    conditions: 'Trips between 10 PM - 6 AM',
    is_active: true,
  },
  {
    id: 'surge-holiday',
    name: 'Holiday Surcharge',
    type: 'percent',
    value: 15,
    applies_to: 'all',
    conditions: 'National holidays',
    is_active: false,
  },
];

interface PricingManagementProps {
  onBack?: () => void;
}

export default function PricingManagement({ onBack }: PricingManagementProps) {
  const [fareModels, setFareModels] = useState<FareModelConfig[]>(INITIAL_FARE_MODELS);
  const [surcharges, setSurcharges] = useState<SurchargeConfig[]>(INITIAL_SURCHARGES);
  const [loading, setLoading] = useState(false);

  const handleSaveFareModel = async (model: FareModelConfig) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setFareModels((prev) =>
      prev.map((m) => (m.id === model.id ? model : m))
    );
  };

  const handleSaveSurcharge = async (surcharge: SurchargeConfig) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    setSurcharges((prev) => {
      const exists = prev.find((s) => s.id === surcharge.id);
      if (exists) {
        return prev.map((s) => (s.id === surcharge.id ? surcharge : s));
      }
      return [...prev, surcharge];
    });
  };

  const handleDeleteSurcharge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this surcharge?')) return;
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    setSurcharges((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={18} />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <DollarSign size={24} className="text-green-600" />
            Pricing Management
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            Configure fare models, surcharges, and pricing rules
          </p>
        </div>
      </div>

      {/* Pricing Config */}
      <PricingConfig
        fareModels={fareModels}
        surcharges={surcharges}
        onSaveFareModel={handleSaveFareModel}
        onSaveSurcharge={handleSaveSurcharge}
        onDeleteSurcharge={handleDeleteSurcharge}
        loading={loading}
      />
    </div>
  );
}
