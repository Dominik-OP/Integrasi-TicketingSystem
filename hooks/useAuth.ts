'use client';
import type { TeamAccessStatus } from '@/lib/auth/access';
import type { Member } from '@/lib/domain';
import { hasPermission, type Permission, type RoleDefinition } from '@/lib/permissions';
import { useCallback, useEffect, useState } from 'react';

const guest: Member = { id: '', name: 'Tamu', email: '', role: 'Agent', active: false };

export function useAuth(_team: Member[], roles: RoleDefinition[], _ready: boolean) {
  const [user, setUser] = useState<Member>(guest);
  const [signedIn, setSignedIn] = useState(false);
  const [accessStatus, setAccessStatus] = useState<TeamAccessStatus>('unauthenticated');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => response.json().catch(() => ({ user: null })))
      .then((data) => {
        setUser(data.user ?? guest);
        setSignedIn(Boolean(data.user));
        setAccessStatus(data.accessStatus ?? 'unauthenticated');
      })
      .catch(() => {
        setSignedIn(false);
        setAccessStatus('unauthenticated');
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, otp?: string) => {
    const response = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Proses masuk gagal.');
    }
    if (data.accessStatus !== 'code_sent') {
      setAccessStatus(data.accessStatus ?? 'unauthorized');
      setSignedIn(data.accessStatus === 'active');
    }
    return data.accessStatus as TeamAccessStatus | 'code_sent';
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    setUser(guest);
    setSignedIn(false);
    setAccessStatus('unauthenticated');
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
    accessStatus,
    authLoading,
    setSignedIn,
    can,
    canManage,
    canSettings,
    signIn,
    signOut,
  };
}
