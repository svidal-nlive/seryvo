import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  Mail,
  Smartphone,
  MessageSquare,
  Save,
  CheckCircle,
  Calendar,
  Car,
  MapPin,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  icon: React.ReactNode;
}

interface ReminderSetting {
  id: string;
  label: string;
  enabled: boolean;
  timing_minutes: number;
}

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  {
    id: 'booking_confirmed',
    label: 'Booking Confirmed',
    description: 'When your trip is confirmed and driver assigned',
    email: true,
    sms: true,
    push: true,
    icon: <CheckCircle size={18} className="text-green-600" />,
  },
  {
    id: 'driver_assigned',
    label: 'Driver Assigned',
    description: 'When a driver accepts your trip',
    email: true,
    sms: false,
    push: true,
    icon: <Car size={18} className="text-blue-600" />,
  },
  {
    id: 'driver_en_route',
    label: 'Driver En Route',
    description: 'When driver starts heading to pickup location',
    email: false,
    sms: true,
    push: true,
    icon: <MapPin size={18} className="text-purple-600" />,
  },
  {
    id: 'driver_arrived',
    label: 'Driver Arrived',
    description: 'When driver arrives at pickup location',
    email: false,
    sms: true,
    push: true,
    icon: <MapPin size={18} className="text-amber-600" />,
  },
  {
    id: 'trip_complete',
    label: 'Trip Completed',
    description: 'When your trip is finished with receipt',
    email: true,
    sms: false,
    push: true,
    icon: <CheckCircle size={18} className="text-green-600" />,
  },
  {
    id: 'trip_canceled',
    label: 'Trip Canceled',
    description: 'When a trip is canceled by you or driver',
    email: true,
    sms: true,
    push: true,
    icon: <Bell size={18} className="text-red-600" />,
  },
];

const DEFAULT_REMINDERS: ReminderSetting[] = [
  { id: 'reminder_24h', label: '24 hours before', enabled: true, timing_minutes: 1440 },
  { id: 'reminder_2h', label: '2 hours before', enabled: true, timing_minutes: 120 },
  { id: 'reminder_30m', label: '30 minutes before', enabled: true, timing_minutes: 30 },
  { id: 'reminder_15m', label: '15 minutes before', enabled: false, timing_minutes: 15 },
];

interface TripAlertsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TripAlertsSettings({ isOpen, onClose }: TripAlertsSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES);
  const [reminders, setReminders] = useState<ReminderSetting[]>(DEFAULT_REMINDERS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Global toggles
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

  const togglePreference = (id: string, channel: 'email' | 'sms' | 'push') => {
    setPreferences(prev =>
      prev.map(p => {
        if (p.id === id) {
          return { ...p, [channel]: !p[channel] };
        }
        return p;
      })
    );
  };

  const toggleReminder = (id: string) => {
    setReminders(prev =>
      prev.map(r => {
        if (r.id === id) {
          return { ...r, enabled: !r.enabled };
        }
        return r;
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BellRing size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Trip Notifications</h2>
              <p className="text-sm text-gray-500">Manage how you receive trip updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Global Toggles */}
          <Card>
            <h3 className="font-semibold mb-4 dark:text-white flex items-center gap-2">
              <Bell size={18} /> Notification Channels
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div 
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  emailEnabled 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Mail size={20} className={emailEnabled ? 'text-blue-600' : 'text-gray-400'} />
                  <div className={`w-3 h-3 rounded-full ${emailEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <p className={`font-medium ${emailEnabled ? 'text-blue-900 dark:text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  Email
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {emailEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <div 
                onClick={() => setSmsEnabled(!smsEnabled)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  smsEnabled 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare size={20} className={smsEnabled ? 'text-blue-600' : 'text-gray-400'} />
                  <div className={`w-3 h-3 rounded-full ${smsEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <p className={`font-medium ${smsEnabled ? 'text-blue-900 dark:text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  SMS
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {smsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <div 
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  pushEnabled 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Smartphone size={20} className={pushEnabled ? 'text-blue-600' : 'text-gray-400'} />
                  <div className={`w-3 h-3 rounded-full ${pushEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <p className={`font-medium ${pushEnabled ? 'text-blue-900 dark:text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  Push
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {pushEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </Card>

          {/* Trip Reminders */}
          <Card>
            <h3 className="font-semibold mb-4 dark:text-white flex items-center gap-2">
              <Clock size={18} /> Upcoming Trip Reminders
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Get reminded about scheduled trips before they start
            </p>
            <div className="space-y-3">
              {reminders.map(reminder => (
                <label
                  key={reminder.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-gray-400" />
                    <span className="dark:text-white">{reminder.label}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={() => toggleReminder(reminder.id)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      reminder.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-1 ${
                        reminder.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <h3 className="font-semibold mb-4 dark:text-white flex items-center gap-2">
              <Calendar size={18} /> Event Notifications
            </h3>
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                <div className="col-span-6">Event</div>
                <div className="col-span-2 text-center">Email</div>
                <div className="col-span-2 text-center">SMS</div>
                <div className="col-span-2 text-center">Push</div>
              </div>

              {/* Rows */}
              {preferences.map(pref => (
                <div
                  key={pref.id}
                  className="grid grid-cols-12 gap-2 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors items-center"
                >
                  <div className="col-span-6 flex items-center gap-3">
                    {pref.icon}
                    <div>
                      <p className="font-medium dark:text-white text-sm">{pref.label}</p>
                      <p className="text-xs text-gray-500">{pref.description}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.id, 'email')}
                      disabled={!emailEnabled}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        pref.email && emailEnabled
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                      } ${!emailEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Mail size={14} />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.id, 'sms')}
                      disabled={!smsEnabled}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        pref.sms && smsEnabled
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                      } ${!smsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => togglePreference(pref.id, 'push')}
                      disabled={!pushEnabled}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        pref.push && pushEnabled
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                      } ${!pushEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Smartphone size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>Saving...</>
            ) : saved ? (
              <>
                <CheckCircle size={16} /> Saved!
              </>
            ) : (
              <>
                <Save size={16} /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
