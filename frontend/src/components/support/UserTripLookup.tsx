/**
 * Seryvo Platform - User & Trip Lookup Component
 * Advanced search tool for Support agents to find users, bookings, and trips
 */

import { useState, useCallback } from 'react';
import {
  Search,
  User,
  FileText,
  ChevronRight,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { backend } from '../../services/backend';
import type { Booking, BaseUser, BookingStatus } from '../../types';

// =============================================================================
// Types
// =============================================================================

type SearchType = 'all' | 'user' | 'booking' | 'phone';

interface SearchResult {
  type: 'user' | 'booking';
  id: string;
  title: string;
  subtitle: string;
  status?: BookingStatus;
  metadata: Record<string, string>;
  data: Booking | BaseUser;
}

interface UserTripLookupProps {
  /** Called when a booking is selected */
  onSelectBooking?: (booking: Booking) => void;
  /** Called when a user is selected */
  onSelectUser?: (user: BaseUser) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export default function UserTripLookup({
  onSelectBooking,
  onSelectUser,
  className = '',
}: UserTripLookupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() && !dateFrom && !dateTo) {
      setError('Please enter a search query or select a date range');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const searchResults: SearchResult[] = [];
      const query = searchQuery.toLowerCase().trim();

      // Search bookings
      if (searchType === 'all' || searchType === 'booking') {
        const allBookings = await backend.getAllBookings();
        
        const filteredBookings = allBookings.filter((booking) => {
          // Text search
          if (query) {
            const matchesId = booking.booking_id.toLowerCase().includes(query);
            const matchesNotes = booking.special_notes?.toLowerCase().includes(query);
            const matchesAddress = booking.legs.some(
              (leg) =>
                leg.pickup.address_line.toLowerCase().includes(query) ||
                leg.dropoff.address_line.toLowerCase().includes(query)
            );
            if (!matchesId && !matchesNotes && !matchesAddress) return false;
          }

          // Date range filter
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            const bookingDate = new Date(booking.created_at);
            if (bookingDate < fromDate) return false;
          }
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            const bookingDate = new Date(booking.created_at);
            if (bookingDate > toDate) return false;
          }

          return true;
        });

        filteredBookings.forEach((booking) => {
          searchResults.push({
            type: 'booking',
            id: booking.booking_id,
            title: `Booking #${booking.booking_id.slice(0, 8)}`,
            subtitle: booking.legs[0]?.pickup.address_line ?? 'Unknown pickup',
            status: booking.status,
            metadata: {
              created: formatDate(booking.created_at),
              passengers: String(booking.passenger_count ?? 1),
              total: booking.price_breakdown?.grand_total
                ? formatCurrency(booking.price_breakdown.grand_total.amount)
                : 'N/A',
            },
            data: booking,
          });
        });
      }

      // Search users (clients and drivers)
      if (searchType === 'all' || searchType === 'user' || searchType === 'phone') {
        // Get all users from demo data
        const demoUsers: BaseUser[] = [
          { id: 'client-1', email: 'alice@example.com', full_name: 'Alice Johnson', role: 'client' },
          { id: 'client-2', email: 'charlie@example.com', full_name: 'Charlie Brown', role: 'client' },
          { id: 'driver-1', email: 'bob@example.com', full_name: 'Bob Driver', role: 'driver' },
          { id: 'driver-2', email: 'diana@example.com', full_name: 'Diana Smith', role: 'driver' },
        ];

        // Mock phone numbers for demo
        const phoneMap: Record<string, string> = {
          'client-1': '+1 (555) 123-4567',
          'client-2': '+1 (555) 234-5678',
          'driver-1': '+1 (555) 345-6789',
          'driver-2': '+1 (555) 456-7890',
        };

        const filteredUsers = demoUsers.filter((user) => {
          if (!query) return false;
          
          if (searchType === 'phone') {
            const phone = phoneMap[user.id] ?? '';
            return phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
          }
          
          return (
            user.full_name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.id.toLowerCase().includes(query)
          );
        });

        filteredUsers.forEach((user) => {
          searchResults.push({
            type: 'user',
            id: user.id,
            title: user.full_name,
            subtitle: user.email,
            metadata: {
              role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
              phone: phoneMap[user.id] ?? 'N/A',
            },
            data: user,
          });
        });
      }

      setResults(searchResults);
    } catch (_err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType, dateFrom, dateTo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'booking' && onSelectBooking) {
      onSelectBooking(result.data as Booking);
    } else if (result.type === 'user' && onSelectUser) {
      onSelectUser(result.data as BaseUser);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setResults([]);
    setSearched(false);
    setError('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Header */}
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          User & Trip Lookup
        </h3>
      </div>

      {/* Search Controls */}
      <Card className="space-y-4">
        {/* Search Type Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 pb-3">
          {[
            { value: 'all', label: 'All' },
            { value: 'booking', label: 'Bookings' },
            { value: 'user', label: 'Users' },
            { value: 'phone', label: 'Phone' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSearchType(tab.value as SearchType)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                searchType === tab.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              searchType === 'phone'
                ? 'Enter phone number...'
                : searchType === 'booking'
                ? 'Search by booking ID, address, or notes...'
                : searchType === 'user'
                ? 'Search by name or email...'
                : 'Search bookings, users, addresses...'
            }
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg
                       bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                       placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={performSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
            {searched && (
              <Button variant="secondary" onClick={clearSearch}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </Card>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {results.length === 0 && !loading ? (
            <Card>
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No results found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Try adjusting your search criteria
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {results.map((result) => (
                <Card
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className="cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        result.type === 'booking'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      }`}
                    >
                      {result.type === 'booking' ? <FileText className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {result.title}
                        </p>
                        {result.status && <Badge status={result.status} />}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.subtitle}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="hidden sm:flex flex-col items-end text-xs text-gray-500 dark:text-gray-400">
                      {Object.entries(result.metadata).slice(0, 2).map(([key, value]) => (
                        <span key={key}>
                          {key}: {value}
                        </span>
                      ))}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
