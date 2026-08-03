import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { CurrentUser } from '../types';

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = '5quadleague.auth';

function loadStored(): { token: string; user: CurrentUser } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [user, setUser] = useState<CurrentUser | null>(stored?.user ?? null);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: CurrentUser }>('/auth/login', { email, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.accessToken, user: res.user }));
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
