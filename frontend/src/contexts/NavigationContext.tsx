import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ViewType = 
  | 'dashboard' 
  | 'bookings' 
  | 'offers' 
  | 'tickets'
  | 'supervisor-review'
  | 'region-performance'
  | 'users'
  | 'earnings'
  | 'documents'
  | 'document-review'
  | 'incident-review'
  | 'messaging'
  | 'payment'
  | 'pricing'
  | 'policies'
  | 'cancellation-policies'
  | 'promotions'
  | 'vehicle'
  | 'saved-addresses'
  | 'settings'
  | 'profile'
  | 'help';

interface NavigationContextValue {
  currentView: ViewType;
  navigateTo: (view: ViewType) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const navigateTo = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  return (
    <NavigationContext.Provider value={{ currentView, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return ctx;
}
