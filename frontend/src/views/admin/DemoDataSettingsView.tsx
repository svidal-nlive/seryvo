import { useState, useEffect } from 'react';
import { AlertTriangle, Database, Trash2, Download, Check, Loader2, Users, Car, TicketIcon, AlertOctagon, Info, Copy, CheckCircle, KeyRound, UserCircle, Headphones, Truck, Skull, RefreshCcw, XCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { adminApi, type DemoDataStatus } from '../../services/api/admin';
import { useAuth } from '../../contexts/AuthContext';

interface DemoDataSettingsViewProps {
  onBack?: () => void;
}

export default function DemoDataSettingsView({ onBack }: DemoDataSettingsViewProps) {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<DemoDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmLoad, setShowConfirmLoad] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmWipeAll, setShowConfirmWipeAll] = useState(false);
  const [showConfirmFactoryReset, setShowConfirmFactoryReset] = useState(false);
  const [factoryResetStep, setFactoryResetStep] = useState(1);
  const [factoryResetConfirmText, setFactoryResetConfirmText] = useState('');
  const [factoryResetChecks, setFactoryResetChecks] = useState({ understand: false, noBackup: false, permanent: false });
  const [factoryResetEmail, setFactoryResetEmail] = useState('');
  const [showCredentialsInfo, setShowCredentialsInfo] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getDemoDataStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data status');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoData = async () => {
    setShowConfirmLoad(false);
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await adminApi.loadDemoData();
      setSuccessMessage(result.message);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearDemoData = async () => {
    setShowConfirmClear(false);
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await adminApi.clearDemoData();
      setSuccessMessage(result.message);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear demo data');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWipeAllData = async () => {
    setShowConfirmWipeAll(false);
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await adminApi.wipeAllDemoData();
      setSuccessMessage(result.message);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to wipe data');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!user?.email) {
      setError('Cannot perform factory reset: user email not found');
      return;
    }
    
    setShowConfirmFactoryReset(false);
    setFactoryResetStep(1);
    setFactoryResetConfirmText('');
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await adminApi.factoryReset(user.email);
      // Factory reset successful - log the user out
      setSuccessMessage(result.message + ' You will be logged out now.');
      // Wait a moment then logout
      setTimeout(() => {
        logout();
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform factory reset');
      setActionLoading(false);
    }
  };

  const openFactoryResetModal = () => {
    setFactoryResetStep(1);
    setFactoryResetConfirmText('');
    setShowConfirmFactoryReset(true);
  };

  const closeFactoryResetModal = () => {
    setShowConfirmFactoryReset(false);
    setFactoryResetStep(1);
    setFactoryResetConfirmText('');
    setFactoryResetChecks({ understand: false, noBackup: false, permanent: false });
    setFactoryResetEmail('');
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const demoCredentials = [
    {
      category: 'Client Accounts',
      icon: UserCircle,
      color: 'blue',
      description: 'Test booking rides, payments, and trip tracking',
      accounts: [
        { email: 'alice@seryvo.demo.net', password: 'demo123', name: 'Alice Demo' },
        { email: 'bob@seryvo.demo.net', password: 'demo123', name: 'Bob Demo' },
        { email: 'carol@seryvo.demo.net', password: 'demo123', name: 'Carol Demo' },
      ]
    },
    {
      category: 'Driver Accounts',
      icon: Truck,
      color: 'green',
      description: 'Test driver dashboard, accepting rides, and navigation',
      accounts: [
        { email: 'mike@seryvo.demo.net', password: 'demo123', name: 'Mike Driver' },
        { email: 'sarah@seryvo.demo.net', password: 'demo123', name: 'Sarah Driver' },
        { email: 'dave@seryvo.demo.net', password: 'demo123', name: 'Dave Driver' },
      ]
    },
    {
      category: 'Support Account',
      icon: Headphones,
      color: 'purple',
      description: 'Test ticket management and customer support features',
      accounts: [
        { email: 'support1@seryvo.demo.net', password: 'demo123', name: 'Support Agent' },
      ]
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Demo Data Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage demo data for testing and demonstration purposes
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowCredentialsInfo(true)}
            className="flex items-center gap-2"
          >
            <KeyRound size={18} />
            View Demo Logins
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Important Notice</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Demo data is intended for testing and demonstration only. Loading demo data will create sample users, bookings, vehicles, and other records. Clearing demo data will permanently remove all demo accounts and their associated data.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Check size={18} />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Demo Users</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{status?.demo_users_count ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Car size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Demo Bookings</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{status?.demo_bookings_count ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              status?.demo_data_loaded 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-gray-100 dark:bg-slate-700'
            }`}>
              <Database size={20} className={
                status?.demo_data_loaded 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-400'
              } />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className={`text-lg font-bold ${
                status?.demo_data_loaded 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-500'
              }`}>
                {status?.demo_data_loaded ? 'Loaded' : 'Not Loaded'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Accounts Info */}
      {status?.demo_data_loaded && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Demo Account Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">Client Accounts</p>
              <p className="text-gray-600 dark:text-gray-400">alice@seryvo.demo.net / demo123</p>
              <p className="text-gray-600 dark:text-gray-400">bob@seryvo.demo.net / demo123</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">Driver Accounts</p>
              <p className="text-gray-600 dark:text-gray-400">mike@seryvo.demo.net / demo123</p>
              <p className="text-gray-600 dark:text-gray-400">sarah@seryvo.demo.net / demo123</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">Support Account</p>
              <p className="text-gray-600 dark:text-gray-400">support1@seryvo.demo.net / demo123</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={() => setShowConfirmLoad(true)}
            disabled={actionLoading}
            className="flex items-center gap-2"
          >
            <Download size={18} />
            {status?.demo_data_loaded ? 'Reload Demo Data' : 'Load Demo Data'}
          </Button>

          {status?.demo_data_loaded && (
            <Button
              variant="danger"
              onClick={() => setShowConfirmClear(true)}
              disabled={actionLoading}
              className="flex items-center gap-2"
            >
              <Trash2 size={18} />
              Clear Demo Data
            </Button>
          )}
        </div>
        
        {/* Wipe All Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Wipe all non-admin data and start fresh. This removes all users (except admins), bookings, tickets, and other data.
          </p>
          <Button
            variant="danger"
            onClick={() => setShowConfirmWipeAll(true)}
            disabled={actionLoading}
            className="flex items-center gap-2"
          >
            <AlertOctagon size={18} />
            Wipe All Data (Keep Admin)
          </Button>
        </div>
        
        {/* Factory Reset Section */}
        <div className="mt-6 pt-6 border-t-2 border-red-300 dark:border-red-700">
          <div className="flex items-center gap-2 mb-2">
            <Skull size={20} className="text-red-700 dark:text-red-500" />
            <h4 className="font-bold text-red-700 dark:text-red-500">☠️ Factory Reset</h4>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              <strong>EXTREME DANGER:</strong> This will completely wipe the entire database including:
            </p>
            <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1">
              <li>ALL admin accounts (including yours)</li>
              <li>ALL users, bookings, and all platform data</li>
              <li>You will be logged out immediately</li>
              <li>The app will require initial setup (first user becomes admin)</li>
            </ul>
            <p className="text-sm text-red-800 dark:text-red-200 font-bold mt-3">
              ⚠️ THIS ACTION IS COMPLETELY IRREVERSIBLE
            </p>
          </div>
          <Button
            variant="danger"
            onClick={openFactoryResetModal}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 border-red-800"
          >
            <RefreshCcw size={18} />
            Factory Reset (Delete Everything)
          </Button>
        </div>
      </div>

      {/* Load Confirmation Modal */}
      <Modal
        isOpen={showConfirmLoad}
        onClose={() => setShowConfirmLoad(false)}
        title="Load Demo Data?"
      >
        <div className="p-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Warning</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This will create sample users, vehicles, bookings, and other demo data in your database. This is intended for testing and demonstration purposes only.
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Demo data will include:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-1">
            <li>3 demo client accounts</li>
            <li>3 demo driver accounts with profiles</li>
            <li>1 demo support account</li>
            <li>Sample regions and service types</li>
          </ul>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirmLoad(false)}>
              Cancel
            </Button>
            <Button onClick={handleLoadDemoData} disabled={actionLoading}>
              {actionLoading ? 'Loading...' : 'Load Demo Data'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={showConfirmClear}
        onClose={() => setShowConfirmClear(false)}
        title="Clear Demo Data?"
      >
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Danger Zone</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This action cannot be undone. All demo users and their associated data (bookings, messages, etc.) will be permanently deleted.
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This will remove {status?.demo_users_count} demo users and all their data.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClearDemoData} disabled={actionLoading}>
              {actionLoading ? 'Clearing...' : 'Yes, Clear Demo Data'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Demo Credentials Info Modal */}
      <Modal
        isOpen={showCredentialsInfo}
        onClose={() => setShowCredentialsInfo(false)}
        title="🔐 Demo Account Credentials"
        size="lg"
      >
        <div className="p-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Testing Made Easy</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Use these demo accounts to test different user roles and platform features. All demo accounts share the same password: <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded font-mono">demo123</code>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {demoCredentials.map((category) => {
              const IconComponent = category.icon;
              const colorClasses = {
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
              }[category.color] || 'bg-gray-100 text-gray-600';

              return (
                <div key={category.category} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses}`}>
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{category.category}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{category.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {category.accounts.map((account, idx) => (
                      <div key={account.email} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{account.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">{account.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(account.email, `${category.category}-${idx}-email`)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Copy email"
                          >
                            {copiedField === `${category.category}-${idx}-email` ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(`${account.email}\n${account.password}`, `${category.category}-${idx}-all`)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                          >
                            {copiedField === `${category.category}-${idx}-all` ? (
                              <span className="flex items-center gap-1"><CheckCircle size={12} /> Copied!</span>
                            ) : (
                              'Copy Login'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Tip: Open an incognito window to test multiple roles simultaneously
              </p>
              <Button variant="secondary" onClick={() => setShowCredentialsInfo(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Wipe All Confirmation Modal */}
      <Modal
        isOpen={showConfirmWipeAll}
        onClose={() => setShowConfirmWipeAll(false)}
        title="⚠️ Wipe All Data?"
      >
        <div className="p-4">
          <div className="bg-red-100 dark:bg-red-900/40 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertOctagon size={28} className="text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-red-800 dark:text-red-200">CRITICAL WARNING</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This will permanently delete <strong>ALL</strong> non-admin users and their data. This includes:
                </p>
              </div>
            </div>
          </div>

          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
            <li>All client accounts and their bookings</li>
            <li>All driver accounts and profiles</li>
            <li>All support agent accounts</li>
            <li>All support tickets</li>
            <li>All booking history</li>
          </ul>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700 dark:text-green-300">
              ✓ Admin accounts will be preserved
            </p>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium">
            Are you absolutely sure you want to proceed?
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirmWipeAll(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleWipeAllData} disabled={actionLoading}>
              {actionLoading ? 'Wiping...' : 'Yes, Wipe Everything'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Factory Reset Confirmation Modal */}
      <Modal
        isOpen={showConfirmFactoryReset}
        onClose={closeFactoryResetModal}
        title="🚨 FACTORY RESET - COMPLETE SYSTEM WIPE"
      >
        <div className="p-4">
          {/* Extreme Warning Banner */}
          <div className="bg-red-600 text-white rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <Skull size={32} className="shrink-0" />
              <div>
                <p className="font-bold text-lg">POINT OF NO RETURN</p>
                <p className="text-sm opacity-90">
                  This action will completely destroy all platform data
                </p>
              </div>
              <Skull size={32} className="shrink-0" />
            </div>
          </div>

          {/* What will be deleted */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <p className="font-bold text-red-600 dark:text-red-400 mb-2">Everything will be deleted:</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> All Users (including admins)
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> All Bookings & History
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> All Payments & Invoices
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> All Support Tickets
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> All Conversations
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> All Audit Logs
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> All Promotions
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" /> Your Admin Account
              </div>
            </div>
          </div>

          {factoryResetStep === 1 && (
            <>
              {/* Step 1: Confirmations */}
              <div className="space-y-3 mb-6">
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  Check all boxes to proceed:
                </p>
                
                <label className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={factoryResetChecks.understand}
                    onChange={(e) => setFactoryResetChecks(prev => ({ ...prev, understand: e.target.checked }))}
                    className="mt-1 w-5 h-5 accent-red-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>I understand</strong> that this will delete ALL data including my admin account and the platform will return to first-time setup
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={factoryResetChecks.noBackup}
                    onChange={(e) => setFactoryResetChecks(prev => ({ ...prev, noBackup: e.target.checked }))}
                    className="mt-1 w-5 h-5 accent-red-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>I have backed up</strong> any important data I need, or I accept that it will be lost forever
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={factoryResetChecks.permanent}
                    onChange={(e) => setFactoryResetChecks(prev => ({ ...prev, permanent: e.target.checked }))}
                    className="mt-1 w-5 h-5 accent-red-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>I acknowledge</strong> that this action is PERMANENT and IRREVERSIBLE - there is no undo
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={closeFactoryResetModal}>
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => setFactoryResetStep(2)}
                  disabled={!factoryResetChecks.understand || !factoryResetChecks.noBackup || !factoryResetChecks.permanent}
                >
                  Continue to Final Step
                </Button>
              </div>
            </>
          )}

          {factoryResetStep === 2 && (
            <>
              {/* Step 2: Email Confirmation */}
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
                  <span className="font-bold text-yellow-800 dark:text-yellow-200">FINAL CONFIRMATION</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Enter your admin email address to confirm you want to proceed with the factory reset.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Admin Email Address:
                </label>
                <input
                  type="email"
                  value={factoryResetEmail}
                  onChange={(e) => setFactoryResetEmail(e.target.value)}
                  placeholder="Enter your email to confirm"
                  className="w-full px-4 py-3 border-2 border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="bg-gray-900 text-white rounded-lg p-4 mb-4 text-center">
                <p className="text-sm mb-1">After clicking the button below:</p>
                <p className="font-mono text-lg text-red-400">You will be logged out</p>
                <p className="font-mono text-lg text-red-400">All data will be destroyed</p>
                <p className="font-mono text-lg text-green-400">Platform will restart fresh</p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setFactoryResetStep(1)}>
                  Go Back
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleFactoryReset}
                  disabled={actionLoading || !factoryResetEmail.includes('@')}
                  className="bg-red-700 hover:bg-red-800 border-2 border-red-900"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Wiping All Data...
                    </>
                  ) : (
                    <>
                      <Skull size={18} />
                      🔥 FACTORY RESET 🔥
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
