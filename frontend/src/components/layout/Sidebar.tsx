import { X, LayoutDashboard, Car, MessageSquare, Settings, HelpCircle, Users, Wallet, FileText, ShieldCheck, User, CreditCard, FolderOpen, DollarSign, Tag, Truck, MapPin, Ban, AlertTriangle, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, type ViewType } from '../../contexts/NavigationContext';
import type { Role } from '../../types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['client', 'driver', 'support_agent', 'admin'] },
  { id: 'bookings', label: 'My Bookings', icon: <Car size={20} />, roles: ['client'] },
  { id: 'saved-addresses', label: 'Saved Addresses', icon: <MapPin size={20} />, roles: ['client'] },
  { id: 'offers', label: 'Offers', icon: <Car size={20} />, roles: ['driver'] },
  { id: 'tickets', label: 'Tickets', icon: <FileText size={20} />, roles: ['support_agent', 'admin'] },
  { id: 'supervisor-review', label: 'Escalations', icon: <Shield size={20} />, roles: ['support_agent', 'admin'] },
  { id: 'users', label: 'Users', icon: <Users size={20} />, roles: ['admin'] },
  { id: 'document-review', label: 'Documents', icon: <FolderOpen size={20} />, roles: ['admin'] },
  { id: 'incident-review', label: 'Incidents', icon: <AlertTriangle size={20} />, roles: ['admin'] },
  { id: 'region-performance', label: 'Region Reports', icon: <BarChart3 size={20} />, roles: ['admin'] },
  { id: 'pricing', label: 'Pricing', icon: <DollarSign size={20} />, roles: ['admin'] },
  { id: 'promotions', label: 'Promotions', icon: <Tag size={20} />, roles: ['admin'] },
  { id: 'cancellation-policies', label: 'Cancellations', icon: <Ban size={20} />, roles: ['admin'] },
  { id: 'earnings', label: 'Earnings', icon: <Wallet size={20} />, roles: ['driver'] },
  { id: 'vehicle', label: 'My Vehicle', icon: <Truck size={20} />, roles: ['driver'] },
  { id: 'documents', label: 'Documents', icon: <FolderOpen size={20} />, roles: ['driver'] },
  { id: 'messaging', label: 'Messaging', icon: <MessageSquare size={20} />, roles: ['client', 'driver', 'support_agent'] },
  { id: 'payment', label: 'Payment', icon: <CreditCard size={20} />, roles: ['client'] },
  { id: 'policies', label: 'Policies', icon: <ShieldCheck size={20} />, roles: ['admin'] },
  { id: 'profile', label: 'Profile', icon: <User size={20} />, roles: ['client', 'driver', 'support_agent', 'admin'] },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, roles: ['client', 'driver', 'support_agent', 'admin'] },
  { id: 'help', label: 'Help', icon: <HelpCircle size={20} />, roles: ['client', 'driver'] },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { currentView, navigateTo } = useNavigation();
  const role = user?.role;

  const visibleItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  const handleNavClick = (view: ViewType) => {
    navigateTo(view);
    onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700
          transform transition-transform lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-slate-700">
          <span className="text-xl font-bold text-blue-600">Seryvo</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {visibleItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
