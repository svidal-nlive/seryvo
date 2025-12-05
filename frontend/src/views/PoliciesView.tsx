import { useState } from 'react';
import {
  FileText,
  Ban,
  Shield,
  DollarSign,
  Clock,
  AlertTriangle,
  ChevronRight,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import CancellationPolicyManager from '../components/admin/CancellationPolicyManager';
import { useNavigation } from '../contexts/NavigationContext';

type PolicySection = 'overview' | 'cancellation' | 'refund' | 'safety' | 'service';

interface PolicyCard {
  id: PolicySection;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'draft' | 'review';
  lastUpdated: string;
}

const POLICY_CARDS: PolicyCard[] = [
  {
    id: 'cancellation',
    title: 'Cancellation Policies',
    description: 'Rules for booking cancellations and fees',
    icon: <Ban size={24} className="text-red-600" />,
    status: 'active',
    lastUpdated: '2024-01-15',
  },
  {
    id: 'refund',
    title: 'Refund Policies',
    description: 'Guidelines for processing refunds',
    icon: <DollarSign size={24} className="text-green-600" />,
    status: 'active',
    lastUpdated: '2024-01-10',
  },
  {
    id: 'safety',
    title: 'Safety Guidelines',
    description: 'Safety standards for riders and drivers',
    icon: <Shield size={24} className="text-blue-600" />,
    status: 'active',
    lastUpdated: '2024-01-20',
  },
  {
    id: 'service',
    title: 'Service Level Agreements',
    description: 'Expected service standards and response times',
    icon: <Clock size={24} className="text-purple-600" />,
    status: 'draft',
    lastUpdated: '2024-01-05',
  },
];

export default function PoliciesView() {
  const { navigateTo } = useNavigation();
  const [activeSection, setActiveSection] = useState<PolicySection>('overview');

  const getStatusBadge = (status: PolicyCard['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (activeSection === 'cancellation') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setActiveSection('overview')}
            className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2"
          >
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold dark:text-white">Cancellation Policies</h1>
        </div>
        <CancellationPolicyManager />
      </div>
    );
  }

  // Other policy sections - placeholder for now
  if (activeSection !== 'overview') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setActiveSection('overview')}
            className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2"
          >
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold dark:text-white">
            {POLICY_CARDS.find((p) => p.id === activeSection)?.title}
          </h1>
        </div>
        <Card className="p-8 sm:p-12 text-center">
          <FileText size={36} className="mx-auto text-gray-400 mb-3 sm:mb-4 sm:w-12 sm:h-12" />
          <h2 className="text-base sm:text-lg font-semibold dark:text-white mb-1 sm:mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            This policy management section is under development.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Platform Policies</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            Manage rules, guidelines, and agreements
          </p>
        </div>
        <Button className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <Plus size={16} className="mr-1.5 sm:mr-2" />
          Create Policy
        </Button>
      </div>

      {/* Policy Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <FileText size={16} className="text-green-600 sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold dark:text-white">
              {POLICY_CARDS.filter((p) => p.status === 'active').length}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">Active</p>
          </div>
        </Card>
        
        <Card className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Clock size={16} className="text-amber-600 sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold dark:text-white">
              {POLICY_CARDS.filter((p) => p.status === 'draft').length}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">Drafts</p>
          </div>
        </Card>
        
        <Card className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <AlertTriangle size={16} className="text-blue-600 sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold dark:text-white">
              {POLICY_CARDS.filter((p) => p.status === 'review').length}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">Review</p>
          </div>
        </Card>
        
        <Card className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Shield size={16} className="text-purple-600 sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold dark:text-white">{POLICY_CARDS.length}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">Total</p>
          </div>
        </Card>
      </div>

      {/* Policy Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        {POLICY_CARDS.map((policy) => (
          <Card
            key={policy.id}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 transition-colors p-3 sm:p-4 touch-manipulation"
            onClick={() => setActiveSection(policy.id)}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-lg bg-gray-100 dark:bg-slate-700 flex-shrink-0">
                {policy.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-0 mb-1">
                  <h3 className="text-sm sm:text-base font-semibold dark:text-white truncate">{policy.title}</h3>
                  {getStatusBadge(policy.status)}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-1.5 sm:mb-2 line-clamp-2">
                  {policy.description}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Last updated: {new Date(policy.lastUpdated).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight size={20} className="text-gray-400 mt-1" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
