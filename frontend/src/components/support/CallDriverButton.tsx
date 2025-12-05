/**
 * Seryvo Platform - Call Driver Button Component
 * Quick action button for Support agents to call drivers with logging
 */

import { useState, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Clock,
  CheckCircle,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// =============================================================================
// Types
// =============================================================================

interface CallLogEntry {
  call_id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  agent_id: string;
  agent_name: string;
  call_time: string;
  duration_seconds: number | null;
  status: 'initiated' | 'completed' | 'no_answer' | 'busy' | 'cancelled';
  notes: string;
  related_booking_id?: string;
  related_ticket_id?: string;
}

interface CallDriverButtonProps {
  driverId: string;
  driverName: string;
  driverPhone: string;
  relatedBookingId?: string;
  relatedTicketId?: string;
  compact?: boolean;
  onCallLogged?: (entry: CallLogEntry) => void;
}

// =============================================================================
// Component
// =============================================================================

export default function CallDriverButton({
  driverId,
  driverName,
  driverPhone,
  relatedBookingId,
  relatedTicketId,
  compact = false,
  onCallLogged,
}: CallDriverButtonProps) {
  const [showCallModal, setShowCallModal] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'completed'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<CallLogEntry['status']>('completed');
  const [showDropdown, setShowDropdown] = useState(false);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Format phone number for display
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Initiate call via tel: link
  const handleInitiateCall = () => {
    setShowCallModal(true);
    setCallStatus('calling');
    
    // Open phone dialer via tel: link
    window.open(`tel:${driverPhone}`, '_self');
    
    // Start tracking call duration
    const startTime = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  // End call and log
  const handleEndCall = () => {
    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setCallStatus('completed');
  };

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Save call log
  const handleSaveCallLog = () => {
    const entry: CallLogEntry = {
      call_id: `call-${Date.now()}`,
      driver_id: driverId,
      driver_name: driverName,
      driver_phone: driverPhone,
      agent_id: 'current-agent', // Would come from auth context
      agent_name: 'Sam Support', // Would come from auth context
      call_time: new Date().toISOString(),
      duration_seconds: callDuration,
      status: callOutcome,
      notes: callNotes,
      related_booking_id: relatedBookingId,
      related_ticket_id: relatedTicketId,
    };
    
    // In production, this would POST to API
    if (onCallLogged) {
      onCallLogged(entry);
    }
    
    // Reset state and close modal
    setShowCallModal(false);
    setCallStatus('idle');
    setCallDuration(0);
    setCallNotes('');
    setCallOutcome('completed');
  };

  // Cancel call without logging
  const handleCancelCall = () => {
    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setShowCallModal(false);
    setCallStatus('idle');
    setCallDuration(0);
    setCallNotes('');
    setCallOutcome('completed');
  };

  // Quick call without modal (just tel: link)
  const handleQuickCall = () => {
    window.open(`tel:${driverPhone}`, '_self');
  };

  // Send SMS instead
  const handleSendSMS = () => {
    window.open(`sms:${driverPhone}`, '_self');
    setShowDropdown(false);
  };

  const outcomeOptions = [
    { value: 'completed', label: 'Call Completed', icon: CheckCircle, color: 'text-green-500' },
    { value: 'no_answer', label: 'No Answer', icon: PhoneOff, color: 'text-amber-500' },
    { value: 'busy', label: 'Line Busy', icon: Phone, color: 'text-red-500' },
    { value: 'cancelled', label: 'Cancelled', icon: PhoneOff, color: 'text-gray-500' },
  ] as const;

  // Compact button variant
  if (compact) {
    return (
      <div className="relative" title={`Call ${driverName}`}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleQuickCall}
          className="!px-2"
        >
          <Phone className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Main button with dropdown */}
      <div className="relative">
        <div className="flex">
          <Button
            variant="secondary"
            onClick={handleInitiateCall}
            className="rounded-r-none flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Call Driver
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowDropdown(!showDropdown)}
            className="rounded-l-none border-l border-gray-300 dark:border-gray-600 !px-2"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Dropdown menu */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)} 
            />
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    handleQuickCall();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                >
                  <Phone className="w-4 h-4" />
                  Quick Call (No Log)
                </button>
                <button
                  onClick={() => {
                    handleInitiateCall();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                >
                  <PhoneCall className="w-4 h-4" />
                  Call & Log
                </button>
                <button
                  onClick={handleSendSMS}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send SMS
                </button>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatPhone(driverPhone)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Call Modal */}
      <Modal
        isOpen={showCallModal}
        onClose={handleCancelCall}
        title="Call Driver"
        size="sm"
      >
        <div className="space-y-4">
          {/* Driver Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {driverName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatPhone(driverPhone)}
              </p>
            </div>
          </div>

          {/* Call Status */}
          {callStatus === 'calling' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-3 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-pulse">
                <PhoneCall className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Calling...
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatDuration(callDuration)}</span>
              </div>
              <Button
                variant="danger"
                onClick={handleEndCall}
                className="mt-4"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                End Call
              </Button>
            </div>
          )}

          {/* Call Completed - Log Form */}
          {callStatus === 'completed' && (
            <div className="space-y-4">
              {/* Duration */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Call Duration
                </span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {formatDuration(callDuration)}
                </span>
              </div>

              {/* Call Outcome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Call Outcome
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {outcomeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setCallOutcome(option.value)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                          callOutcome === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${option.color}`} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Call Notes
                </label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Add notes about the call..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Related References */}
              {(relatedBookingId || relatedTicketId) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  {relatedBookingId && (
                    <p>Booking: {relatedBookingId}</p>
                  )}
                  {relatedTicketId && (
                    <p>Ticket: {relatedTicketId}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleCancelCall}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveCallLog}
                  className="flex-1"
                >
                  Save Call Log
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

// =============================================================================
// Call History Component
// =============================================================================

interface CallHistoryProps {
  driverId: string;
  className?: string;
}

export function CallHistory({ driverId, className = '' }: CallHistoryProps) {
  // Mock call history - in production would fetch from API
  const callHistory: CallLogEntry[] = [
    {
      call_id: 'call-1',
      driver_id: driverId,
      driver_name: 'Bob Driver',
      driver_phone: '+15551234567',
      agent_id: 'agent-1',
      agent_name: 'Sam Support',
      call_time: '2024-12-02T14:30:00Z',
      duration_seconds: 245,
      status: 'completed',
      notes: 'Discussed late arrival for booking #123',
      related_booking_id: 'booking-123',
    },
    {
      call_id: 'call-2',
      driver_id: driverId,
      driver_name: 'Bob Driver',
      driver_phone: '+15551234567',
      agent_id: 'agent-2',
      agent_name: 'Alex Helper',
      call_time: '2024-12-01T10:15:00Z',
      duration_seconds: 180,
      status: 'completed',
      notes: 'Document verification follow-up',
    },
    {
      call_id: 'call-3',
      driver_id: driverId,
      driver_name: 'Bob Driver',
      driver_phone: '+15551234567',
      agent_id: 'agent-1',
      agent_name: 'Sam Support',
      call_time: '2024-11-30T16:45:00Z',
      duration_seconds: null,
      status: 'no_answer',
      notes: 'Attempted to discuss payment issue',
    },
  ];

  const formatCallTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: CallLogEntry['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'no_answer':
        return <PhoneOff className="w-4 h-4 text-amber-500" />;
      case 'busy':
        return <Phone className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <PhoneOff className="w-4 h-4 text-gray-400" />;
      default:
        return <Phone className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className={className}>
      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
        Call History
      </h4>
      
      {callHistory.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No call history available
        </p>
      ) : (
        <div className="space-y-2">
          {callHistory.map((call) => (
            <div
              key={call.call_id}
              className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(call.status)}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {call.agent_name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCallTime(call.call_time)}
                </span>
              </div>
              
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Duration: {formatDuration(call.duration_seconds)}</span>
                {call.related_booking_id && (
                  <span>Booking: {call.related_booking_id}</span>
                )}
              </div>
              
              {call.notes && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {call.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
