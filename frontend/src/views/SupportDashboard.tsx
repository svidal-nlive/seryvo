import { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Filter,
  User,
  Car,
  MessageCircle,
  Plus,
  Ban,
  CreditCard,
  DollarSign,
  Calendar,
  Tag,
  X,
  Users,
  History,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { SkeletonCard, SkeletonCardGrid, SkeletonText } from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';
import { UserTripLookup, TripTimelineView } from '../components/support';
import { useAuth } from '../contexts/AuthContext';
import { backend } from '../services/backend';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory, Booking } from '../types';

// Cancellation reasons for support
const CANCELLATION_REASONS = [
  { id: 'client_request', label: 'Client requested cancellation' },
  { id: 'driver_unavailable', label: 'No driver available' },
  { id: 'safety_concern', label: 'Safety concern' },
  { id: 'fraudulent_booking', label: 'Fraudulent booking' },
  { id: 'duplicate_booking', label: 'Duplicate booking' },
  { id: 'technical_issue', label: 'Technical issue' },
  { id: 'other', label: 'Other reason' },
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-blue-500', icon: <AlertCircle size={14} /> },
  in_progress: { label: 'In Progress', color: 'bg-amber-500', icon: <Clock size={14} /> },
  waiting_on_client: { label: 'Waiting on Client', color: 'bg-purple-500', icon: <User size={14} /> },
  waiting_on_driver: { label: 'Waiting on Driver', color: 'bg-purple-500', icon: <Car size={14} /> },
  resolved: { label: 'Resolved', color: 'bg-green-500', icon: <CheckCircle size={14} /> },
  closed: { label: 'Closed', color: 'bg-gray-500', icon: <XCircle size={14} /> },
  escalated: { label: 'Escalated', color: 'bg-red-500', icon: <AlertCircle size={14} /> },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-400' },
  medium: { label: 'Medium', color: 'bg-blue-400' },
  high: { label: 'High', color: 'bg-amber-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  trip_issue: 'Trip Issue',
  account_issue: 'Account Issue',
  payment_dispute: 'Payment Dispute',
  safety_incident: 'Safety Incident',
  other: 'Other',
};

export default function SupportDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newNote, setNewNote] = useState('');

  // Cancel booking modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Credit/Refund modal
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditClientId, setCreditClientId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  // User/Trip Lookup modal
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [selectedBookingForTimeline, setSelectedBookingForTimeline] = useState<Booking | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [creditApplied, setCreditApplied] = useState(false);

  // Chat panel state
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [ticketMessages, setTicketMessages] = useState<Array<{
    id: string;
    sender_id: string;
    sender_name: string;
    sender_role: 'client' | 'driver' | 'support';
    content: string;
    created_at: string;
  }>>([]);

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    setLoading(true);
    const data = await backend.getTickets(
      statusFilter !== 'all' ? { status: statusFilter } : undefined
    );
    setTickets(data);
    setLoading(false);
  };

  const handleClaimTicket = async (ticket: SupportTicket) => {
    if (!user) return;
    await backend.updateTicketStatus(ticket.ticket_id, 'in_progress', user.id);
    loadTickets();
    if (selectedTicket?.ticket_id === ticket.ticket_id) {
      const updated = await backend.getTicketById(ticket.ticket_id);
      if (updated) setSelectedTicket(updated);
    }
  };

  const handleStatusChange = async (ticket: SupportTicket, newStatus: TicketStatus) => {
    await backend.updateTicketStatus(ticket.ticket_id, newStatus);
    loadTickets();
    if (selectedTicket?.ticket_id === ticket.ticket_id) {
      const updated = await backend.getTicketById(ticket.ticket_id);
      if (updated) setSelectedTicket(updated);
    }
  };

  const handleAddNote = async () => {
    if (!selectedTicket || !newNote.trim()) return;
    await backend.addTicketNote(selectedTicket.ticket_id, newNote);
    const updated = await backend.getTicketById(selectedTicket.ticket_id);
    if (updated) setSelectedTicket(updated);
    setNewNote('');
  };

  // Load mock messages for a ticket (simulating chat history)
  const loadTicketMessages = async (ticket: SupportTicket) => {
    // Simulate loading messages - in real app this would fetch from backend
    const mockMessages = [
      {
        id: 'msg-1',
        sender_id: ticket.client_id || 'unknown',
        sender_name: 'Customer',
        sender_role: 'client' as const,
        content: ticket.public_description || 'I need help with my booking.',
        created_at: ticket.created_at,
      },
    ];
    setTicketMessages(mockMessages);
  };

  // Handle opening chat panel
  const handleOpenChat = async (ticket: SupportTicket) => {
    setShowChatPanel(true);
    await loadTicketMessages(ticket);
  };

  // Handle sending chat message
  const handleSendChatMessage = async () => {
    if (!selectedTicket || !chatMessage.trim() || !user) return;
    
    setSendingMessage(true);
    try {
      // Send message to backend
      await backend.sendTicketMessage(selectedTicket.ticket_id, chatMessage.trim());
      
      // Create new message for local display
      const newMsg = {
        id: `msg-${Date.now()}`,
        sender_id: user.id,
        sender_name: user.full_name,
        sender_role: 'support' as const,
        content: chatMessage.trim(),
        created_at: new Date().toISOString(),
      };
      
      setTicketMessages(prev => [...prev, newMsg]);
      setChatMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    // Text search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      const matchesSearch = (
        t.subject.toLowerCase().includes(searchLower) ||
        t.ticket_id.toLowerCase().includes(searchLower) ||
        t.public_description?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    
    // Priority filter
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    
    // Assignee filter
    if (assigneeFilter === 'mine' && t.assignee_id !== user?.id) return false;
    if (assigneeFilter === 'unassigned' && t.assignee_id) return false;
    
    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      const ticketDate = new Date(t.created_at);
      if (ticketDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      const ticketDate = new Date(t.created_at);
      if (ticketDate > toDate) return false;
    }
    
    return true;
  });
  
  const activeFiltersCount = [
    priorityFilter !== 'all',
    categoryFilter !== 'all',
    assigneeFilter !== 'all',
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length;
  
  const clearAllFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setAssigneeFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const myTickets = tickets.filter((t) => t.assignee_id === user?.id).length;

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingId.trim() || !cancelReason) return;
    setCancelling(true);
    try {
      await backend.updateBookingStatus(
        cancelBookingId, 
        'canceled_by_system',
        user?.id,
        'support_agent'
      );
      setCancelSuccess(true);
      // Reset after showing success
      setTimeout(() => {
        setShowCancelModal(false);
        setCancelBookingId('');
        setCancelReason('');
        setCancelNote('');
        setCancelSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    }
    setCancelling(false);
  };

  const handleApplyCredit = async () => {
    if (!creditClientId.trim() || !creditAmount || !creditReason.trim()) return;
    // In a real app, this would call an API to apply credit
    setCreditApplied(true);
    setTimeout(() => {
      setShowCreditModal(false);
      setCreditClientId('');
      setCreditAmount('');
      setCreditReason('');
      setCreditApplied(false);
    }, 2000);
  };

  const handleSelectBookingForTimeline = (booking: Booking) => {
    setSelectedBookingForTimeline(booking);
    setShowLookupModal(false);
    setShowTimelineModal(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="text-center p-3 sm:p-4">
          <p className="text-xl sm:text-3xl font-bold text-blue-600">{openCount}</p>
          <p className="text-[10px] sm:text-sm text-gray-500">Open</p>
        </Card>
        <Card className="text-center p-3 sm:p-4">
          <p className="text-xl sm:text-3xl font-bold text-amber-600">{inProgressCount}</p>
          <p className="text-[10px] sm:text-sm text-gray-500">In Progress</p>
        </Card>
        <Card className="text-center p-3 sm:p-4">
          <p className="text-xl sm:text-3xl font-bold text-green-600">{myTickets}</p>
          <p className="text-[10px] sm:text-sm text-gray-500">My Tickets</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <Button 
          variant="secondary" 
          onClick={() => setShowLookupModal(true)}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-sm"
        >
          <Users size={16} /> <span className="sm:inline">User/Trip Lookup</span>
        </Button>
        <Button 
          variant="danger" 
          onClick={() => setShowCancelModal(true)}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-sm"
        >
          <Ban size={16} /> <span className="sm:inline">Cancel Booking</span>
        </Button>
        <Button 
          variant="secondary" 
          onClick={() => setShowCreditModal(true)}
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-sm"
        >
          <CreditCard size={16} /> <span className="hidden xs:inline">Apply</span> Credit/Refund
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-[18px] sm:h-[18px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[44px] sm:min-h-0"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(!showFilters)}
              className="relative flex-1 sm:flex-none min-h-[44px] sm:min-h-0 text-sm"
            >
              <Filter size={16} /> <span className="hidden xs:inline">Filter</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            <Button variant="secondary" className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 text-sm">
              <Plus size={16} /> <span className="hidden xs:inline">New</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Filter Pills */}
      {showFilters && (
        <Card className="space-y-3 sm:space-y-4 p-3 sm:p-4">
          {/* Active Filters Count & Clear */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-gray-200 dark:border-slate-700">
              <span className="text-xs sm:text-sm text-gray-500">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
              </span>
              <button
                onClick={clearAllFilters}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 min-h-[36px] sm:min-h-0 touch-manipulation"
              >
                <X size={14} /> Clear
              </button>
            </div>
          )}
          
          {/* Status Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all min-h-[32px] sm:min-h-0 touch-manipulation ${
                  statusFilter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 min-h-[32px] sm:min-h-0 touch-manipulation ${
                    statusFilter === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {STATUS_CONFIG[status].icon} <span className="hidden xs:inline">{STATUS_CONFIG[status].label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Priority Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
              Priority
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setPriorityFilter('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all min-h-[32px] sm:min-h-0 touch-manipulation ${
                  priorityFilter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setPriorityFilter(priority)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 min-h-[32px] sm:min-h-0 touch-manipulation ${
                    priorityFilter === priority
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[priority].color}`} />
                  {PRIORITY_CONFIG[priority].label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Category Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all min-h-[32px] sm:min-h-0 touch-manipulation ${
                  categoryFilter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all min-h-[32px] sm:min-h-0 touch-manipulation ${
                    categoryFilter === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Assignee Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
              Assignee
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                onClick={() => setAssigneeFilter('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all min-h-[32px] sm:min-h-0 touch-manipulation ${
                  assigneeFilter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAssigneeFilter('mine')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all flex items-center gap-1 min-h-[32px] sm:min-h-0 touch-manipulation ${
                  assigneeFilter === 'mine'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <User size={12} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">My</span> Tickets
              </button>
              <button
                onClick={() => setAssigneeFilter('unassigned')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-medium transition-all min-h-[32px] sm:min-h-0 touch-manipulation ${
                  assigneeFilter === 'unassigned'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
                <Calendar size={12} className="inline mr-1 sm:w-3.5 sm:h-3.5" /> From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm min-h-[44px] sm:min-h-0"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">
                <Calendar size={12} className="inline mr-1 sm:w-3.5 sm:h-3.5" /> To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Ticket List */}
      <section aria-labelledby="tickets-heading">
        <h2 id="tickets-heading" className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Tickets</h2>
        {loading ? (
          <div role="status" aria-busy="true" aria-label="Loading tickets">
            <div className="space-y-2 sm:space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <SkeletonText lines={1} className="w-24" />
                        <SkeletonText lines={1} className="w-16" />
                        <SkeletonText lines={1} className="w-20" />
                      </div>
                      <SkeletonText lines={1} className="w-3/4 mb-1" />
                      <SkeletonText lines={1} className="w-1/2" />
                    </div>
                    <SkeletonText lines={1} className="w-16" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            type="noTickets"
            title="No tickets found"
            description={search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo
              ? "Try adjusting your filters or search query"
              : "All caught up! No support tickets at the moment."}
            action={search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo ? {
              label: "Clear filters",
              onClick: () => {
                setSearch('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setDateFrom('');
                setDateTo('');
              }
            } : undefined}
          />
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredTickets.map((ticket) => (
              <Card
                key={ticket.ticket_id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors p-3 sm:p-4 touch-manipulation"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[ticket.status].color}`}
                      />
                      <span className="text-[10px] sm:text-xs text-gray-400 font-mono truncate max-w-[80px] sm:max-w-none">{ticket.ticket_id}</span>
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium text-white ${PRIORITY_CONFIG[ticket.priority].color}`}
                      >
                        {PRIORITY_CONFIG[ticket.priority].label}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400 hidden xs:inline">
                        {CATEGORY_LABELS[ticket.category]}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-medium dark:text-white truncate">{ticket.subject}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 truncate hidden xs:block">
                      {ticket.public_description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] sm:text-xs text-gray-400">{formatTime(ticket.updated_at)}</span>
                    <ChevronRight size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject}
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium text-white flex items-center gap-1 ${STATUS_CONFIG[selectedTicket.status].color}`}
              >
                {STATUS_CONFIG[selectedTicket.status].icon}
                {STATUS_CONFIG[selectedTicket.status].label}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium text-white ${PRIORITY_CONFIG[selectedTicket.priority].color}`}
              >
                {PRIORITY_CONFIG[selectedTicket.priority].label}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 dark:bg-slate-700">
                {CATEGORY_LABELS[selectedTicket.category]}
              </span>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</h4>
              <p className="text-sm dark:text-white">{selectedTicket.public_description}</p>
            </div>

            {/* Related Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Ticket ID</p>
                <p className="font-mono dark:text-white">{selectedTicket.ticket_id}</p>
              </div>
              {selectedTicket.booking_id && (
                <div>
                  <p className="text-gray-400">Booking ID</p>
                  <p className="font-mono dark:text-white">{selectedTicket.booking_id}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400">Created</p>
                <p className="dark:text-white">
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Last Updated</p>
                <p className="dark:text-white">
                  {new Date(selectedTicket.updated_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Internal Notes */}
            {selectedTicket.internal_notes && selectedTicket.internal_notes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Internal Notes
                </h4>
                <div className="space-y-2">
                  {selectedTicket.internal_notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-sm"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Note */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Note</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Internal note..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
              {!selectedTicket.assignee_id && (
                <Button onClick={() => handleClaimTicket(selectedTicket)}>Claim Ticket</Button>
              )}
              {selectedTicket.status === 'open' && (
                <Button
                  variant="secondary"
                  onClick={() => handleStatusChange(selectedTicket, 'in_progress')}
                >
                  Start Working
                </Button>
              )}
              {selectedTicket.status === 'in_progress' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handleStatusChange(selectedTicket, 'waiting_on_client')}
                  >
                    Wait on Client
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleStatusChange(selectedTicket, 'resolved')}
                  >
                    Resolve
                  </Button>
                </>
              )}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <Button
                  variant="danger"
                  onClick={() => handleStatusChange(selectedTicket, 'escalated')}
                >
                  Escalate
                </Button>
              )}
              <Button 
                variant="secondary"
                onClick={() => handleOpenChat(selectedTicket)}
              >
                <MessageCircle size={16} /> {showChatPanel ? 'Hide Chat' : 'Open Chat'}
              </Button>
            </div>

            {/* Chat Panel */}
            {showChatPanel && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium dark:text-white flex items-center gap-2">
                    <MessageCircle size={18} /> Customer Chat
                  </h4>
                  <button
                    onClick={() => setShowChatPanel(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <ChevronUp size={20} />
                  </button>
                </div>
                
                {/* Messages */}
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto mb-3 space-y-3">
                  {ticketMessages.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
                  ) : (
                    ticketMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_role === 'support' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            msg.sender_role === 'support'
                              ? 'bg-blue-500 text-white'
                              : msg.sender_role === 'driver'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100'
                              : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="text-xs font-medium opacity-75 mb-1">
                            {msg.sender_name}
                          </p>
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Send Message */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    disabled={sendingMessage}
                  />
                  <Button
                    onClick={handleSendChatMessage}
                    disabled={!chatMessage.trim() || sendingMessage}
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setCancelSuccess(false); }}
        title="Cancel Booking"
        size="md"
      >
        {cancelSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold dark:text-white mb-2">Booking Cancelled</h3>
            <p className="text-gray-500">The booking has been successfully cancelled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                Booking ID
              </label>
              <input
                type="text"
                value={cancelBookingId}
                onChange={(e) => setCancelBookingId(e.target.value)}
                placeholder="Enter booking ID"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2 block">
                Cancellation Reason
              </label>
              <div className="space-y-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <label
                    key={reason.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      cancelReason === reason.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason.id}
                      checked={cancelReason === reason.id}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm dark:text-white">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {cancelReason === 'other' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                  Additional Notes
                </label>
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="Describe the reason..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 resize-none"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setShowCancelModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelBooking}
                disabled={!cancelBookingId.trim() || !cancelReason || cancelling}
                className="flex-1"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Credit/Refund Modal */}
      <Modal
        isOpen={showCreditModal}
        onClose={() => { setShowCreditModal(false); setCreditApplied(false); }}
        title="Apply Credit or Refund"
        size="md"
      >
        {creditApplied ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold dark:text-white mb-2">Credit Applied</h3>
            <p className="text-gray-500">The credit has been applied to the client's account.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                Client ID or Email
              </label>
              <input
                type="text"
                value={creditClientId}
                onChange={(e) => setCreditClientId(e.target.value)}
                placeholder="Enter client ID or email"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                Amount (USD)
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                Reason for Credit/Refund
              </label>
              <textarea
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Describe why this credit is being applied..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 resize-none"
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle size={14} className="inline mr-1" />
                Credits are applied immediately and cannot be automatically reversed.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setShowCreditModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleApplyCredit}
                disabled={!creditClientId.trim() || !creditAmount || !creditReason.trim()}
                className="flex-1"
              >
                Apply Credit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* User/Trip Lookup Modal */}
      <Modal
        isOpen={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        title="User & Trip Lookup"
        size="lg"
      >
        <UserTripLookup
          onSelectBooking={handleSelectBookingForTimeline}
          className="p-4"
        />
      </Modal>

      {/* Trip Timeline Modal */}
      <Modal
        isOpen={showTimelineModal}
        onClose={() => {
          setShowTimelineModal(false);
          setSelectedBookingForTimeline(null);
        }}
        title="Trip Timeline"
        size="lg"
      >
        {selectedBookingForTimeline && (
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <TripTimelineView booking={selectedBookingForTimeline} />
          </div>
        )}
      </Modal>
    </div>
  );
}
