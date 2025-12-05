/**
 * Seryvo Platform - Custom Date Time Picker
 * Styled date and time picker with calendar view and time selection
 */

import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO datetime string or empty
  onChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  error?: string;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function DateTimePicker({
  value,
  onChange,
  minDate = new Date(),
  maxDate,
  placeholder = 'Select date and time',
  error,
  className = '',
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    return value ? new Date(value) : null;
  });
  const [selectedHour, setSelectedHour] = useState(() => {
    return value ? new Date(value).getHours() : 12;
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    return value ? new Date(value).getMinutes() : 0;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update state when value changes externally
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setSelectedHour(date.getHours());
      setSelectedMinute(date.getMinutes());
      setViewDate(date);
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateDisabled = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const minStart = new Date(minDate);
    minStart.setHours(0, 0, 0, 0);

    if (dayStart < minStart) return true;
    if (maxDate) {
      const maxEnd = new Date(maxDate);
      maxEnd.setHours(23, 59, 59, 999);
      if (dayStart > maxEnd) return true;
    }
    return false;
  };

  const isTimeDisabled = (hour: number, minute: number) => {
    if (!selectedDate) return false;
    
    const testDate = new Date(selectedDate);
    testDate.setHours(hour, minute, 0, 0);
    
    return testDate < minDate;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
    
    // Apply time to the selected date
    newDate.setHours(selectedHour, selectedMinute, 0, 0);
    
    // Check if time is valid for this date
    if (newDate < minDate) {
      // Reset to minimum valid time
      const minTime = new Date(minDate);
      setSelectedHour(minTime.getHours());
      setSelectedMinute(Math.ceil(minTime.getMinutes() / 15) * 15);
    }
    
    setActiveTab('time');
  };

  const handleTimeSelect = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    
    const finalDate = new Date(selectedDate);
    finalDate.setHours(selectedHour, selectedMinute, 0, 0);
    
    // Format as datetime-local value (YYYY-MM-DDTHH:MM)
    const formatted = finalDate.toISOString().slice(0, 16);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSelectedDate(null);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const formatDisplayValue = () => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    
    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      const isDisabled = isDateDisabled(date);
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      const isToday = date.getTime() === today.getTime();

      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && handleDateSelect(day)}
          disabled={isDisabled}
          className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
            isDisabled
              ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
              : isSelected
              ? 'bg-blue-500 text-white'
              : isToday
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderTimePicker = () => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Hour</p>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
            {HOURS.map((hour) => {
              const disabled = MINUTES.every(min => isTimeDisabled(hour, min));
              return (
                <button
                  key={hour}
                  onClick={() => !disabled && handleTimeSelect(hour, selectedMinute)}
                  disabled={disabled}
                  className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    disabled
                      ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                      : selectedHour === hour
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {hour.toString().padStart(2, '0')}:00
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Minute</p>
          <div className="space-y-1">
            {MINUTES.map((minute) => {
              const disabled = isTimeDisabled(selectedHour, minute);
              return (
                <button
                  key={minute}
                  onClick={() => !disabled && handleTimeSelect(selectedHour, minute)}
                  disabled={disabled}
                  className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                    disabled
                      ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                      : selectedMinute === minute
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  :{minute.toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
          error
            ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
            : isOpen
            ? 'border-blue-500 bg-white dark:bg-slate-800'
            : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600'
        }`}
      >
        <Calendar size={18} className="text-gray-400" />
        <span className={`flex-1 ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value ? formatDisplayValue() : placeholder}
        </span>
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
          >
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[320px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('date')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'date'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Calendar size={16} /> Date
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'time'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Clock size={16} /> Time
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === 'date' ? (
              <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </h3>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="h-9 flex items-center justify-center text-xs font-medium text-gray-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendar()}
                </div>
              </>
            ) : (
              renderTimePicker()
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-500">
              {selectedDate && (
                <>
                  {selectedDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  {' at '}
                  {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedDate}
                className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
