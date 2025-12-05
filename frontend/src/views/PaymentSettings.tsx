import { useState, useEffect } from 'react';
import { CreditCard, Receipt, Gift, ArrowLeft } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PaymentMethods from '../components/payment/PaymentMethods';
import type { PaymentMethod } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { backend } from '../services/backend';

interface PaymentMethodFormData {
  type: 'card' | 'bank' | 'wallet';
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  holderName: string;
}

interface PaymentSettingsProps {
  onBack?: () => void;
}

export default function PaymentSettings({ onBack }: PaymentSettingsProps) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, [user]);

  const loadPaymentMethods = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await backend.getPaymentMethods(user.id);
      setMethods(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async (method: PaymentMethodFormData) => {
    if (!user) return;
    await backend.addPaymentMethod(user.id, {
      type: method.type,
      brand: method.brand,
      last4: method.last4,
      expiry_month: method.expiryMonth,
      expiry_year: method.expiryYear,
      holder_name: method.holderName,
      is_default: method.isDefault,
    });
    await loadPaymentMethods();
  };

  const handleRemoveMethod = async (methodId: string) => {
    await backend.removePaymentMethod(methodId);
    await loadPaymentMethods();
  };

  const handleSetDefault = async (methodId: string) => {
    await backend.setDefaultPaymentMethod(methodId);
    await loadPaymentMethods();
  };

  // Convert methods to component format (camelCase)
  const componentMethods = methods.map(m => ({
    id: m.id,
    type: m.type as 'card' | 'bank' | 'wallet',
    brand: m.brand as 'visa' | 'mastercard' | 'amex' | 'discover' | 'other',
    last4: m.last4,
    expiryMonth: m.expiry_month,
    expiryYear: m.expiry_year,
    isDefault: m.is_default,
    holderName: m.holder_name,
  }));

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
          <h1 className="text-2xl font-bold dark:text-white">Payment & Billing</h1>
          <p className="text-gray-500 dark:text-slate-400">
            Manage your payment methods and view billing history
          </p>
        </div>
      </div>

      {/* Payment Methods */}
      <PaymentMethods
        methods={componentMethods}
        onAddMethod={handleAddMethod}
        onRemoveMethod={handleRemoveMethod}
        onSetDefault={handleSetDefault}
        loading={loading}
      />

      {/* Promo Codes */}
      <section>
        <h3 className="text-lg font-semibold dark:text-white mb-4">Promo Codes</h3>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Gift size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium dark:text-white">Have a promo code?</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Enter your code to get a discount on your next ride
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code"
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white w-40"
              />
              <Button variant="secondary">Apply</Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Recent Transactions */}
      <section>
        <h3 className="text-lg font-semibold dark:text-white mb-4">Recent Transactions</h3>
        <Card>
          <div className="text-center py-8">
            <Receipt size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-slate-400">No transactions yet</p>
            <p className="text-sm text-gray-400 dark:text-slate-500">
              Your ride receipts will appear here
            </p>
          </div>
        </Card>
      </section>

      {/* Credits Balance */}
      <section>
        <h3 className="text-lg font-semibold dark:text-white mb-4">Seryvo Credits</h3>
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CreditCard size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium dark:text-white">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">$0.00</p>
            </div>
          </div>
          <Button variant="secondary">Add Credits</Button>
        </Card>
      </section>
    </div>
  );
}
