import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type { Role, Client, Driver, SupportAgent, Admin } from '../types';
import { authApi, type AuthUser as ApiAuthUser } from '../services/api/auth';
import { isAuthenticated, clearTokens } from '../services/api';

export type AuthUser = Client | Driver | SupportAgent | Admin;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Transform API user response to frontend AuthUser type.
 */
function transformApiUser(apiUser: ApiAuthUser): AuthUser {
  const baseUser = {
    id: apiUser.id,
    email: apiUser.email,
    full_name: apiUser.full_name,
    avatar_url: apiUser.avatar_url,
  };

  // Return the appropriate user type based on the primary role
  switch (apiUser.role) {
    case 'driver':
      return {
        ...baseUser,
        role: 'driver',
        core_status: 'active', // Default values - would be fetched from driver profile
        availability_status: 'offline',
        rating_average: undefined,
        rating_count: undefined,
      } as Driver;
    case 'support_agent':
      return {
        ...baseUser,
        role: 'support_agent',
      } as SupportAgent;
    case 'admin':
      return {
        ...baseUser,
        role: 'admin',
      } as Admin;
    case 'client':
    default:
      return {
        ...baseUser,
        role: 'client',
        default_currency: 'USD',
      } as Client;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (isAuthenticated()) {
        try {
          const apiUser = await authApi.validateSession();
          if (apiUser) {
            setUser(transformApiUser(apiUser));
          }
        } catch {
          // Session invalid, clear tokens
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  /**
   * Login with email and password using the real API.
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUser = await authApi.login({ email, password });
      setUser(transformApiUser(apiUser));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout the current user.
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear any error message.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error,
      login,
      logout,
      clearError,
    }),
    [user, isLoading, error, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
