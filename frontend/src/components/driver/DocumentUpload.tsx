import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Check,
  X,
  Clock,
  AlertTriangle,
  Camera,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// ---- Types ----

export type DocumentType =
  | 'drivers_license'
  | 'vehicle_registration'
  | 'insurance'
  | 'profile_photo'
  | 'vehicle_photo_front'
  | 'vehicle_photo_back'
  | 'vehicle_photo_interior'
  | 'background_check';

export type DocumentStatus = 'not_uploaded' | 'pending_review' | 'approved' | 'rejected' | 'expired';

export interface DriverDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  file_name?: string;
  file_url?: string;
  uploaded_at?: string;
  reviewed_at?: string;
  expiry_date?: string;
  rejection_reason?: string;
}

interface DocumentUploadProps {
  documents: DriverDocument[];
  onUpload: (type: DocumentType, file: File) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  loading?: boolean;
}

// ---- Document Config ----

interface DocumentConfig {
  type: DocumentType;
  title: string;
  description: string;
  required: boolean;
  acceptedTypes: string;
  maxSizeMB: number;
  icon: React.ReactNode;
}

const DOCUMENT_CONFIGS: DocumentConfig[] = [
  {
    type: 'drivers_license',
    title: "Driver's License",
    description: 'Clear photo of front and back of your valid driver\'s license',
    required: true,
    acceptedTypes: 'image/jpeg,image/png,application/pdf',
    maxSizeMB: 10,
    icon: <FileText size={24} />,
  },
  {
    type: 'vehicle_registration',
    title: 'Vehicle Registration',
    description: 'Current vehicle registration certificate',
    required: true,
    acceptedTypes: 'image/jpeg,image/png,application/pdf',
    maxSizeMB: 10,
    icon: <FileText size={24} />,
  },
  {
    type: 'insurance',
    title: 'Insurance Certificate',
    description: 'Valid commercial or rideshare insurance document',
    required: true,
    acceptedTypes: 'image/jpeg,image/png,application/pdf',
    maxSizeMB: 10,
    icon: <FileText size={24} />,
  },
  {
    type: 'profile_photo',
    title: 'Profile Photo',
    description: 'Clear, recent photo of your face for passenger identification',
    required: true,
    acceptedTypes: 'image/jpeg,image/png',
    maxSizeMB: 5,
    icon: <Camera size={24} />,
  },
  {
    type: 'vehicle_photo_front',
    title: 'Vehicle Photo (Front)',
    description: 'Clear photo of your vehicle from the front',
    required: true,
    acceptedTypes: 'image/jpeg,image/png',
    maxSizeMB: 10,
    icon: <Camera size={24} />,
  },
  {
    type: 'vehicle_photo_back',
    title: 'Vehicle Photo (Back)',
    description: 'Clear photo of your vehicle from the back showing license plate',
    required: false,
    acceptedTypes: 'image/jpeg,image/png',
    maxSizeMB: 10,
    icon: <Camera size={24} />,
  },
  {
    type: 'vehicle_photo_interior',
    title: 'Vehicle Interior',
    description: 'Clean interior photo showing passenger area',
    required: false,
    acceptedTypes: 'image/jpeg,image/png',
    maxSizeMB: 10,
    icon: <Camera size={24} />,
  },
  {
    type: 'background_check',
    title: 'Background Check Consent',
    description: 'Signed consent form for background verification',
    required: true,
    acceptedTypes: 'application/pdf',
    maxSizeMB: 5,
    icon: <FileText size={24} />,
  },
];

// ---- Status Badge ----

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = {
    not_uploaded: { color: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400', icon: <Upload size={12} />, label: 'Not Uploaded' },
    pending_review: { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600', icon: <Clock size={12} />, label: 'Pending Review' },
    approved: { color: 'bg-green-100 dark:bg-green-900/30 text-green-600', icon: <Check size={12} />, label: 'Approved' },
    rejected: { color: 'bg-red-100 dark:bg-red-900/30 text-red-600', icon: <X size={12} />, label: 'Rejected' },
    expired: { color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600', icon: <AlertTriangle size={12} />, label: 'Expired' },
  };

  const { color, icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {icon} {label}
    </span>
  );
}

// ---- Document Card ----

interface DocumentCardProps {
  config: DocumentConfig;
  document?: DriverDocument;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onPreview: () => void;
  uploading: boolean;
}

function DocumentCard({ config, document, onUpload, onDelete, onPreview, uploading }: DocumentCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const status = document?.status ?? 'not_uploaded';
  const hasFile = status !== 'not_uploaded';
  const isRejected = status === 'rejected';
  const isExpired = status === 'expired';
  const needsAction = status === 'not_uploaded' || isRejected || isExpired;

  return (
    <Card className={`relative ${needsAction && config.required ? 'border-amber-300 dark:border-amber-700' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${hasFile ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium dark:text-white">{config.title}</h4>
            {config.required && <span className="text-xs text-red-500">*Required</span>}
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">{config.description}</p>

          {/* Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} />

            {document?.expiry_date && (
              <span className="text-xs text-gray-400">
                Expires: {new Date(document.expiry_date).toLocaleDateString()}
              </span>
            )}

            {document?.rejection_reason && (
              <span className="text-xs text-red-500">
                Reason: {document.rejection_reason}
              </span>
            )}
          </div>

          {/* File info */}
          {document?.file_name && (
            <p className="text-xs text-gray-400 mt-2 truncate">
              📎 {document.file_name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasFile && (
            <>
              <Button variant="ghost" onClick={onPreview} className="text-sm">
                <Eye size={16} />
              </Button>
              {(isRejected || isExpired) && (
                <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-sm">
                  <RefreshCw size={16} />
                </Button>
              )}
              <Button variant="ghost" onClick={onDelete} className="text-red-500 hover:text-red-600">
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      {!hasFile && (
        <div
          className={`mt-4 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-slate-700 hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={config.acceptedTypes}
            onChange={handleChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              Uploading...
            </div>
          ) : (
            <>
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Drag & drop or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max {config.maxSizeMB}MB • {config.acceptedTypes.split(',').map(t => t.split('/')[1].toUpperCase()).join(', ')}
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ---- Main Component ----

export default function DocumentUpload({ documents, onUpload, onDelete, loading = false }: DocumentUploadProps) {
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DriverDocument | null>(null);

  const handleUpload = async (type: DocumentType, file: File) => {
    setUploadingType(type);
    try {
      await onUpload(type, file);
    } finally {
      setUploadingType(null);
    }
  };

  const getDocumentByType = (type: DocumentType) => documents.find(d => d.type === type);

  // Calculate completion stats
  const requiredDocs = DOCUMENT_CONFIGS.filter(c => c.required);
  const uploadedRequired = requiredDocs.filter(c => {
    const doc = getDocumentByType(c.type);
    return doc && doc.status !== 'not_uploaded' && doc.status !== 'rejected';
  });
  const completionPercent = Math.round((uploadedRequired.length / requiredDocs.length) * 100);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold dark:text-white">Documents & Verification</h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Upload required documents to get verified and start accepting rides
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{completionPercent}%</div>
          <p className="text-xs text-gray-400">{uploadedRequired.length}/{requiredDocs.length} required</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            completionPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {DOCUMENT_CONFIGS.map((config) => {
          const doc = getDocumentByType(config.type);
          return (
            <DocumentCard
              key={config.type}
              config={config}
              document={doc}
              onUpload={(file) => handleUpload(config.type, file)}
              onDelete={() => doc && onDelete(doc.id)}
              onPreview={() => doc && setPreviewDoc(doc)}
              uploading={uploadingType === config.type}
            />
          );
        })}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? DOCUMENT_CONFIGS.find(c => c.type === previewDoc.type)?.title : 'Preview'}
      >
        {previewDoc && (
          <div className="space-y-4">
            {previewDoc.file_url ? (
              previewDoc.file_url.endsWith('.pdf') ? (
                <div className="text-center py-8 bg-gray-100 dark:bg-slate-800 rounded-lg">
                  <FileText size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">{previewDoc.file_name}</p>
                  <Button className="mt-4" onClick={() => window.open(previewDoc.file_url, '_blank')}>
                    Open PDF
                  </Button>
                </div>
              ) : (
                <img
                  src={previewDoc.file_url}
                  alt={previewDoc.file_name}
                  className="w-full rounded-lg"
                />
              )
            ) : (
              <div className="text-center py-8 text-gray-400">
                Preview not available
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
              <StatusBadge status={previewDoc.status} />
              <p className="text-sm text-gray-400">
                Uploaded: {previewDoc.uploaded_at ? new Date(previewDoc.uploaded_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
