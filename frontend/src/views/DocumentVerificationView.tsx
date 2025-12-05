import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Check, 
  X, 
  Eye, 
  Download, 
  AlertTriangle,
  Clock,
  Filter,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { backend } from '../services/backend';
import type { DriverDocument, DocumentStatus, DocumentType } from '../types';

const statusConfig: Record<DocumentStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'neutral' | 'info' }> = {
  not_uploaded: { label: 'Not Uploaded', variant: 'neutral' },
  pending_review: { label: 'Pending Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  expired: { label: 'Expired', variant: 'info' },
};

const documentTypeLabels: Record<DocumentType, string> = {
  drivers_license: "Driver's License",
  vehicle_registration: 'Vehicle Registration',
  insurance: 'Proof of Insurance',
  background_check: 'Background Check',
  vehicle_photo_front: 'Vehicle Photo (Front)',
  vehicle_photo_back: 'Vehicle Photo (Back)',
  vehicle_photo_interior: 'Vehicle Photo (Interior)',
  profile_photo: 'Profile Photo',
};

export default function DocumentVerificationView() {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('pending_review');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<DriverDocument | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const allDocs = await backend.getAllDriverDocuments();
      setDocuments(allDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doc: DriverDocument) => {
    setProcessing(true);
    try {
      await backend.updateDocumentStatus(doc.id, 'approved', 'a-001');
      loadDocuments();
      setSelectedDocument(null);
    } catch (error) {
      console.error('Failed to approve document:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDocument || !rejectionReason.trim()) return;
    
    setProcessing(true);
    try {
      await backend.updateDocumentStatus(selectedDocument.id, 'rejected', 'a-001', rejectionReason);
      loadDocuments();
      setShowRejectModal(false);
      setSelectedDocument(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject document:', error);
    } finally {
      setProcessing(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        doc.driver_id.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const pendingCount = documents.filter(d => d.status === 'pending_review').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Document Verification</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review and approve driver documents
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'pending_review' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setStatusFilter('pending_review')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white">{pendingCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Pending</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white">{approvedCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Approved</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white">{rejectedCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Rejected</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by driver ID or document type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="all">All Status</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </Card>

      {/* Documents Table */}
      <Card>
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-slate-400">No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Driver</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Document Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Uploaded</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm dark:text-white">{doc.driver_id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="dark:text-white">{documentTypeLabels[doc.type] || doc.type}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(doc.uploaded_at)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {doc.expiry_date ? (
                        <span className={new Date(doc.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-500 dark:text-slate-400'}>
                          {new Date(doc.expiry_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusConfig[doc.status].variant}>
                        {statusConfig[doc.status].label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
                          title="View Document"
                        >
                          <Eye size={16} />
                        </button>
                        {doc.status === 'pending_review' && (
                          <>
                            <button
                              onClick={() => handleApprove(doc)}
                              className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowRejectModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Document Preview Modal */}
      {selectedDocument && !showRejectModal && (
        <Modal
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          title="Document Details"
        >
          <div className="space-y-4">
            {/* Document Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase">Document Type</p>
                <p className="font-medium dark:text-white">
                  {documentTypeLabels[selectedDocument.type] || selectedDocument.type}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Status</p>
                <Badge variant={statusConfig[selectedDocument.status].variant}>
                  {statusConfig[selectedDocument.status].label}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Driver ID</p>
                <p className="font-mono text-sm dark:text-white">{selectedDocument.driver_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Uploaded</p>
                <p className="text-sm dark:text-white">
                  {formatDateTime(selectedDocument.uploaded_at)}
                </p>
              </div>
              {selectedDocument.expiry_date && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Expiry Date</p>
                  <p className={`text-sm ${new Date(selectedDocument.expiry_date) < new Date() ? 'text-red-600' : 'dark:text-white'}`}>
                    {new Date(selectedDocument.expiry_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Document Preview */}
            <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4">
              {selectedDocument.file_url ? (
                selectedDocument.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img 
                    src={selectedDocument.file_url} 
                    alt="Document preview" 
                    className="max-w-full max-h-64 mx-auto rounded"
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText size={48} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Document preview not available
                    </p>
                    <a 
                      href={selectedDocument.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                    >
                      Open in new tab
                    </a>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No file uploaded
                  </p>
                </div>
              )}
            </div>

            {/* Rejection Reason */}
            {selectedDocument.status === 'rejected' && selectedDocument.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-xs text-red-600 uppercase font-semibold mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700 dark:text-red-300">{selectedDocument.rejection_reason}</p>
              </div>
            )}

            {/* Review Info */}
            {selectedDocument.reviewed_at && (
              <div className="text-sm text-gray-500 dark:text-slate-400">
                Reviewed on {formatDateTime(selectedDocument.reviewed_at)}
              </div>
            )}

            {/* Actions */}
            {selectedDocument.status === 'pending_review' && (
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1"
                >
                  <X size={16} /> Reject
                </Button>
                <Button
                  variant="success"
                  onClick={() => handleApprove(selectedDocument)}
                  disabled={processing}
                  className="flex-1"
                >
                  <Check size={16} /> {processing ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
        }}
        title="Reject Document"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertTriangle size={24} className="text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Please provide a reason for rejecting this document. The driver will be notified.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rejection Reason
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
              className="flex-1"
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
