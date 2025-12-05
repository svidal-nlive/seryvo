/**
 * Seryvo Platform - Incident Review System
 * Safety incident tracking, review workflow, and resolution for admin
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Shield,
  Search,
  Clock,
  User,
  Car,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Eye,
  Flag,
  MapPin,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { convertToCSV, downloadCSV } from '../utils/csvExport';

// =============================================================================
// Types
// =============================================================================

type IncidentType = 
  | 'safety_concern'
  | 'accident'
  | 'harassment'
  | 'theft'
  | 'property_damage'
  | 'medical_emergency'
  | 'policy_violation'
  | 'other';

type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'reported' | 'under_review' | 'investigating' | 'resolved' | 'escalated' | 'closed';

interface Incident {
  incident_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  booking_id?: string;
  reporter_id: string;
  reporter_name: string;
  reporter_role: 'client' | 'driver';
  subject_id?: string;
  subject_name?: string;
  subject_role?: 'client' | 'driver';
  title: string;
  description: string;
  location?: string;
  occurred_at: string;
  reported_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  resolution?: string;
  resolved_at?: string;
  notes: IncidentNote[];
  evidence: IncidentEvidence[];
  actions_taken: IncidentAction[];
}

interface IncidentNote {
  note_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  is_internal: boolean;
}

interface IncidentEvidence {
  evidence_id: string;
  type: 'photo' | 'audio' | 'document' | 'chat_log';
  filename: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface IncidentAction {
  action_id: string;
  action_type: 'warning_issued' | 'suspension' | 'ban' | 'refund' | 'credit' | 'investigation' | 'no_action';
  description: string;
  performed_by: string;
  performed_at: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_INCIDENTS: Incident[] = [
  {
    incident_id: 'inc-1',
    type: 'safety_concern',
    severity: 'high',
    status: 'under_review',
    booking_id: 'booking-123',
    reporter_id: 'client-1',
    reporter_name: 'Alice Client',
    reporter_role: 'client',
    subject_id: 'driver-1',
    subject_name: 'Bob Driver',
    subject_role: 'driver',
    title: 'Unsafe driving behavior reported',
    description: 'Driver was speeding and using phone while driving. Client felt unsafe during the trip.',
    location: 'Highway 101, San Francisco',
    occurred_at: '2024-12-01T14:30:00Z',
    reported_at: '2024-12-01T15:00:00Z',
    assigned_to: 'admin-1',
    assigned_to_name: 'Jane Admin',
    notes: [
      {
        note_id: 'note-1',
        author_id: 'admin-1',
        author_name: 'Jane Admin',
        content: 'Reviewing dashcam footage from the trip. Will contact driver for statement.',
        created_at: '2024-12-01T16:00:00Z',
        is_internal: true,
      },
    ],
    evidence: [
      {
        evidence_id: 'ev-1',
        type: 'chat_log',
        filename: 'chat-log-booking-123.pdf',
        uploaded_at: '2024-12-01T15:05:00Z',
        uploaded_by: 'system',
      },
    ],
    actions_taken: [],
  },
  {
    incident_id: 'inc-2',
    type: 'harassment',
    severity: 'critical',
    status: 'investigating',
    booking_id: 'booking-456',
    reporter_id: 'client-2',
    reporter_name: 'Carol User',
    reporter_role: 'client',
    subject_id: 'driver-2',
    subject_name: 'Dan Driver',
    subject_role: 'driver',
    title: 'Inappropriate comments from driver',
    description: 'Driver made several inappropriate personal comments during the ride.',
    location: 'Downtown, Seattle',
    occurred_at: '2024-11-30T22:15:00Z',
    reported_at: '2024-11-30T23:00:00Z',
    assigned_to: 'admin-2',
    assigned_to_name: 'Mike Admin',
    notes: [
      {
        note_id: 'note-2',
        author_id: 'admin-2',
        author_name: 'Mike Admin',
        content: 'Driver has been temporarily suspended pending investigation.',
        created_at: '2024-12-01T09:00:00Z',
        is_internal: true,
      },
      {
        note_id: 'note-3',
        author_id: 'admin-2',
        author_name: 'Mike Admin',
        content: 'Client provided additional details via email. Forwarded to legal team.',
        created_at: '2024-12-01T14:00:00Z',
        is_internal: true,
      },
    ],
    evidence: [],
    actions_taken: [
      {
        action_id: 'act-1',
        action_type: 'suspension',
        description: 'Driver suspended pending investigation',
        performed_by: 'Mike Admin',
        performed_at: '2024-12-01T09:00:00Z',
      },
    ],
  },
  {
    incident_id: 'inc-3',
    type: 'accident',
    severity: 'medium',
    status: 'resolved',
    booking_id: 'booking-789',
    reporter_id: 'driver-3',
    reporter_name: 'Eve Driver',
    reporter_role: 'driver',
    title: 'Minor fender bender during pickup',
    description: 'Another vehicle backed into my car while waiting at pickup location. Minor damage to rear bumper.',
    location: '456 Oak Street, Portland',
    occurred_at: '2024-11-28T11:45:00Z',
    reported_at: '2024-11-28T12:00:00Z',
    assigned_to: 'admin-1',
    assigned_to_name: 'Jane Admin',
    resolution: 'Insurance claim filed. Driver cleared to continue operations. Damage documented.',
    resolved_at: '2024-11-30T10:00:00Z',
    notes: [],
    evidence: [
      {
        evidence_id: 'ev-2',
        type: 'photo',
        filename: 'damage-photo-1.jpg',
        uploaded_at: '2024-11-28T12:05:00Z',
        uploaded_by: 'driver-3',
      },
      {
        evidence_id: 'ev-3',
        type: 'photo',
        filename: 'damage-photo-2.jpg',
        uploaded_at: '2024-11-28T12:06:00Z',
        uploaded_by: 'driver-3',
      },
    ],
    actions_taken: [
      {
        action_id: 'act-2',
        action_type: 'no_action',
        description: 'Driver not at fault. Insurance handling claim.',
        performed_by: 'Jane Admin',
        performed_at: '2024-11-30T10:00:00Z',
      },
    ],
  },
  {
    incident_id: 'inc-4',
    type: 'policy_violation',
    severity: 'low',
    status: 'closed',
    reporter_id: 'system',
    reporter_name: 'System',
    reporter_role: 'driver',
    subject_id: 'driver-4',
    subject_name: 'Frank Driver',
    subject_role: 'driver',
    title: 'Multiple trip cancellations',
    description: 'Driver cancelled 5 trips in 24 hours, exceeding allowed threshold.',
    occurred_at: '2024-11-25T18:00:00Z',
    reported_at: '2024-11-25T18:00:00Z',
    assigned_to: 'admin-1',
    assigned_to_name: 'Jane Admin',
    resolution: 'Warning issued. Driver acknowledged and committed to improvement.',
    resolved_at: '2024-11-26T09:00:00Z',
    notes: [],
    evidence: [],
    actions_taken: [
      {
        action_id: 'act-3',
        action_type: 'warning_issued',
        description: 'Written warning for excessive cancellations',
        performed_by: 'Jane Admin',
        performed_at: '2024-11-26T09:00:00Z',
      },
    ],
  },
];

const INCIDENT_TYPE_CONFIG: Record<IncidentType, { label: string; color: string; bgColor: string }> = {
  safety_concern: { label: 'Safety Concern', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  accident: { label: 'Accident', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  harassment: { label: 'Harassment', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  theft: { label: 'Theft', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  property_damage: { label: 'Property Damage', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  medical_emergency: { label: 'Medical Emergency', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  policy_violation: { label: 'Policy Violation', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  other: { label: 'Other', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  medium: { label: 'Medium', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; bgColor: string; icon: typeof AlertCircle }> = {
  reported: { label: 'Reported', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: AlertCircle },
  under_review: { label: 'Under Review', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: Eye },
  investigating: { label: 'Investigating', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Search },
  resolved: { label: 'Resolved', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle },
  escalated: { label: 'Escalated', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: Flag },
  closed: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700', icon: XCircle },
};

// =============================================================================
// Component
// =============================================================================

export default function IncidentReviewSystem() {
  // Start with empty array - data populates when demo data is loaded
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<IncidentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<IncidentSeverity | 'all'>('all');
  const [newNote, setNewNote] = useState('');
  const [selectedAction, setSelectedAction] = useState<IncidentAction['action_type']>('investigation');
  const [actionDescription, setActionDescription] = useState('');

  // Stats
  const stats = useMemo(() => {
    return {
      total: incidents.length,
      open: incidents.filter(i => ['reported', 'under_review', 'investigating'].includes(i.status)).length,
      critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'closed' && i.status !== 'resolved').length,
      resolvedThisWeek: incidents.filter(i => {
        if (!i.resolved_at) return false;
        const resolved = new Date(i.resolved_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return resolved >= weekAgo;
      }).length,
    };
  }, [incidents]);

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      if (filterType !== 'all' && incident.type !== filterType) return false;
      if (filterStatus !== 'all' && incident.status !== filterStatus) return false;
      if (filterSeverity !== 'all' && incident.severity !== filterSeverity) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          incident.title.toLowerCase().includes(query) ||
          incident.description.toLowerCase().includes(query) ||
          incident.reporter_name.toLowerCase().includes(query) ||
          incident.subject_name?.toLowerCase().includes(query) ||
          incident.incident_id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [incidents, filterType, filterStatus, filterSeverity, searchQuery]);

  // Format dates
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
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

  // Time ago
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(iso);
  };

  // Update incident status
  const updateStatus = (incidentId: string, newStatus: IncidentStatus) => {
    setIncidents(incidents.map(inc => 
      inc.incident_id === incidentId
        ? { 
            ...inc, 
            status: newStatus,
            resolved_at: ['resolved', 'closed'].includes(newStatus) ? new Date().toISOString() : inc.resolved_at
          }
        : inc
    ));
    if (selectedIncident?.incident_id === incidentId) {
      setSelectedIncident({
        ...selectedIncident,
        status: newStatus,
        resolved_at: ['resolved', 'closed'].includes(newStatus) ? new Date().toISOString() : selectedIncident.resolved_at
      });
    }
  };

  // Add note
  const addNote = () => {
    if (!selectedIncident || !newNote.trim()) return;
    
    const note: IncidentNote = {
      note_id: `note-${Date.now()}`,
      author_id: 'admin-current',
      author_name: 'Current Admin',
      content: newNote,
      created_at: new Date().toISOString(),
      is_internal: true,
    };

    const updated = {
      ...selectedIncident,
      notes: [...selectedIncident.notes, note],
    };

    setIncidents(incidents.map(inc => 
      inc.incident_id === selectedIncident.incident_id ? updated : inc
    ));
    setSelectedIncident(updated);
    setNewNote('');
  };

  // Take action
  const takeAction = () => {
    if (!selectedIncident || !actionDescription.trim()) return;

    const action: IncidentAction = {
      action_id: `act-${Date.now()}`,
      action_type: selectedAction,
      description: actionDescription,
      performed_by: 'Current Admin',
      performed_at: new Date().toISOString(),
    };

    const updated = {
      ...selectedIncident,
      actions_taken: [...selectedIncident.actions_taken, action],
    };

    setIncidents(incidents.map(inc => 
      inc.incident_id === selectedIncident.incident_id ? updated : inc
    ));
    setSelectedIncident(updated);
    setShowActionModal(false);
    setActionDescription('');
  };

  // Export
  const handleExport = () => {
    const data = filteredIncidents.map(inc => ({
      incident_id: inc.incident_id,
      type: INCIDENT_TYPE_CONFIG[inc.type].label,
      severity: SEVERITY_CONFIG[inc.severity].label,
      status: STATUS_CONFIG[inc.status].label,
      title: inc.title,
      reporter: inc.reporter_name,
      subject: inc.subject_name || 'N/A',
      occurred_at: formatDateTime(inc.occurred_at),
      reported_at: formatDateTime(inc.reported_at),
      resolved_at: inc.resolved_at ? formatDateTime(inc.resolved_at) : 'Pending',
    }));

    const columns = [
      { key: 'incident_id', header: 'ID' },
      { key: 'type', header: 'Type' },
      { key: 'severity', header: 'Severity' },
      { key: 'status', header: 'Status' },
      { key: 'title', header: 'Title' },
      { key: 'reporter', header: 'Reporter' },
      { key: 'subject', header: 'Subject' },
      { key: 'occurred_at', header: 'Occurred' },
      { key: 'reported_at', header: 'Reported' },
      { key: 'resolved_at', header: 'Resolved' },
    ];

    const csvContent = convertToCSV(data, columns);
    downloadCSV(csvContent, `incidents-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-500" />
            Incident Review System
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track, investigate, and resolve safety incidents
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Incidents</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.open}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open Cases</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Flag className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.critical}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical Active</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolvedThisWeek}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolved This Week</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search incidents..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as IncidentType | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            {Object.entries(INCIDENT_TYPE_CONFIG).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as IncidentStatus | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as IncidentSeverity | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Severities</option>
            {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => (
              <option key={severity} value={severity}>{config.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No incidents found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          </Card>
        ) : (
          filteredIncidents.map((incident) => {
            const typeConfig = INCIDENT_TYPE_CONFIG[incident.type];
            const severityConfig = SEVERITY_CONFIG[incident.severity];
            const statusConfig = STATUS_CONFIG[incident.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={incident.incident_id}
                className="cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all"
                onClick={() => {
                  setSelectedIncident(incident);
                  setShowDetailModal(true);
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Indicator */}
                  <div className={`w-1 h-full min-h-[80px] rounded-full ${severityConfig.bgColor}`} />

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {incident.title}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${severityConfig.bgColor} ${severityConfig.color}`}>
                            {severityConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {incident.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-sm px-2 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {incident.reporter_name}
                      </span>
                      {incident.subject_name && (
                        <span className="flex items-center gap-1">
                          <Car className="w-4 h-4" />
                          {incident.subject_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {timeAgo(incident.reported_at)}
                      </span>
                      {incident.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {incident.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Incident Details"
        size="lg"
      >
        {selectedIncident && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm px-2 py-0.5 rounded-full ${INCIDENT_TYPE_CONFIG[selectedIncident.type].bgColor} ${INCIDENT_TYPE_CONFIG[selectedIncident.type].color}`}>
                  {INCIDENT_TYPE_CONFIG[selectedIncident.type].label}
                </span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${SEVERITY_CONFIG[selectedIncident.severity].bgColor} ${SEVERITY_CONFIG[selectedIncident.severity].color}`}>
                  {SEVERITY_CONFIG[selectedIncident.severity].label}
                </span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${STATUS_CONFIG[selectedIncident.status].bgColor} ${STATUS_CONFIG[selectedIncident.status].color}`}>
                  {STATUS_CONFIG[selectedIncident.status].label}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedIncident.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {selectedIncident.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Reporter</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedIncident.reporter_name} ({selectedIncident.reporter_role})
                </p>
              </div>
              {selectedIncident.subject_name && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Subject</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedIncident.subject_name} ({selectedIncident.subject_role})
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500 dark:text-gray-400">Occurred</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDateTime(selectedIncident.occurred_at)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Reported</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDateTime(selectedIncident.reported_at)}
                </p>
              </div>
              {selectedIncident.location && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Location</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedIncident.location}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Taken */}
            {selectedIncident.actions_taken.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Actions Taken</h3>
                <div className="space-y-2">
                  {selectedIncident.actions_taken.map(action => (
                    <div key={action.action_id} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {action.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {action.performed_by} • {formatDateTime(action.performed_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Internal Notes</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedIncident.notes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet</p>
                ) : (
                  selectedIncident.notes.map(note => (
                    <div key={note.note_id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {note.author_name} • {formatDateTime(note.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <Button variant="secondary" onClick={addNote} disabled={!newNote.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {/* Status Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              {selectedIncident.status === 'reported' && (
                <Button variant="secondary" onClick={() => updateStatus(selectedIncident.incident_id, 'under_review')}>
                  Start Review
                </Button>
              )}
              {selectedIncident.status === 'under_review' && (
                <Button variant="secondary" onClick={() => updateStatus(selectedIncident.incident_id, 'investigating')}>
                  Begin Investigation
                </Button>
              )}
              {['under_review', 'investigating'].includes(selectedIncident.status) && (
                <>
                  <Button variant="primary" onClick={() => setShowActionModal(true)}>
                    Take Action
                  </Button>
                  <Button variant="danger" onClick={() => updateStatus(selectedIncident.incident_id, 'escalated')}>
                    Escalate
                  </Button>
                </>
              )}
              {['investigating', 'escalated'].includes(selectedIncident.status) && (
                <Button variant="primary" onClick={() => updateStatus(selectedIncident.incident_id, 'resolved')}>
                  Mark Resolved
                </Button>
              )}
              {selectedIncident.status === 'resolved' && (
                <Button variant="secondary" onClick={() => updateStatus(selectedIncident.incident_id, 'closed')}>
                  Close Case
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title="Take Action"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action Type
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as IncidentAction['action_type'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="investigation">Investigation Completed</option>
              <option value="warning_issued">Warning Issued</option>
              <option value="suspension">Suspension</option>
              <option value="ban">Permanent Ban</option>
              <option value="refund">Refund Issued</option>
              <option value="credit">Credit Applied</option>
              <option value="no_action">No Action Required</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              placeholder="Describe the action taken..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowActionModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={takeAction} disabled={!actionDescription.trim()} className="flex-1">
              Record Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
