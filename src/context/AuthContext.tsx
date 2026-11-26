import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, clearCsrfToken, refreshCsrfToken } from '../api/client';
import { authApi, settingsApi } from '../api/endpoints';
import type { UserProfile, UserSettings } from '../api/types';
import { getStartupSession } from './sessionStartup';

const PENDING_EMAIL_KEY = 'penny.pending-email';

export function readPendingEmail(): string {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export function writePendingEmail(email: string): void {
  try {
    if (email) {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } else {
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

interface AuthContextValue {
  loading: boolean;
  user: UserProfile | null;
  twoFactorPending: boolean;
  settings: UserSettings | null;
  backendUnavailable: boolean;
  authError: string | null;
  sessionCheckFailed: boolean;
  refreshSession: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  setAuthenticatedUser: (user: UserProfile | null, twoFactorPending?: boolean) => void;
  setSettings: (settings: UserSettings | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await settingsApi.get();
      setSettings(s);
    } catch {
      // Non-fatal: settings may be unavailable while guest or temporarily unreachable
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await refreshCsrfToken();
      const session = await getStartupSession(authApi.getSession);
      setSessionCheckFailed(false);
      setBackendUnavailable(false);
      setUser(session.user);
      setTwoFactorPending(Boolean(session.two_factor_pending));
      if (session.user) {
        writePendingEmail('');
        await refreshSettings();
      } else {
        setSettings(null);
      }
    } catch (err) {
      setSessionCheckFailed(true);
      if (err instanceof ApiError && err.isServiceUnavailable) {
        setBackendUnavailable(true);
        setAuthError(err.message);
      } else if (err instanceof Error) {
        setAuthError(err.message);
      }
      // A failed check cannot prove that the browser session ended.
    } finally {
      setLoading(false);
    }
  }, [refreshSettings]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const setAuthenticatedUser = useCallback(
    (nextUser: UserProfile | null, nextTwoFactorPending = false) => {
      setUser(nextUser);
      setTwoFactorPending(nextTwoFactorPending);
      setBackendUnavailable(false);
      setSessionCheckFailed(false);
      if (nextUser) {
        writePendingEmail('');
        void refreshSettings();
      } else {
        setSettings(null);
      }
    },
    [refreshSettings]
  );

  const signOut = useCallback(async () => {
    await authApi.logout();
    clearCsrfToken();
    setUser(null);
    setTwoFactorPending(false);
    setSettings(null);
    setSessionCheckFailed(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        twoFactorPending,
        settings,
        backendUnavailable,
        authError,
        sessionCheckFailed,
        refreshSession,
        refreshSettings,
        setAuthenticatedUser,
        setSettings,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
