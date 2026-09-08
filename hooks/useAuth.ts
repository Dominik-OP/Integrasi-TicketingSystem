'use client';
import { seedMembers, type Member } from '@/lib/demo';
import { hasPermission, type Permission, type RoleDefinition } from '@/lib/permissions';
import { useCallback, useEffect, useState } from 'react';

interface UseAuthReturn {
  user: Member;
  userId: string;
  setUserId: (id: string) => void;
  signedIn: boolean;
  setSignedIn: (v: boolean) => void;
  can: (key: Permission) => boolean;
  canManage: boolean;
  canSettings: boolean;
}

export function useAuth(team: Member[], roles: RoleDefinition[], ready: boolean): UseAuthReturn {
  const [userId, setUserId] = useState('1');
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!ready) return;
    try {
      const session = sessionStorage.getItem('integrasi-session');
      if (session && team.some((m) => m.id === session && m.active)) {
        setUserId(session);
        setSignedIn(true);
      } else {
        setSignedIn(false);
      }
    } catch {
      /* In-memory sign-in remains available when storage is blocked. */
    }
  }, [team, ready]);

  const user: Member =
    team.find((m) => m.id === userId && m.active) ??
    team.find((m) => m.active) ??
    seedMembers[0] ??
    ({
      id: '1',
      name: 'Default',
      email: 'default@demo',
      role: 'Admin' as const,
      active: true,
      roleId: 'admin',
    } satisfies Member);

  const can = useCallback((key: Permission) => hasPermission(user, roles, key), [user, roles]);

  const canManage = can('assign_ticket');
  const canSettings = (
    ['manage_categories', 'manage_roles', 'manage_projects'] as Permission[]
  ).some((k) => can(k));

  return { user, userId, setUserId, signedIn, setSignedIn, can, canManage, canSettings };
}
