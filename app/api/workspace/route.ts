/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadWorkspaceRaw } from '@/lib/insforge/data';
import { mapWorkspace } from '@/lib/insforge/mapping';
import {
  adminClient,
  currentMember,
  hasServerPermission,
  serverClient,
} from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await currentMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const raw = await loadWorkspaceRaw(await serverClient());
    const [canManageUsers, canManageRoles] = await Promise.all([
      hasServerPermission(auth.user.id, 'manage_users'),
      hasServerPermission(auth.user.id, 'manage_roles'),
    ]);
    if (canManageUsers || canManageRoles) {
      const admin = adminClient();
      const [{ data: team, error: teamError }, { data: overrides, error: overridesError }] =
        await Promise.all([
          admin.database.from('team_members').select('*').order('display_name'),
          admin.database.from('user_permission_overrides').select('*'),
        ]);
      if (teamError) throw teamError;
      if (overridesError) throw overridesError;
      raw.team = team ?? [];
      raw.overrides = overrides ?? [];
    }
    if (canManageUsers && canManageRoles) {
      const { data, error } = await adminClient()
        .database.from('team_access_requests')
        .select('user_id, email, display_name, requested_at')
        .eq('status', 'pending')
        .order('requested_at');
      if (error) throw error;
      raw.accessRequests = data ?? [];
    }
    const keys = raw.attachments
      .filter((item: any) => item.upload_status === 'ready' && item.storage_key)
      .map((item: any) => item.storage_key as string);
    const { data: signed } = keys.length
      ? await adminClient().storage.from('ticket-attachments').createSignedUrls(keys, 900)
      : { data: [] };
    const urls = Object.fromEntries(
      (signed ?? [])
        .filter((item) => item.signedUrl)
        .map((item) => [item.path, item.signedUrl as string])
    );
    return NextResponse.json(mapWorkspace(raw, urls));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Workspace tidak dapat dimuat.' },
      { status: 500 }
    );
  }
}
