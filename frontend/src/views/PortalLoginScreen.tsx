import { useState, useEffect } from 'react';
import { Car, Mail, Lock, ArrowLeft, Check, AlertCircle, Loader2, UserPlus, Headphones, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api/auth';
import type { Role } from '../types';
import Button from '../components/ui/Button';

type ViewMode = 'loading' | 'login' | 'register' | 'forgot' | 'reset-sent' | 'reset-code' | 'reset-password' | 'reset-success' | 'pending-approval';

interface PortalConfig {
  role: Role;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  primaryColor: string;
  registrationTitle: string;
  registrationSubtitle: string;
  loginTitle: string;
  loginSubtitle: string;
  pendingMessage?: string;
  requirements?: string[];
}

const portalConfigs: Record<string, PortalConfig> = {
  driver: {
    role: 'driver',
    title: 'Driver Portal',
    subtitle: 'Earn on your schedule with Seryvo',
    icon: <Car size={32} />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    primaryColor: 'blue',
    registrationTitle: 'Become a Driver',
    registrationSubtitle: 'Start your journey with Seryvo today',
    loginTitle: 'Driver Sign In',
    loginSubtitle: 'Access your driver dashboard',
    pendingMessage: 'Your driver application is pending approval. We\'ll notify you via email once your documents have been verified.',
    requirements: [
      'Valid driver\'s license',
      'Vehicle registration',
      'Insurance documentation',
      'Background check consent',
    ],
  },
  support: {
    role: 'support_agent',
    title: 'Support Portal',
    subtitle: 'Help customers get where they need to go',
    icon: <Headphones size={32} />,
    iconBg: 'bg-teal-100 dark:bg-teal-900/50',
    primaryColor: 'teal',
    registrationTitle: 'Join Support Team',
    registrationSubtitle: 'Apply to become a Seryvo support agent',
    loginTitle: 'Support Sign In',
    loginSubtitle: 'Access your support dashboard',
    pendingMessage: 'Your support agent application is pending approval. An administrator will review your application shortly.',
    requirements: [
      'Excellent communication skills',
      'Problem-solving abilities',
      'Customer service experience',
      'Available for scheduled shifts',
    ],
  },
  client: {
    role: 'client',
    title: 'Seryvo',
    subtitle: 'Book your ride in seconds',
    icon: <Car size={32} />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    primaryColor: 'blue',
    registrationTitle: 'Create Account',
    registrationSubtitle: 'Join Seryvo and start riding',
    loginTitle: 'Sign In',
    loginSubtitle: 'Welcome back to Seryvo',
  },
};

interface PortalLoginScreenProps {
  portalType: 'client' | 'driver' | 'support';
}

export default function PortalLoginScreen({ portalType }: PortalLoginScreenProps) {
  const config = portalConfigs[portalType];
  const { login, isLoading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // For driver/support portals, just show login immediately
    // No setup wizard check needed for these portals
    setViewMode('login');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (portalType !== 'client' && !acceptedTerms) {
      setError('You must accept the terms and requirements to continue');
      return;
    }
    
    setLoading(true);
    
    try {
      await authApi.register({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        role: config.role,
      });
      
      // For driver/support roles, show pending approval message
      if (portalType === 'driver' || portalType === 'support') {
        setViewMode('pending-approval');
      } else {
        // Auto login after registration for clients
        await login(email, password);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await authApi.requestPasswordReset(email);
      setViewMode('reset-sent');
    } catch (err) {
      if (err instanceof Error && err.message.includes('wait')) {
        setError(err.message);
      } else {
        setViewMode('reset-sent');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await authApi.verifyPasswordResetCode(email, resetCode);
      if (response.data?.reset_token) {
        setResetToken(response.data.reset_token);
        setViewMode('reset-password');
      } else {
        setError('Failed to verify code');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await authApi.confirmPasswordReset(resetToken, newPassword);
      setViewMode('reset-success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setResetCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setAcceptedTerms(false);
  };

  const getGradientClass = () => {
    switch (portalType) {
      case 'driver':
        return 'from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-blue-950';
      case 'support':
        return 'from-teal-50 to-cyan-100 dark:from-slate-900 dark:to-teal-950';
      default:
        return 'from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800';
    }
  };

  const getButtonClass = () => {
    switch (portalType) {
      case 'driver':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'support':
        return 'bg-teal-600 hover:bg-teal-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const getIconColor = () => {
    switch (portalType) {
      case 'driver':
        return 'text-blue-600';
      case 'support':
        return 'text-teal-600';
      default:
        return 'text-blue-600';
    }
  };

  // Loading state
  if (viewMode === 'loading') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl ${config.iconBg} ${getIconColor()}`}>
            {config.icon}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{config.title}</h1>
        </div>
        <Loader2 size={32} className={`animate-spin ${getIconColor()}`} />
      </div>
    );
  }

  // Pending approval for driver/support
  if (viewMode === 'pending-approval') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()} p-6`}>
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className={`inline-flex p-4 rounded-full ${config.iconBg} mb-6`}>
              <Check size={48} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Application Submitted!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {config.pendingMessage}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Check your email at <strong>{email}</strong> for updates.
            </p>
            <Button
              onClick={() => { resetForm(); setViewMode('login'); }}
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  if (viewMode === 'login') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()} p-6`}>
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${config.iconBg} ${getIconColor()}`}>
                {config.icon}
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.loginTitle}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{config.loginSubtitle}</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { resetForm(); setViewMode('forgot'); }}
                  className={`text-sm ${getIconColor()} hover:underline`}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading || authLoading}
                className={`w-full ${getButtonClass()}`}
              >
                {loading || authLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-3">
                {portalType === 'driver' ? "Want to drive with Seryvo?" : 
                 portalType === 'support' ? "Want to join our support team?" :
                 "Don't have an account?"}
              </p>
              <Button
                variant="secondary"
                onClick={() => { resetForm(); setViewMode('register'); }}
                className="w-full flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                {portalType === 'driver' ? 'Apply to Drive' :
                 portalType === 'support' ? 'Apply for Support' :
                 'Create Account'}
              </Button>
            </div>

            {/* Portal switcher for non-client portals */}
            {portalType !== 'client' && (
              <div className="mt-4 text-center">
                <a
                  href="/"
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  ← Back to main site
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  if (viewMode === 'register') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()} p-6`}>
        <div className="w-full max-w-md">
          <button
            onClick={() => { resetForm(); setViewMode('login'); }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Back to sign in
          </button>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${config.iconBg} ${getIconColor()}`}>
                {config.icon}
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.registrationTitle}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{config.registrationSubtitle}</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Requirements section for driver/support */}
            {config.requirements && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Requirements
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {config.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check size={14} className="text-green-500" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              {portalType !== 'client' && (
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              {/* Terms acceptance for driver/support */}
              {config.requirements && (
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                    I confirm that I meet the requirements listed above and agree to the platform terms of service.
                  </label>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className={`w-full ${getButtonClass()}`}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  portalType === 'client' ? 'Create Account' : 'Submit Application'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password flow
  if (viewMode === 'forgot') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()} p-6`}>
        <div className="w-full max-w-md">
          <button
            onClick={() => { resetForm(); setViewMode('login'); }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Back to sign in
          </button>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className={`inline-flex p-3 rounded-xl ${config.iconBg} mb-4`}>
                <Mail size={32} className={getIconColor()} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Enter your email and we'll send you a reset code
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className={`w-full ${getButtonClass()}`}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Send Reset Code'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Reset code sent
  if (viewMode === 'reset-sent') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()} p-6`}>
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className={`inline-flex p-3 rounded-xl ${config.iconBg} mb-4`}>
                <Mail size={32} className={getIconColor()} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check Your Email</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || resetCode.length !== 6}
                className={`w-full ${getButtonClass()}`}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Code'}
              </Button>
            </form>

            <button
              onClick={() => { setResetCode(''); setViewMode('forgot'); }}
              className={`w-full mt-4 text-sm ${getIconColor()} hover:underline`}
            >
              Try a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // New password form
  if (viewMode === 'reset-password') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()} p-6`}>
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className={`inline-flex p-3 rounded-xl ${config.iconBg} mb-4`}>
                <Lock size={32} className={getIconColor()} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Password</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Your new password must be at least 8 characters
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className={`w-full ${getButtonClass()}`}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Reset success
  if (viewMode === 'reset-success') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getGradientClass()} p-6`}>
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className={`inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/50 mb-6`}>
              <Check size={48} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Password Reset!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Button
              onClick={() => { resetForm(); setViewMode('login'); }}
              className={`w-full ${getButtonClass()}`}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
