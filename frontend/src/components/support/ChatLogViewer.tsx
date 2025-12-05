/**
 * Seryvo Platform - Chat Log Viewer Component
 * Read-only view of conversation history for Support agents
 */

import { useState, useMemo } from 'react';
import {
  MessageSquare,
  User,
  Car,
  Search,
  Download,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { convertToCSV, downloadCSV } from '../../utils/csvExport';
import type { Message, Booking, ChatSession } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface ChatLogViewerProps {
  /** Optional booking to show chat for */
  booking?: Booking;
  /** Optional chat session to display */
  chatSession?: ChatSession;
  /** Whether to show as modal or inline */
  isModal?: boolean;
  /** Modal close handler */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

interface _ChatLogEntry {
  message: Message;
  senderName: string;
  senderRole: 'client' | 'driver' | 'support' | 'system';
}

// Extended message type with read_at for chat log display
interface ChatMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  sender_display_name: string;
  body: string;
  sent_at: string;
  read_at?: string;
}

// =============================================================================
// Mock Data for Demo
// =============================================================================

const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    message_id: 'msg-1',
    chat_id: 'chat-1',
    sender_id: 'client-1',
    sender_display_name: 'Alice Client',
    body: 'Hi, I just booked a ride. Can you confirm my pickup location is correct?',
    sent_at: '2024-12-02T10:15:00Z',
    read_at: '2024-12-02T10:15:30Z',
  },
  {
    message_id: 'msg-2',
    chat_id: 'chat-1',
    sender_id: 'driver-1',
    sender_display_name: 'Bob Driver',
    body: 'Hello! Yes, I can see your pickup is at 123 Main Street. I\'ll be there in about 10 minutes.',
    sent_at: '2024-12-02T10:16:00Z',
    read_at: '2024-12-02T10:16:15Z',
  },
  {
    message_id: 'msg-3',
    chat_id: 'chat-1',
    sender_id: 'client-1',
    sender_display_name: 'Alice Client',
    body: 'Great, thank you! I\'ll be waiting outside the building.',
    sent_at: '2024-12-02T10:17:00Z',
    read_at: '2024-12-02T10:17:10Z',
  },
  {
    message_id: 'msg-4',
    chat_id: 'chat-1',
    sender_id: 'driver-1',
    sender_display_name: 'Bob Driver',
    body: 'Perfect, see you soon!',
    sent_at: '2024-12-02T10:17:30Z',
    read_at: '2024-12-02T10:17:45Z',
  },
  {
    message_id: 'msg-5',
    chat_id: 'chat-1',
    sender_id: 'driver-1',
    sender_display_name: 'Bob Driver',
    body: 'I\'m arriving now. I\'m in a white Toyota Camry.',
    sent_at: '2024-12-02T10:25:00Z',
    read_at: '2024-12-02T10:25:20Z',
  },
  {
    message_id: 'msg-6',
    chat_id: 'chat-1',
    sender_id: 'client-1',
    sender_display_name: 'Alice Client',
    body: 'I see you! Coming out now.',
    sent_at: '2024-12-02T10:25:45Z',
    read_at: '2024-12-02T10:26:00Z',
  },
];

const MOCK_PARTICIPANTS: Record<string, { name: string; role: 'client' | 'driver' | 'support' }> = {
  'client-1': { name: 'Alice Client', role: 'client' },
  'driver-1': { name: 'Bob Driver', role: 'driver' },
  'support-1': { name: 'Sam Support', role: 'support' },
};

// =============================================================================
// Component
// =============================================================================

export default function ChatLogViewer({
  booking,
  chatSession: _chatSession,
  isModal = false,
  onClose,
  className = '',
}: ChatLogViewerProps) {
  // Start with empty array - data populates when demo data is loaded
  const [messages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['all']));
  const [showFilters, setShowFilters] = useState(false);
  const [filterSender, setFilterSender] = useState<string>('all');

  // Format timestamp
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get sender info - participants would come from chat session data when demo data is loaded
  const getSenderInfo = (senderId: string) => {
    // In production, this would use participant data from the chat session
    // For now, return unknown since demo data isn't loaded
    return { name: `User ${senderId.slice(-4)}`, role: 'client' as const };
  };

  // Filter and search messages
  const filteredMessages = useMemo(() => {
    let result = [...messages];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(msg => 
        msg.body.toLowerCase().includes(query) ||
        getSenderInfo(msg.sender_id).name.toLowerCase().includes(query)
      );
    }

    // Sender filter
    if (filterSender !== 'all') {
      result = result.filter(msg => {
        const sender = getSenderInfo(msg.sender_id);
        return sender.role === filterSender;
      });
    }

    return result;
  }, [messages, searchQuery, filterSender]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; dateLabel: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    filteredMessages.forEach(msg => {
      const msgDate = new Date(msg.sent_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({
          date: msgDate,
          dateLabel: formatDate(msg.sent_at),
          messages: [msg],
        });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [filteredMessages]);

  // Toggle day expansion
  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  // Export chat log
  const handleExport = () => {
    const data = filteredMessages.map(msg => {
      const sender = getSenderInfo(msg.sender_id);
      return {
        timestamp: formatDateTime(msg.sent_at),
        sender_name: sender.name,
        sender_role: sender.role,
        message: msg.body,
        read_at: msg.read_at ? formatDateTime(msg.read_at) : 'Unread',
      };
    });

    const columns = [
      { key: 'timestamp', header: 'Timestamp' },
      { key: 'sender_name', header: 'Sender' },
      { key: 'sender_role', header: 'Role' },
      { key: 'message', header: 'Message' },
      { key: 'read_at', header: 'Read At' },
    ];

    const csvContent = convertToCSV(data, columns);
    const filename = booking 
      ? `chat-log-${booking.booking_id}-${new Date().toISOString().split('T')[0]}`
      : `chat-log-${new Date().toISOString().split('T')[0]}`;
    downloadCSV(csvContent, filename);
  };

  // Get role icon
  const getRoleIcon = (role: 'client' | 'driver' | 'support' | 'system') => {
    switch (role) {
      case 'client':
        return <User className="w-4 h-4" />;
      case 'driver':
        return <Car className="w-4 h-4" />;
      case 'support':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Get role color
  const getRoleColor = (role: 'client' | 'driver' | 'support' | 'system') => {
    switch (role) {
      case 'client':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'driver':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'support':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const content = (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-500" />
            Chat Log
          </h3>
          {booking && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Booking: {booking.booking_id}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <select
              value={filterSender}
              onChange={(e) => setFilterSender(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Participants</option>
              <option value="client">Clients Only</option>
              <option value="driver">Drivers Only</option>
              <option value="support">Support Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No messages found</p>
            {searchQuery && (
              <p className="text-sm mt-1">Try adjusting your search</p>
            )}
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Date Header */}
              <button
                onClick={() => toggleDay(group.date)}
                className="flex items-center gap-2 w-full text-left"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  {group.dateLabel}
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {group.messages.length} messages
                  </span>
                </div>
                {expandedDays.has(group.date) || expandedDays.has('all') ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Messages for this date */}
              {(expandedDays.has(group.date) || expandedDays.has('all')) && (
                <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {group.messages.map((msg) => {
                    const sender = getSenderInfo(msg.sender_id);
                    return (
                      <div key={msg.message_id} className="flex gap-3">
                        {/* Sender Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getRoleColor(sender.role)}`}>
                          {getRoleIcon(sender.role)}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {sender.name}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleColor(sender.role)}`}>
                              {sender.role}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(msg.sent_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {msg.body}
                          </p>
                          {msg.read_at && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Read at {formatTime(msg.read_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
          </span>
          {messages.length > 0 && (
            <span>
              {formatDateTime(messages[0].sent_at)} — {formatDateTime(messages[messages.length - 1].sent_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose || (() => {})}
        title=""
        size="lg"
      >
        <div className="h-[600px] -m-6">
          {content}
        </div>
      </Modal>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      {content}
    </Card>
  );
}
