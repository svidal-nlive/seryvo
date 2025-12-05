/**
 * Seryvo Platform - Supervisor Review Queue
 * Dedicated view for supervisors/admins to review escalated support tickets
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  User,
  UserCheck,
  XCircle,
  Flag,
  FileText,
  Send,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import type { TicketStatus, TicketPriority } from '../types';

// Message type for ticket conversations
interface TicketMessage {
  id: string;
  sender_id: string;
  sender_type: 'client' | 'driver' | 'support';
  content: string;
  created_at: string;
}

// Extended ticket type for escalated tickets
interface EscalatedTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  escalated_by?: string;
  escalated_at?: string;
  escalation_reason?: string;
  original_agent_id?: string;
  original_agent_name?: string;
  supervisor_notes?: string[];
  resolution_summary?: string;
  messages?: TicketMessage[];
}

// Resolution actions available to supervisors
type ResolutionAction = 
  | 'approve_agent_action'
  | 'override_agent_action'
  | 'return_to_agent'
  | 'reassign_to_agent'
  | 'resolve_directly'
  | 'escalate_to_admin';

// Mock escalated tickets for demo
const MOCK_ESCALATED_TICKETS: EscalatedTicket[] = [
  {
    id: 'ESC-001',
    user_id: 'user-5',
    subject: 'Disputed fare - client claims overcharge',
    description: 'Client claims they were charged $85 but the original quote was $45. Driver took a longer route.',
    category: 'payment_dispute',
    priority: 'high',
    status: 'escalated',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    escalated_by: 'Agent Sarah',
    escalated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    escalation_reason: 'Refund amount exceeds my authorization limit ($50). Client is threatening chargeback.',
    original_agent_id: 'agent-1',
    original_agent_name: 'Sarah Johnson',
    messages: [
      {
        id: 'msg-1',
        sender_id: 'user-5',
        sender_type: 'client' as const,
        content: 'I was quoted $45 but charged $85! This is robbery!',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        sender_id: 'agent-1',
        sender_type: 'support' as const,
        content: 'I apologize for the inconvenience. Let me review the trip details.',
        created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-3',
        sender_id: 'agent-1',
        sender_type: 'support' as const,
        content: 'I can see the driver took a different route. The fare difference is $40. I can offer a $25 credit per my authorization.',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-4',
        sender_id: 'user-5',
        sender_type: 'client' as const,
        content: 'That\'s not acceptable. I want the full $40 difference refunded.',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'ESC-002',
    user_id: 'driver-3',
    subject: 'Account deactivation appeal',
    description: 'Driver requesting review of account deactivation due to rating drop.',
    category: 'account_issue',
    priority: 'high',
    status: 'escalated',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    escalated_by: 'Agent Mike',
    escalated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    escalation_reason: 'Driver claims ratings were unfair due to app issues. Needs manager review.',
    original_agent_id: 'agent-2',
    original_agent_name: 'Mike Chen',
    messages: [
      {
        id: 'msg-1',
        sender_id: 'driver-3',
        sender_type: 'driver' as const,
        content: 'My account was deactivated but the low ratings were not my fault!',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        sender_id: 'agent-2',
        sender_type: 'support' as const,
        content: 'I understand your frustration. Can you explain what happened?',
        created_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-3',
        sender_id: 'driver-3',
        sender_type: 'driver' as const,
        content: 'The app kept crashing and showing wrong pickup locations. Clients rated me low because I was "late" but it was the app.',
        created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      },
    ],
    supervisor_notes: [
      'Verified app crash reports during the affected period (Nov 28-30)',
      'Driver has 4.8 rating history before this incident',
    ],
  },
  {
    id: 'ESC-003',
    user_id: 'user-8',
    subject: 'Safety concern - driver behavior',
    description: 'Client reports driver was aggressive and made inappropriate comments.',
    category: 'safety_incident',
    priority: 'urgent',
    status: 'escalated',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    escalated_by: 'Agent Lisa',
    escalated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    escalation_reason: 'URGENT: Safety report requires immediate supervisor review and potential driver suspension.',
    original_agent_id: 'agent-3',
    original_agent_name: 'Lisa Park',
    messages: [
      {
        id: 'msg-1',
        sender_id: 'user-8',
        sender_type: 'client' as const,
        content: 'I need to report a serious issue with my driver today.',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        sender_id: 'agent-3',
        sender_type: 'support' as const,
        content: 'I\'m very sorry to hear this. Your safety is our top priority. Please tell me what happened.',
        created_at: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-3',
        sender_id: 'user-8',
        sender_type: 'client' as const,
        content: 'The driver was driving aggressively and made me very uncomfortable with personal comments.',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

// Priority colors and labels
const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  low: { color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800', label: 'Low' },
  medium: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'Medium' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', label: 'High' },
  urgent: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Urgent' },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  trip_issue: { icon: <ExternalLink size={14} />, label: 'Trip Issue' },
  account_issue: { icon: <User size={14} />, label: 'Account' },
  payment_dispute: { icon: <FileText size={14} />, label: 'Payment' },
  safety_incident: { icon: <Shield size={14} />, label: 'Safety' },
  other: { icon: <MessageSquare size={14} />, label: 'Other' },
};

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function SupervisorReviewView() {
  const [tickets, setTickets] = useState<EscalatedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<EscalatedTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  
  // Resolution modal state
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction>('approve_agent_action');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    urgent: 0,
    pendingToday: 0,
    avgWaitTime: '2.5h',
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      // In real app, fetch escalated tickets from backend
      // Demo data is only available when loaded via Admin > Demo Data settings
      await new Promise(resolve => setTimeout(resolve, 500));
      // Start with empty array - data populates when demo data is loaded
      setTickets([]);
      
      // Calculate stats from empty data
      setStats({
        total: 0,
        urgent: 0,
        pendingToday: 0,
        avgWaitTime: '0h',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !ticket.id.toLowerCase().includes(query) &&
        !ticket.subject.toLowerCase().includes(query) &&
        !ticket.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Handle resolution
  const handleResolve = async () => {
    if (!selectedTicket) return;

    // In real app, call backend API
    console.log('Resolving ticket:', {
      ticketId: selectedTicket.id,
      action: resolutionAction,
      notes: resolutionNotes,
    });

    // Update ticket status based on action
    let newStatus: TicketStatus = 'in_progress';
    switch (resolutionAction) {
      case 'resolve_directly':
        newStatus = 'resolved';
        break;
      case 'return_to_agent':
      case 'reassign_to_agent':
        newStatus = 'in_progress';
        break;
      case 'escalate_to_admin':
        newStatus = 'escalated';
        break;
      default:
        newStatus = 'resolved';
    }

    // Update mock data
    setTickets(prev => prev.map(t => 
      t.id === selectedTicket.id 
        ? { ...t, status: newStatus, resolution_summary: resolutionNotes }
        : t
    ));

    setShowResolutionModal(false);
    setSelectedTicket(null);
    setResolutionNotes('');
    setResolutionAction('approve_agent_action');
  };

  // Add internal note
  const handleAddNote = async () => {
    if (!selectedTicket || !internalNote.trim()) return;

    setTickets(prev => prev.map(t => 
      t.id === selectedTicket.id 
        ? { 
            ...t, 
            supervisor_notes: [...(t.supervisor_notes || []), internalNote.trim()] 
          }
        : t
    ));
    setSelectedTicket(prev => prev ? {
      ...prev,
      supervisor_notes: [...(prev.supervisor_notes || []), internalNote.trim()]
    } : null);
    setInternalNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <Shield className="text-blue-500" />
            Supervisor Review Queue
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            Review and resolve escalated support tickets
          </p>
        </div>
        <Button onClick={loadTickets} variant="secondary">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400">Pending Review</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-red-600">{stats.urgent}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400">Urgent</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-amber-600">{stats.pendingToday}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400">Escalated Today</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">{stats.avgWaitTime}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400">Avg Wait Time</div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by ticket ID, subject, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option value="all">All Categories</option>
                <option value="billing">Billing</option>
                <option value="safety">Safety</option>
                <option value="account">Account</option>
                <option value="trip">Trip</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          </Card>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium dark:text-white">All caught up!</p>
              <p className="text-gray-500 dark:text-slate-400">No escalated tickets pending review.</p>
            </div>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
            const categoryConfig = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.technical;
            const isExpanded = expandedTicket === ticket.id;

            return (
              <Card 
                key={ticket.id}
                className={`cursor-pointer transition-all ${
                  ticket.priority === 'urgent' 
                    ? 'border-l-4 border-l-red-500' 
                    : ticket.priority === 'high'
                    ? 'border-l-4 border-l-orange-500'
                    : ''
                }`}
                onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Priority indicator */}
                  <div className={`p-2 rounded-lg ${priorityConfig.bgColor}`}>
                    <Flag className={priorityConfig.color} size={20} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-500">{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                        {categoryConfig.icon}
                        {categoryConfig.label}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold dark:text-white mb-1">{ticket.subject}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Escalated {formatTimeAgo(ticket.escalated_at || ticket.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        by {ticket.original_agent_name}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e?.stopPropagation();
                        setSelectedTicket(ticket);
                      }}
                    >
                      Review
                      <ArrowRight size={14} />
                    </Button>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 space-y-4">
                    {/* Escalation reason */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                        Escalation Reason
                      </h4>
                      <p className="text-amber-700 dark:text-amber-300 text-sm">
                        {ticket.escalation_reason}
                      </p>
                    </div>

                    {/* Original description */}
                    <div>
                      <h4 className="font-medium dark:text-white mb-2">Original Issue</h4>
                      <p className="text-gray-600 dark:text-slate-400 text-sm">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Supervisor notes */}
                    {ticket.supervisor_notes && ticket.supervisor_notes.length > 0 && (
                      <div>
                        <h4 className="font-medium dark:text-white mb-2">Supervisor Notes</h4>
                        <ul className="space-y-2">
                          {ticket.supervisor_notes.map((note, i) => (
                            <li key={i} className="text-sm bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-blue-700 dark:text-blue-300">
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Ticket Review Modal */}
      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={`Review: ${selectedTicket?.id}`}
        size="xl"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket header */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  PRIORITY_CONFIG[selectedTicket.priority]?.bgColor
                } ${PRIORITY_CONFIG[selectedTicket.priority]?.color}`}>
                  {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-slate-700">
                  {CATEGORY_CONFIG[selectedTicket.category]?.icon}
                  {CATEGORY_CONFIG[selectedTicket.category]?.label}
                </span>
              </div>
              <h3 className="font-semibold dark:text-white text-lg">{selectedTicket.subject}</h3>
              <p className="text-gray-600 dark:text-slate-400 mt-2">{selectedTicket.description}</p>
            </div>

            {/* Escalation info */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle size={16} />
                Escalation Details
              </h4>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-2">
                {selectedTicket.escalation_reason}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-amber-600 dark:text-amber-400">
                <span>Escalated by: {selectedTicket.original_agent_name}</span>
                <span>•</span>
                <span>{formatTimeAgo(selectedTicket.escalated_at || selectedTicket.created_at)}</span>
              </div>
            </div>

            {/* Conversation history */}
            <div>
              <h4 className="font-medium dark:text-white mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Conversation History
              </h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedTicket.messages?.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.sender_type === 'support'
                        ? 'bg-blue-50 dark:bg-blue-900/20 ml-4'
                        : 'bg-gray-100 dark:bg-slate-800 mr-4'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        msg.sender_type === 'support' 
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-slate-400'
                      }`}>
                        {msg.sender_type === 'support' ? 'Support Agent' : 
                         msg.sender_type === 'driver' ? 'Driver' : 'Client'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm dark:text-white">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Supervisor notes */}
            <div>
              <h4 className="font-medium dark:text-white mb-3">Internal Notes</h4>
              {selectedTicket.supervisor_notes && selectedTicket.supervisor_notes.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {selectedTicket.supervisor_notes.map((note, i) => (
                    <li key={i} className="text-sm bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-blue-700 dark:text-blue-300 flex items-start gap-2">
                      <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add internal note..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <Button onClick={handleAddNote} disabled={!internalNote.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setResolutionAction('return_to_agent');
                  setShowResolutionModal(true);
                }}
              >
                <ArrowRight size={16} />
                Return to Agent
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setResolutionAction('approve_agent_action');
                  setShowResolutionModal(true);
                }}
              >
                <UserCheck size={16} />
                Approve Agent Action
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setResolutionAction('resolve_directly');
                  setShowResolutionModal(true);
                }}
              >
                <CheckCircle size={16} />
                Resolve Directly
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setResolutionAction('escalate_to_admin');
                  setShowResolutionModal(true);
                }}
              >
                <Flag size={16} />
                Escalate to Admin
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Resolution Modal */}
      <Modal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        title="Resolution Details"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Resolution Action
            </label>
            <select
              value={resolutionAction}
              onChange={(e) => setResolutionAction(e.target.value as ResolutionAction)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="approve_agent_action">Approve Agent's Recommended Action</option>
              <option value="override_agent_action">Override Agent Decision</option>
              <option value="return_to_agent">Return to Original Agent</option>
              <option value="reassign_to_agent">Reassign to Different Agent</option>
              <option value="resolve_directly">Resolve Directly</option>
              <option value="escalate_to_admin">Escalate to Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Resolution Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Provide details about the resolution..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowResolutionModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleResolve}
              disabled={!resolutionNotes.trim()}
            >
              Confirm Resolution
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
