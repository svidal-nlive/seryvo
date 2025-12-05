import { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Lock,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// ---- Types ----

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  holderName: string;
}

interface PaymentMethodsProps {
  methods: PaymentMethod[];
  onAddMethod: (method: Omit<PaymentMethod, 'id'>) => Promise<void>;
  onRemoveMethod: (methodId: string) => Promise<void>;
  onSetDefault: (methodId: string) => Promise<void>;
  loading?: boolean;
}

// ---- Card Brand Icons ----

const BRAND_COLORS: Record<string, string> = {
  visa: 'bg-blue-600',
  mastercard: 'bg-gradient-to-r from-red-500 to-orange-500',
  amex: 'bg-blue-500',
  discover: 'bg-orange-500',
  other: 'bg-gray-500',
};

const BRAND_NAMES: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  other: 'Card',
};

function CardBrandIcon({ brand }: { brand: string }) {
  return (
    <div className={`w-10 h-6 rounded ${BRAND_COLORS[brand] || BRAND_COLORS.other} flex items-center justify-center`}>
      <span className="text-white text-xs font-bold">
        {brand === 'visa' ? 'VISA' : brand === 'mastercard' ? 'MC' : brand === 'amex' ? 'AMEX' : '••'}
      </span>
    </div>
  );
}

// ---- Add Card Form ----

interface AddCardFormProps {
  onSubmit: (data: {
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvc: string;
    holderName: string;
    setAsDefault: boolean;
  }) => void;
  onCancel: () => void;
  submitting: boolean;
}

function AddCardForm({ onSubmit, onCancel, submitting }: AddCardFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const detectBrand = (number: string): PaymentMethod['brand'] => {
    const digits = number.replace(/\D/g, '');
    if (/^4/.test(digits)) return 'visa';
    if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    if (/^6(?:011|5)/.test(digits)) return 'discover';
    return 'other';
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const digits = cardNumber.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
      newErrors.cardNumber = 'Enter a valid card number';
    }

    const [month, year] = expiry.split('/');
    const expiryMonth = parseInt(month, 10);
    const expiryYear = parseInt(year, 10);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (!month || !year || expiryMonth < 1 || expiryMonth > 12) {
      newErrors.expiry = 'Enter a valid expiry date';
    } else if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      newErrors.expiry = 'Card has expired';
    }

    if (cvc.length < 3 || cvc.length > 4) {
      newErrors.cvc = 'Enter a valid CVC';
    }

    if (holderName.trim().length < 2) {
      newErrors.holderName = 'Enter cardholder name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const [month, year] = expiry.split('/');
    onSubmit({
      cardNumber: cardNumber.replace(/\D/g, ''),
      expiryMonth: parseInt(month, 10),
      expiryYear: 2000 + parseInt(year, 10),
      cvc,
      holderName: holderName.trim(),
      setAsDefault,
    });
  };

  const currentBrand = detectBrand(cardNumber);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Card Number
        </label>
        <div className="relative">
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className={`w-full px-3 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
              errors.cardNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CardBrandIcon brand={currentBrand} />
          </div>
        </div>
        {errors.cardNumber && (
          <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
        )}
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Expiry Date
          </label>
          <input
            type="text"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
              errors.expiry ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.expiry && (
            <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            CVC
          </label>
          <input
            type="text"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
              errors.cvc ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.cvc && (
            <p className="text-red-500 text-xs mt-1">{errors.cvc}</p>
          )}
        </div>
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="John Doe"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white ${
            errors.holderName ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.holderName && (
          <p className="text-red-500 text-xs mt-1">{errors.holderName}</p>
        )}
      </div>

      {/* Set as Default */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-slate-300">
          Set as default payment method
        </span>
      </label>

      {/* Security Note */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm text-gray-600 dark:text-slate-400">
        <Lock size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Your card details are encrypted and securely processed. We never store your full card number.
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? 'Adding...' : 'Add Card'}
        </Button>
      </div>
    </form>
  );
}

// ---- Main Component ----

export default function PaymentMethods({
  methods,
  onAddMethod,
  onRemoveMethod,
  onSetDefault,
  loading = false,
}: PaymentMethodsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const handleAddCard = async (data: {
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvc: string;
    holderName: string;
    setAsDefault: boolean;
  }) => {
    setSubmitting(true);
    try {
      // Detect brand from card number
      const digits = data.cardNumber;
      let brand: PaymentMethod['brand'] = 'other';
      if (/^4/.test(digits)) brand = 'visa';
      else if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) brand = 'mastercard';
      else if (/^3[47]/.test(digits)) brand = 'amex';
      else if (/^6(?:011|5)/.test(digits)) brand = 'discover';

      await onAddMethod({
        type: 'card',
        brand,
        last4: digits.slice(-4),
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        isDefault: data.setAsDefault || methods.length === 0,
        holderName: data.holderName,
      });
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (methodId: string) => {
    await onRemoveMethod(methodId);
    setRemoveConfirm(null);
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold dark:text-white">Payment Methods</h3>
        <Button variant="secondary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Card
        </Button>
      </div>

      {methods.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <CreditCard size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-slate-400">No payment methods added yet</p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Your First Card
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <Card
              key={method.id}
              className={`flex items-center justify-between ${
                method.isDefault ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <CardBrandIcon brand={method.brand} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium dark:text-white">
                      {BRAND_NAMES[method.brand]} •••• {method.last4}
                    </span>
                    {method.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button
                    variant="ghost"
                    onClick={() => onSetDefault(method.id)}
                    className="text-sm"
                  >
                    <Check size={14} /> Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setRemoveConfirm(method.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Card Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Payment Card"
      >
        <AddCardForm
          onSubmit={handleAddCard}
          onCancel={() => setShowAddModal(false)}
          submitting={submitting}
        />
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        title="Remove Payment Method"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Are you sure you want to remove this payment method? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setRemoveConfirm(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => removeConfirm && handleRemove(removeConfirm)}
              className="flex-1"
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
