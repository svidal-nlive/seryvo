import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DocumentUpload from '../components/driver/DocumentUpload';
import type { DriverDocument, DocumentType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { backend } from '../services/backend';
import * as driversApi from '../services/api/drivers';

interface DriverDocumentsViewProps {
  onBack?: () => void;
}

// Check if we're in demo mode (no real backend)
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';

export default function DriverDocumentsView({ onBack }: DriverDocumentsViewProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      if (USE_REAL_API) {
        // Use real API
        const apiDocs = await driversApi.getMyDocuments();
        // Transform API response to match our type
        const transformed: DriverDocument[] = apiDocs.map(doc => ({
          id: String(doc.id),
          driver_id: String(doc.driver_id),
          type: doc.type as DocumentType,
          status: doc.status as DriverDocument['status'],
          file_name: doc.file_name,
          file_url: doc.file_url,
          uploaded_at: doc.uploaded_at,
          reviewed_at: doc.reviewed_at,
          expiry_date: doc.expiry_date,
          rejection_reason: doc.rejection_reason,
        }));
        setDocuments(transformed);
      } else {
        // Use mock backend for demo
        const data = await backend.getDriverDocuments(user.id);
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents. Please try again.');
      // Fall back to mock if API fails
      if (USE_REAL_API) {
        try {
          const data = await backend.getDriverDocuments(user.id);
          setDocuments(data);
          setError(null);
        } catch {
          // Keep original error
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (type: DocumentType, file: File) => {
    if (!user) return;

    try {
      if (USE_REAL_API) {
        // Upload via real API
        await driversApi.uploadDocument(type, file);
      } else {
        // Use mock backend for demo
        const fakeUrl = URL.createObjectURL(file);
        await backend.uploadDriverDocument(user.id, type, {
          name: file.name,
          url: fakeUrl,
        });
      }
      await loadDocuments();
    } catch (err) {
      console.error('Failed to upload document:', err);
      setError('Failed to upload document. Please try again.');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      if (USE_REAL_API) {
        await driversApi.deleteDocument(documentId);
      } else {
        await backend.deleteDriverDocument(documentId);
      }
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document. Please try again.');
    }
  };

  // Convert to component format
  const componentDocs = documents.map((doc) => ({
    id: doc.id,
    type: doc.type,
    status: doc.status,
    file_name: doc.file_name,
    file_url: doc.file_url,
    uploaded_at: doc.uploaded_at,
    reviewed_at: doc.reviewed_at,
    expiry_date: doc.expiry_date,
    rejection_reason: doc.rejection_reason,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={18} />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Driver Documents</h1>
          <p className="text-gray-500 dark:text-slate-400">
            Manage your verification documents and vehicle photos
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">Document Requirements</p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
              <li>• All required documents must be approved before you can accept rides</li>
              <li>• Documents are reviewed within 24-48 hours</li>
              <li>• Ensure all images are clear and legible</li>
              <li>• Expired documents must be renewed promptly</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Document Upload Component */}
      <DocumentUpload
        documents={componentDocs}
        onUpload={handleUpload}
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  );
}
