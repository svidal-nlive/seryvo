/**
 * Seryvo Platform - Create Support Ticket Modal
 * Allows clients and drivers to create support tickets from the Help page
 * or during an active trip.
 */
import { useState } from 'react';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { backend } from '../../services/backend';
import { useAuth } from '../../contexts/AuthContext';
import type { TicketCategory, TicketPriority, Booking } from '../../types';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional booking to associate with the ticket */
  booking?: Booking;
  /** Pre-selected category */
  defaultCategory?: TicketCategory;
  /** Pre-filled subject */
  defaultSubject?: string;
  /** Callback after successful ticket creation */
  onSuccess?: () => void;
}

const TICKET_CATEGORIES: { value: TicketCategory; label: string; description: string }[] = [
  { value: 'trip_issue', label: 'Trip Issue', description: 'Problem during a ride' },
  { value: 'payment_dispute', label: 'Payment Issue', description: 'Billing or payment problems' },
  { value: 'safety_incident', label: 'Safety Concern', description: 'Safety-related issues' },
  { value: 'account_issue', label: 'Account Issue', description: 'Profile or account problems' },
  { value: 'other', label: 'Other', description: 'General inquiries' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function CreateTicketModal({
  isOpen,
  onClose,
  booking,
  defaultCategory = 'other',
  defaultSubject = '',
  onSuccess,
}: CreateTicketModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<TicketCategory>(defaultCategory);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [subject, setSubject] = useState(defaultSubject);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setCategory(defaultCategory);
    setPriority('medium');
    setSubject(defaultSubject);
    setDescription('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    if (!description.trim()) {
      setError('Please describe your issue');
      return;
    }

    setSubmitting(true);

    try {
      await backend.createTicket({
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        booking_id: booking?.booking_id,
      });

      setSuccess(true);
      onSuccess?.();

      // Close modal after a short delay to show success message
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setError('Failed to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Request Submitted" size="sm">
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Send size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            We've received your request
          </h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Our support team will review your issue and get back to you shortly.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Contact Support" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Booking Context */}
        {booking && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Regarding your trip
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              {booking.legs[0]?.pickup.address_line} → {booking.legs[booking.legs.length - 1]?.dropoff.address_line}
            </p>
          </div>
        )}

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            What can we help you with?
          </label>
          <div className="grid grid-cols-1 gap-2">
            {TICKET_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`
                  p-3 rounded-lg border text-left transition-all
                  ${category === cat.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }
                `}
              >
                <p className={`text-sm font-medium ${category === cat.value ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {cat.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{cat.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Priority (only show for safety incidents or when booking is associated) */}
        {(category === 'safety_incident' || booking) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`
                    flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all
                    ${priority === opt.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <label htmlFor="ticket-subject" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Subject
          </label>
          <input
            id="ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="ticket-description" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Describe your issue
          </label>
          <textarea
            id="ticket-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide as much detail as possible to help us assist you..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white resize-none"
            maxLength={2000}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/2000</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send size={16} /> Submit
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
