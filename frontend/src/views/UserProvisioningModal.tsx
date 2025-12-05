import { useState } from 'react';
import { 
  UserPlus, 
  Mail, 
  Send, 
  Copy, 
  Check, 
  AlertCircle, 
  Loader2,
  X,
  User,
  Car,
  Headphones,
  Shield,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { backend } from '../services/backend';
import type { Role } from '../types';

interface UserProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ProvisioningMode = 'create' | 'invite';

const roleOptions: { value: Role; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'client', 
    label: 'Client', 
    icon: <User size={20} className="text-gray-500" />,
    description: 'Book rides and track trips'
  },
  { 
    value: 'driver', 
    label: 'Driver', 
    icon: <Car size={20} className="text-blue-500" />,
    description: 'Accept rides and earn money'
  },
  { 
    value: 'support_agent', 
    label: 'Support Agent', 
    icon: <Headphones size={20} className="text-teal-500" />,
    description: 'Handle tickets and assist users'
  },
  { 
    value: 'admin', 
    label: 'Administrator', 
    icon: <Shield size={20} className="text-purple-500" />,
    description: 'Full platform access and management'
  },
];

export default function UserProvisioningModal({ isOpen, onClose, onSuccess }: UserProvisioningModalProps) {
  const [mode, setMode] = useState<ProvisioningMode>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ message: string; tempPassword?: string; inviteLink?: string } | null>(null);
  const [copied, setCopied] = useState<'password' | 'link' | null>(null);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [password, setPassword] = useState('');
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);
  const [inviteMessage, setInviteMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setPhone('');
    setRole('client');
    setPassword('');
    setUseCustomPassword(false);
    setSendInvite(true);
    setInviteMessage('');
    setError('');
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await backend.adminCreateUser({
        email,
        full_name: fullName,
        role,
        phone: phone || undefined,
        password: useCustomPassword && password ? password : undefined,
        send_invite: sendInvite,
      });

      setSuccess({
        message: response.message,
        tempPassword: response.temporary_password,
        inviteLink: response.invite_link,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await backend.adminInviteUser({
        email,
        full_name: fullName,
        role,
        message: inviteMessage || undefined,
      });

      setSuccess({
        message: response.message,
        tempPassword: response.temporary_password,
        inviteLink: response.invite_link,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'password' | 'link') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New User" size="lg">
      {/* Success state */}
      {success ? (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {success.message}
            </h3>
          </div>

          {success.tempPassword && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                Temporary Password
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded border font-mono text-sm">
                  {success.tempPassword}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(success.tempPassword!, 'password')}
                >
                  {copied === 'password' ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                Share this password securely with the user
              </p>
            </div>
          )}

          {success.inviteLink && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Invite Link
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded border text-xs break-all">
                  {success.inviteLink}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(success.inviteLink!, 'link')}
                >
                  {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetForm} className="flex-1">
              Add Another User
            </Button>
            <Button onClick={handleClose} className="flex-1">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Mode toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => { setMode('create'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'create'
                  ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <UserPlus size={16} />
              Create User
            </button>
            <button
              onClick={() => { setMode('invite'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'invite'
                  ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Send size={16} />
              Send Invite
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={mode === 'create' ? handleCreateUser : handleInviteUser} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            {/* Phone (only for create mode) */}
            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            )}

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                      role === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {option.icon}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Create mode specific fields */}
            {mode === 'create' && (
              <>
                {/* Custom password option */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="customPassword"
                    checked={useCustomPassword}
                    onChange={(e) => setUseCustomPassword(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="customPassword" className="text-sm text-gray-700 dark:text-gray-300">
                    Set custom password (otherwise auto-generated)
                  </label>
                </div>

                {useCustomPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                  </div>
                )}

                {/* Send invite email */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="sendInvite"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="sendInvite" className="text-sm text-gray-700 dark:text-gray-300">
                    Send welcome email with login credentials
                  </label>
                </div>
              </>
            )}

            {/* Invite mode specific fields */}
            {mode === 'invite' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Personal Message (optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add a personal note to the invitation email..."
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : mode === 'create' ? (
                  <>
                    <UserPlus size={18} className="mr-2" />
                    Create User
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
