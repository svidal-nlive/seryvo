import { useState } from 'react';
import {
  Settings,
  Bell,
  Moon,
  Globe,
  Shield,
  Key,
  LogOut,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items?: SettingItem[];
}

interface SettingItem {
  id: string;
  label: string;
  type: 'toggle' | 'select' | 'link';
  value?: boolean | string;
  options?: { label: string; value: string }[];
}

export default function SettingsView() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  
  // Local settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [language, setLanguage] = useState('en');

  const sections: SettingSection[] = [
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize how the app looks',
      icon: <Moon size={20} className="text-purple-500" />,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage how you receive alerts',
      icon: <Bell size={20} className="text-blue-500" />,
    },
    {
      id: 'language',
      title: 'Language & Region',
      description: 'Set your preferred language',
      icon: <Globe size={20} className="text-green-500" />,
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Manage your account security',
      icon: <Shield size={20} className="text-red-500" />,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-0 sm:px-4">
      <div className="px-4 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
          Manage your preferences and account settings
        </p>
      </div>

      {/* Appearance Section */}
      <Card className="mx-4 sm:mx-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Moon size={18} className="text-purple-600 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold dark:text-white text-sm sm:text-base">Appearance</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Customize the app theme</p>
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-slate-700">
          <div className="min-w-0 pr-3">
            <p className="font-medium dark:text-white text-sm sm:text-base">Dark Mode</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Use dark theme for low light conditions</p>
          </div>
          <button
            onClick={toggle}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 touch-manipulation"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              <ToggleRight size={28} className="text-blue-500 sm:w-8 sm:h-8" />
            ) : (
              <ToggleLeft size={28} className="text-gray-400 sm:w-8 sm:h-8" />
            )}
          </button>
        </div>
      </Card>

      {/* Notifications Section */}
      <Card className="mx-4 sm:mx-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Bell size={18} className="text-blue-600 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold dark:text-white text-sm sm:text-base">Notifications</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Manage how you receive alerts</p>
          </div>
        </div>
        
        <div className="space-y-3 sm:space-y-4 border-t border-gray-100 dark:border-slate-700 pt-3 sm:pt-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <p className="font-medium dark:text-white text-sm sm:text-base">Push Notifications</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Receive alerts on your device</p>
            </div>
            <button
              onClick={() => setPushNotifications(!pushNotifications)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 touch-manipulation"
            >
              {pushNotifications ? (
                <ToggleRight size={28} className="text-blue-500 sm:w-8 sm:h-8" />
              ) : (
                <ToggleLeft size={28} className="text-gray-400 sm:w-8 sm:h-8" />
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <p className="font-medium dark:text-white text-sm sm:text-base">Email Notifications</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Receive updates via email</p>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 touch-manipulation"
            >
              {emailNotifications ? (
                <ToggleRight size={28} className="text-blue-500 sm:w-8 sm:h-8" />
              ) : (
                <ToggleLeft size={28} className="text-gray-400 sm:w-8 sm:h-8" />
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <p className="font-medium dark:text-white text-sm sm:text-base">SMS Alerts</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Get critical alerts via text</p>
            </div>
            <button
              onClick={() => setSmsNotifications(!smsNotifications)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 touch-manipulation"
            >
              {smsNotifications ? (
                <ToggleRight size={28} className="text-blue-500 sm:w-8 sm:h-8" />
              ) : (
                <ToggleLeft size={28} className="text-gray-400 sm:w-8 sm:h-8" />
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Language Section */}
      <Card className="mx-4 sm:mx-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Globe size={18} className="text-green-600 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold dark:text-white text-sm sm:text-base">Language & Region</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Set your preferred language</p>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-slate-700 pt-3 sm:pt-4">
          <label className="block">
            <span className="text-xs sm:text-sm font-medium dark:text-white">Display Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1.5 sm:mt-2 block w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 sm:py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-white min-h-[44px]"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
            </select>
          </label>
        </div>
      </Card>

      {/* Privacy Section */}
      <Card className="mx-4 sm:mx-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Shield size={18} className="text-red-600 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold dark:text-white text-sm sm:text-base">Privacy & Security</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Manage your account security</p>
          </div>
        </div>
        <div className="space-y-2 sm:space-y-3 border-t border-gray-100 dark:border-slate-700 pt-3 sm:pt-4">
          <button className="w-full flex items-center justify-between py-2.5 sm:py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 rounded-lg px-2 -mx-2 min-h-[44px] touch-manipulation">
            <div className="flex items-center gap-2 sm:gap-3">
              <Key size={16} className="text-gray-400 sm:w-[18px] sm:h-[18px]" />
              <span className="dark:text-white text-sm sm:text-base">Change Password</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          
          <button className="w-full flex items-center justify-between py-2.5 sm:py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 rounded-lg px-2 -mx-2 min-h-[44px] touch-manipulation">
            <div className="flex items-center gap-2 sm:gap-3">
              <Shield size={16} className="text-gray-400 sm:w-[18px] sm:h-[18px]" />
              <span className="dark:text-white text-sm sm:text-base">Two-Factor Authentication</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </Card>

      {/* Logout */}
      <Card className="border-red-200 dark:border-red-900/50 mx-4 sm:mx-0">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 rounded-lg transition-colors min-h-[44px] touch-manipulation"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm sm:text-base">Sign Out</span>
        </button>
      </Card>
    </div>
  );
}
