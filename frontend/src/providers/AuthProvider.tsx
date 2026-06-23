'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; name: string; role: 'PARENT' | 'TUTOR' }) => Promise<User>;
  logout: () => Promise<void>;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'tuition_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTokenState(localStorage.getItem(TOKEN_KEY));
    setHydrated(true);
  }, []);

  const setToken = useCallback((t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    setTokenState(t);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me', token],
    queryFn: () => apiFetch<{ user: User }>('/api/auth/me', { token }),
    enabled: hydrated && !!token,
    retry: false,
  });

  useEffect(() => {
    if (isError && token) {
      setToken(null);
      queryClient.clear();
    }
  }, [isError, token, setToken, queryClient]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(res.token);
    queryClient.setQueryData(['me', res.token], { user: res.user });
    return res.user;
  };

  const register = async (input: { email: string; password: string; name: string; role: 'PARENT' | 'TUTOR' }) => {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: input,
    });
    setToken(res.token);
    queryClient.setQueryData(['me', res.token], { user: res.user });
    return res.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', token });
    } finally {
      setToken(null);
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        token,
        isLoading: !hydrated || (!!token && isLoading),
        login,
        register,
        logout,
        setToken,
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
