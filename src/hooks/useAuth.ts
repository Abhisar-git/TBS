'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserRole } from '@/types';

export function useAuth(requiredRole?: UserRole | UserRole[]) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('tbs-token');
    const savedUser = localStorage.getItem('tbs-user');

    if (!savedToken || !savedUser) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(savedUser) as User;
      const roles = Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : null;

      if (roles && !roles.includes(parsed.role)) {
        // Redirect to correct dashboard
        if (parsed.role === 'ADMIN') router.push('/admin/dashboard');
        else if (parsed.role === 'DRIVER') router.push('/driver/dashboard');
        else router.push('/guest/dashboard');
        return;
      }

      setUser(parsed);
      setToken(savedToken);
    } catch {
      localStorage.removeItem('tbs-token');
      localStorage.removeItem('tbs-user');
      localStorage.removeItem('tbs-role');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router, requiredRole]);

  const logout = useCallback(() => {
    localStorage.removeItem('tbs-token');
    localStorage.removeItem('tbs-user');
    localStorage.removeItem('tbs-role');
    document.cookie = 'tbs-token=; Max-Age=0; path=/';
    router.push('/');
  }, [router]);

  return { user, token, loading, logout };
}
