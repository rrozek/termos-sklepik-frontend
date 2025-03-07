"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useRouter, usePathname } from 'next/navigation';
import { User, UserRole } from '@/types';
import { authApi } from './api';

interface JwtPayload {
  userId?: string;
  user_id?: number;  // For Django tokens
  role?: UserRole;
  email?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;  // Allow for other properties
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for token management
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

const saveToken = (token: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('refresh_token', refreshToken);
  }
};

const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
};

// Fix for usePathname
const useIsomorphicPathname = () => {
  const pathname = usePathname();
  const [clientPathname, setClientPathname] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientPathname(window.location.pathname);
    }
  }, []);

  return pathname || clientPathname;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const router = useRouter();
  const pathname = useIsomorphicPathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Helper function to get the current locale from the pathname
  const getCurrentLocale = (): string => {
    const currentPathname = pathname || '';
    const localeMatch = currentPathname.match(/^\/([^\/]+)/);
    return localeMatch ? localeMatch[1] : 'pl'; // Default to 'pl' if no locale found
  };

  // Function to check if token is valid
  const isTokenValid = useCallback((token: string) => {
    try {
      if (!token) return false;

      const decoded = jwtDecode<JwtPayload>(token);

      if (!decoded || typeof decoded !== 'object') {
        return false;
      }

      // Check for expiration
      if (decoded.exp) {
        const currentTime = Date.now() / 1000;
        return decoded.exp > currentTime;
      } else {
        // If no exp, use a default 1-hour expiration from issued at time
        if (decoded.iat) {
          const tokenAge = Date.now() / 1000 - decoded.iat;
          return tokenAge < 3600; // 1 hour
        }
        return false;
      }
    } catch (error) {
      return false;
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      setAuthError(null);
      const response = await authApi.getUserProfile();

      if (response && response.data) {
        setUser(response.data as User);
        return true;
      }
      return false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        clearTokens();
        setUser(null);
      }
      setAuthError('Failed to load user profile');
      return false;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      const token = getToken();

      if (token && isTokenValid(token)) {
        try {
          await loadUserProfile();
        } catch (error) {
          // Silent error handling
        }
      } else if (token) {
        clearTokens();
        setUser(null);
      }

      setIsInitialized(true);
      setIsLoading(false);
    };

    initAuth();
  }, [isTokenValid, loadUserProfile]);

  // Handle login page redirect
  useEffect(() => {
    if (isInitialized && !isLoading) {
      const isLoginPage = pathname === '/login' || pathname === '/register';

      // If on login page but already authenticated, redirect to dashboard
      if (isLoginPage && !!user) {
        router.push('/dashboard');
      }
    }
  }, [isInitialized, isLoading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const response = await authApi.login(email, password) as any;

      // Check if response has data and it's not an empty array
      if (response && response.data &&
          (Array.isArray(response.data) ? response.data.length > 0 : true)) {

        // Handle case when data is an array (take first item) or an object
        const responseData = Array.isArray(response.data) ? response.data[0] : response.data;

        // Check if we have the expected properties
        if (responseData && responseData.user && responseData.accessToken && responseData.refreshToken) {
          const { user, accessToken, refreshToken } = responseData;

          // Store cleaned tokens without 'Bearer ' prefix
          const cleanAccessToken = accessToken.replace('Bearer ', '');
          const cleanRefreshToken = refreshToken.replace('Bearer ', '');

          saveToken(cleanAccessToken, cleanRefreshToken);

          // Set user in state
          setUser(user);

          // Get the current locale
          const currentLocale = getCurrentLocale();

          // Redirect based on role with a slight delay to ensure state updates
          setTimeout(() => {
            if (router && router.push) {
              router.push(`/${currentLocale}/dashboard`);
            } else {
              // Fallback for when router is not available
              window.location.href = `/${currentLocale}/dashboard`;
            }
          }, 100);
        } else {
          // Handle case when response doesn't have expected properties
          throw new Error('Invalid response format from server. Missing user or token data.');
        }
      } else {
        // Handle case when response.data is empty or undefined
        throw new Error('No data received from server.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);

    // Get the current locale
    const currentLocale = getCurrentLocale();

    if (router && router.push) {
      router.push(`/${currentLocale}/login`);
    } else {
      // Fallback for when router is not available
      window.location.href = `/${currentLocale}/login`;
    }
  };

  const hasRole = (roles: UserRole[]) => {
    return !!user && roles.includes(user.role);
  };

  const refreshUser = async () => {
    await loadUserProfile();
  };

  // Use useMemo to prevent unnecessary re-renders
  const authContextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole,
    refreshUser
  }), [user, isLoading]); // Only re-create when user or isLoading changes

  return (
    <AuthContext.Provider value={authContextValue}>
      {process.env.NODE_ENV === 'development' && authError && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#f44336',
            color: 'white',
            padding: '8px',
            zIndex: 9999,
            textAlign: 'center'
          }}
        >
          Auth Error: {authError}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) => {
  const WithAuth: React.FC<P> = (props) => {
    const { isLoading, isAuthenticated, user, hasRole } = useAuth();
    const router = useRouter();
    const pathname = useIsomorphicPathname();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/login');
          setIsAuthorized(false);
        } else if (allowedRoles && !hasRole(allowedRoles)) {
          router.push('/unauthorized');
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      }
    }, [isLoading, isAuthenticated, router, user, hasRole, allowedRoles, pathname]);

    if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      );
    }

    if (isAuthorized === false) {
      return null;
    }

    return isAuthorized ? <Component {...props} /> : null;
  };

  return WithAuth;
};