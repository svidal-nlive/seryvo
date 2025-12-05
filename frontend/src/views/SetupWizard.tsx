import { useState } from 'react';
import { Car, Mail, Lock, User, Phone, ArrowRight, Check, Shield, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import { authApi } from '../services/api/auth';

interface SetupWizardProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'account' | 'confirm' | 'success';

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateAdmin = async () => {
    setError('');
    
    // Validation
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      await authApi.firstUserSetup({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
      });
      setStep('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Setup failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Car size={48} className="text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Seryvo</h1>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Seryvo
            </h2>
            
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Your premium transportation platform is ready to be configured.
              Let's set up your administrator account to get started.
            </p>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">First-Time Setup</p>
                  <p>The first account you create will have full administrator privileges. Make sure to use a secure password and keep your credentials safe.</p>
                </div>
              </div>
            </div>
            
            <Button onClick={() => setStep('account')} className="w-full">
              Get Started <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Account creation step
  if (step === 'account') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Car size={40} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seryvo</h1>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Create Admin Account
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6 text-center text-sm">
              This account will have full administrative access
            </p>
            
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); setStep('confirm'); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number (optional)
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                Continue <ArrowRight size={18} />
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation step
  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Car size={40} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seryvo</h1>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Confirm Your Details
            </h2>
            
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                <span className="text-gray-500 dark:text-slate-400">Name</span>
                <span className="font-medium text-gray-900 dark:text-white">{fullName}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                <span className="text-gray-500 dark:text-slate-400">Email</span>
                <span className="font-medium text-gray-900 dark:text-white">{email}</span>
              </div>
              {phone && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-gray-500 dark:text-slate-400">Phone</span>
                  <span className="font-medium text-gray-900 dark:text-white">{phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
                <span className="text-gray-500 dark:text-slate-400">Role</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  <Shield size={14} /> Administrator
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('account')} className="flex-1" disabled={loading}>
                Back
              </Button>
              <Button onClick={handleCreateAdmin} className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success step
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Car size={48} className="text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Seryvo</h1>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Setup Complete!
          </h2>
          
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Your administrator account has been created successfully.
            You can now manage users, configure settings, and set up your transportation platform.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> You can load demo data from Admin Settings to explore the platform with sample users, bookings, and vehicles.
            </p>
          </div>
          
          <Button onClick={onComplete} className="w-full">
            Go to Dashboard <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
