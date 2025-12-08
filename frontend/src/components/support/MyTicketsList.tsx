import { useState, useEffect } from 'react';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Send,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { backend } from '../../services/backend';
import { useAuth } from '../../contexts/AuthContext';
import type { SupportTicket, TicketStatus, TicketMessage } from '../../types';

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-blue-500', icon: <AlertCircle size={14} /> },
  in_progress: { label: 'In Progress', color: 'bg-amber-500', icon: <Clock size={14} /> },
  waiting_on_client: { label: 'Awaiting Response', color: 'bg-purple-500', icon: <MessageCircle size={14} /> },
  waiting_on_driver: { label: 'Awaiting Driver', color: 'bg-purple-500', icon: <MessageCircle size={14} /> },
  resolved: { label: 'Resolved', color: 'bg-green-500', icon: <CheckCircle size={14} /> },
  closed: { label: 'Closed', color: 'bg-gray-500', icon: <XCircle size={14} /> },
  escalated: { label: 'Escalated', color: 'bg-red-500', icon: <AlertCircle size={14} /> },
};

export default function MyTicketsList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<Record<string, SupportTicket>>({});
  const [replyMessage, setReplyMessage] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await backend.getTickets();
      setTickets(data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    // Refresh expanded ticket details too
    if (expandedTicketId) {
      await loadTicketDetails(expandedTicketId);
    }
    setRefreshing(false);
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const details = await backend.getTicketById(ticketId);
      if (details) {
        setTicketDetails(prev => ({ ...prev, [ticketId]: details }));
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error);
    }
  };

  const handleExpand = async (ticketId: string) => {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
    } else {
      setExpandedTicketId(ticketId);
      if (!ticketDetails[ticketId]) {
        await loadTicketDetails(ticketId);
      }
    }
  };

  const handleSendReply = async (ticketId: string) => {
    const message = replyMessage[ticketId]?.trim();
    if (!message) return;

    setSendingReply(ticketId);
    try {
      await backend.sendTicketMessage(ticketId, message);
      setReplyMessage(prev => ({ ...prev, [ticketId]: '' }));
      // Refresh ticket details to show the new message
      await loadTicketDetails(ticketId);
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
    setSendingReply(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Ticket size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold dark:text-white">My Support Tickets</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Ticket size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold dark:text-white">My Support Tickets</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Track your support requests</p>
          </div>
        </div>
        <div className="text-center py-6 text-gray-500 dark:text-slate-400">
          <Ticket size={32} className="mx-auto mb-2 opacity-50" />
          <p>No support tickets yet</p>
          <p className="text-sm mt-1">When you contact support, your tickets will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Ticket size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold dark:text-white">My Support Tickets</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </Button>
      </div>

      <div className="space-y-2 border-t border-gray-100 dark:border-slate-700 pt-4">
        {tickets.map(ticket => {
          const isExpanded = expandedTicketId === ticket.ticket_id;
          const details = ticketDetails[ticket.ticket_id];
          const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
          const hasMessages = details?.messages && details.messages.length > 1;

          return (
            <div
              key={ticket.ticket_id}
              className="border border-gray-100 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Ticket Header */}
              <button
                onClick={() => handleExpand(ticket.ticket_id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${statusConfig.color}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      #{ticket.ticket_id}
                    </span>
                  </div>
                  <p className="font-medium dark:text-white truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {formatDate(ticket.created_at)}
                    {ticket.assignee_name && ` • Assigned to ${ticket.assignee_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasMessages && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <MessageCircle size={12} />
                      {details.messages!.length}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100 dark:border-slate-700">
                  {/* Description */}
                  {ticket.public_description && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {ticket.public_description}
                      </p>
                    </div>
                  )}

                  {/* Messages Thread */}
                  {details?.messages && details.messages.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
                        Conversation
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {details.messages
                          .filter(m => !m.is_internal)
                          .map((msg, idx) => {
                            const isMe = msg.sender_id === String(user?.id);
                            return (
                              <div
                                key={msg.id || idx}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                    isMe
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200'
                                  }`}
                                >
                                  {!isMe && (
                                    <p className="text-xs font-medium mb-1 opacity-75">
                                      {msg.sender_name}
                                    </p>
                                  )}
                                  <p className="text-sm">{msg.message}</p>
                                  <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>
                                    {formatTime(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Reply Input */}
                  {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a reply..."
                        value={replyMessage[ticket.ticket_id] || ''}
                        onChange={e => setReplyMessage(prev => ({ ...prev, [ticket.ticket_id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(ticket.ticket_id);
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSendReply(ticket.ticket_id)}
                        disabled={!replyMessage[ticket.ticket_id]?.trim() || sendingReply === ticket.ticket_id}
                      >
                        {sendingReply === ticket.ticket_id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Closed/Resolved Status */}
                  {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                    <div className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
                      This ticket has been {ticket.status}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
