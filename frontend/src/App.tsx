import { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { ScreenReaderProvider } from './contexts/ScreenReaderContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ClientDashboard from './views/ClientDashboard';
import DriverDashboard from './views/DriverDashboard';
import SupportDashboard from './views/SupportDashboard';
import AdminDashboard from './views/AdminDashboard';
import ProfileView from './views/ProfileView';
import UserManagementTable from './views/UserManagementTable';
import PaymentSettings from './views/PaymentSettings';
import DriverDocumentsView from './views/DriverDocumentsView';
import DriverEarningsView from './views/DriverEarningsView';
import DocumentVerificationView from './views/DocumentVerificationView';
import PricingManagement from './views/PricingManagement';
import { PromoManagement } from './views/PromoManagement';
import { VehicleProfileView } from './views/VehicleProfileView';
import SavedAddressesView from './views/SavedAddressesView';
import CancellationPoliciesView from './views/CancellationPoliciesView';
import IncidentReviewView from './views/IncidentReviewView';
import SupervisorReviewView from './views/SupervisorReviewView';
import RegionPerformanceView from './views/RegionPerformanceView';
import LoginScreen from './views/LoginScreen';
import PortalLoginScreen from './views/PortalLoginScreen';
import SettingsView from './views/SettingsView';
import HelpView from './views/HelpView';
import PoliciesView from './views/PoliciesView';
import { MessagingView } from './components/messaging';

// Portal-specific login screens
function DriverPortal() {
  const { user } = useAuth();
  
  // If logged in, redirect to main app (which will show driver dashboard)
  if (user) {
    if (user.role === 'driver') {
      return <Navigate to="/" replace />;
    }
    // Wrong role for this portal
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-blue-950 p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Wrong Portal</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You're logged in as a {user.role.replace('_', ' ')}, not a driver.
          </p>
          <a href="/" className="text-blue-600 hover:underline">Go to main site</a>
        </div>
      </div>
    );
  }
  
  return <PortalLoginScreen portalType="driver" />;
}

function SupportPortal() {
  const { user } = useAuth();
  
  // If logged in, redirect to main app (which will show support dashboard)
  if (user) {
    if (user.role === 'support_agent') {
      return <Navigate to="/" replace />;
    }
    // Wrong role for this portal
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-slate-900 dark:to-teal-950 p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Wrong Portal</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You're logged in as a {user.role.replace('_', ' ')}, not a support agent.
          </p>
          <a href="/" className="text-teal-600 hover:underline">Go to main site</a>
        </div>
      </div>
    );
  }
  
  return <PortalLoginScreen portalType="support" />;
}

function AppShell() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const { currentView } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <LoginScreen />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'client':
        return <ClientDashboard />;
      case 'driver':
        return <DriverDashboard />;
      case 'support_agent':
        return <SupportDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <div className="p-8 text-center">Unknown role</div>;
    }
  };

  const renderView = () => {
    // Handle common views that apply to all roles
    switch (currentView) {
      case 'profile':
        return <ProfileView />;
      case 'messaging':
        return <MessagingView userId={user.id} userName={user.full_name} />;
      case 'settings':
        return <SettingsView />;
      case 'help':
        // Only clients and drivers see help
        return ['client', 'driver'].includes(user.role) ? <HelpView /> : renderDashboard();
      case 'tickets':
        // Support agents and admins see tickets (SupportDashboard handles tickets)
        return ['admin', 'support_agent'].includes(user.role) ? <SupportDashboard /> : renderDashboard();
      case 'payment':
        // Only clients should see this
        return user.role === 'client' ? <PaymentSettings /> : renderDashboard();
      case 'saved-addresses':
        // Only clients should see this
        return user.role === 'client' ? <SavedAddressesView /> : renderDashboard();
      case 'documents':
        // Only drivers should see this
        return user.role === 'driver' ? <DriverDocumentsView /> : renderDashboard();
      case 'vehicle':
        // Only drivers should see this
        return user.role === 'driver' ? <VehicleProfileView /> : renderDashboard();
      case 'earnings':
        // Only drivers should see this
        return user.role === 'driver' ? <DriverEarningsView /> : renderDashboard();
      case 'pricing':
        // Only admins should see this
        return user.role === 'admin' ? <PricingManagement /> : renderDashboard();
      case 'promotions':
        // Only admins should see this
        return user.role === 'admin' ? <PromoManagement /> : renderDashboard();
      case 'policies':
        // Only admins should see this
        return user.role === 'admin' ? <PoliciesView /> : renderDashboard();
      case 'cancellation-policies':
        // Only admins should see this
        return user.role === 'admin' ? <CancellationPoliciesView /> : renderDashboard();
      case 'document-review':
        // Only admins should see this
        return user.role === 'admin' ? <DocumentVerificationView /> : renderDashboard();
      case 'incident-review':
        // Only admins should see this
        return user.role === 'admin' ? <IncidentReviewView /> : renderDashboard();
      case 'supervisor-review':
        // Admins and support agents (supervisors) can access this
        return ['admin', 'support_agent'].includes(user.role) ? <SupervisorReviewView /> : renderDashboard();
      case 'region-performance':
        // Only admins should see this
        return user.role === 'admin' ? <RegionPerformanceView /> : renderDashboard();
      case 'users':
        // Only admins should see this
        return user.role === 'admin' ? <UserManagementTable /> : renderDashboard();
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  return (
    <div className={`flex h-full ${dark ? 'dark' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900 p-4 md:p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// Main App with routing
function AppWithRoutes() {
  return (
    <Routes>
      {/* Portal-specific routes */}
      <Route path="/driver" element={<DriverPortal />} />
      <Route path="/driver/*" element={<DriverPortal />} />
      <Route path="/support" element={<SupportPortal />} />
      <Route path="/support/*" element={<SupportPortal />} />
      
      {/* Main app route (client portal by default) */}
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <ScreenReaderProvider>
            <AppWithRoutes />
          </ScreenReaderProvider>
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
