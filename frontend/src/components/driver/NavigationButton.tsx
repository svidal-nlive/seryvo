/**
 * Seryvo Platform - Navigation Button Component
 * Button to open external navigation apps (Google Maps, Waze, Apple Maps)
 */

import { useState, useRef, useEffect } from 'react';
import { Navigation, MapPin, ChevronDown } from 'lucide-react';
import {
  getAvailableNavigationApps,
  navigateToPickup,
  navigateToDropoff,
  type NavigationApp,
} from '../../utils/navigation';
import type { Location } from '../../types';

interface NavigationButtonProps {
  /** Location to navigate to */
  destination: Location;
  /** Type of destination */
  type: 'pickup' | 'dropoff';
  /** Optional label */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'icon';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

export default function NavigationButton({
  destination,
  type,
  label,
  variant = 'primary',
  size = 'md',
  className = '',
}: NavigationButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const apps = getAvailableNavigationApps();
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);
  
  const handleNavigate = (app: NavigationApp) => {
    setShowMenu(false);
    if (type === 'pickup') {
      navigateToPickup(destination, app);
    } else {
      navigateToDropoff(destination, app);
    }
  };
  
  const handleDefaultNavigate = () => {
    if (apps.length === 1) {
      handleNavigate(apps[0].id);
    } else {
      setShowMenu(!showMenu);
    }
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };
  
  const iconSizes = { sm: 14, md: 16, lg: 20 };
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
    icon: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300',
  };
  
  const buttonLabel = label || (type === 'pickup' ? 'Navigate to Pickup' : 'Navigate to Dropoff');
  
  if (!destination.lat || !destination.lng) {
    return null;
  }
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleDefaultNavigate}
        className={`
          flex items-center justify-center rounded-lg font-medium transition-colors
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        title={buttonLabel}
      >
        <Navigation size={iconSizes[size]} />
        {variant !== 'icon' && (
          <>
            <span>{buttonLabel}</span>
            {apps.length > 1 && <ChevronDown size={iconSizes[size] - 2} />}
          </>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {showMenu && apps.length > 1 && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Open in...
          </div>
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleNavigate(app.id)}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <span>{app.icon}</span>
              <span>{app.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Quick Navigation Bar Component
// =============================================================================

interface QuickNavigationBarProps {
  pickup: Location;
  dropoff: Location;
  currentStep: 'pickup' | 'dropoff' | 'complete';
  className?: string;
}

export function QuickNavigationBar({
  pickup,
  dropoff,
  currentStep,
  className = '',
}: QuickNavigationBarProps) {
  const apps = getAvailableNavigationApps();
  
  const handleNavigate = (app: NavigationApp) => {
    if (currentStep === 'pickup') {
      navigateToPickup(pickup, app);
    } else if (currentStep === 'dropoff') {
      navigateToDropoff(dropoff, app);
    }
  };
  
  if (currentStep === 'complete') {
    return null;
  }
  
  const destination = currentStep === 'pickup' ? pickup : dropoff;
  const destinationLabel = currentStep === 'pickup' ? 'Pickup' : 'Dropoff';
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'pickup' 
              ? 'bg-green-100 dark:bg-green-900/30' 
              : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <MapPin size={16} className={
              currentStep === 'pickup' 
                ? 'text-green-600' 
                : 'text-red-600'
            } />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Navigate to {destinationLabel}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
              {destination.address_line || 'Location'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleNavigate(app.id)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
              title={`Open in ${app.name}`}
            >
              <span>{app.icon}</span>
              <span className="hidden sm:inline">{app.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
