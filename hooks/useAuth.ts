'use client';
import type { Member } from '@/lib/demo';
import { hasPermission, type Permission, type RoleDefinition } from '@/lib/permissions';
import { useCallback, useEffect, useState } from 'react';

const guest: Member = { id: '', name: 'Tamu', email: '', role: 'Agent', active: false };

export function useAuth(_team: Member[], roles: RoleDefinition[], _ready: boolean) {
  const [user, setUser] = useState<Member>(guest);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => (response.ok ? response.json() : { user: null }))
      .then((data) => {
        setUser(data.user ?? guest);
        setSignedIn(Boolean(data.user));
      })
      .catch(() => setSignedIn(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Email atau password tidak cocok.');
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    setUser(guest);
    setSignedIn(false);
  }, []);

  const can = useCallback((key: Permission) => hasPermission(user, roles, key), [user, roles]);
  const canManage = can('assign_ticket');
  const canSettings = (
    ['manage_categories', 'manage_roles', 'manage_projects'] as Permission[]
  ).some(can);
  return {
    user,
    userId: user.id,
    signedIn,
    setSignedIn,
    can,
    canManage,
    canSettings,
    signIn,
    signOut,
  };
}
