import { permissionList, type Permission } from '@/lib/permissions';
import { adminClient, currentMember, hasServerPermission } from '@/lib/insforge/server';
import { NextResponse } from 'next/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedPermissions = new Set<Permission>(permissionList.map((item) => item.key));

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await currentMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [canManageUsers, canManageRoles] = await Promise.all([
    hasServerPermission(auth.user.id, 'manage_users'),
    hasServerPermission(auth.user.id, 'manage_roles'),
  ]);
  if (!canManageUsers && !canManageRoles) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  const { userId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!uuidPattern.test(userId)) {
    return NextResponse.json({ error: 'ID anggota tidak valid.' }, { status: 400 });
  }

  const admin = adminClient();
  const { data: existing, error: existingError } = await admin.database
    .from('team_members')
    .select('user_id, role_id, display_name, email, is_active, deactivated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: 'Data anggota gagal dibaca.' }, { status: 400 });
  }
  if (!existing) return NextResponse.json({ error: 'Anggota tidak ditemukan.' }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (canManageUsers) {
    const name = String(body.name ?? '').trim();
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: 'Nama anggota wajib diisi, maksimal 100 karakter.' },
        { status: 400 }
      );
    }
    update.display_name = name;
    update.is_active = body.active !== false;
    update.deactivated_at = body.active === false ? new Date().toISOString() : null;
  }

  if (canManageRoles) {
    const roleId = String(body.roleId ?? '');
    if (!uuidPattern.test(roleId)) {
      return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 });
    }
    const { data: role, error: roleError } = await admin.database
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .eq('is_active', true)
      .maybeSingle();
    if (roleError || !role) {
      return NextResponse.json({ error: 'Role aktif tidak ditemukan.' }, { status: 400 });
    }
    update.role_id = roleId;
  }

  const { data: previousOverrides, error: previousOverridesError } = canManageRoles
    ? await admin.database
        .from('user_permission_overrides')
        .select('user_id, permission_key, allowed')
        .eq('user_id', userId)
    : { data: [], error: null };
  if (previousOverridesError) {
    return NextResponse.json({ error: 'Hak akses anggota gagal dibaca.' }, { status: 400 });
  }

  const { error: updateError } = await admin.database
    .from('team_members')
    .update(update)
    .eq('user_id', userId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (canManageRoles) {
    const overrides =
      body.overrides && typeof body.overrides === 'object'
        ? (body.overrides as Record<string, unknown>)
        : {};
    const rows = Object.entries(overrides)
      .filter(
        ([key, value]) => allowedPermissions.has(key as Permission) && typeof value === 'boolean'
      )
      .map(([permission_key, allowed]) => ({ user_id: userId, permission_key, allowed }));

    const { error: clearError } = await admin.database
      .from('user_permission_overrides')
      .delete()
      .eq('user_id', userId);
    if (clearError) {
      await admin.database.from('team_members').update(existing).eq('user_id', userId);
      return NextResponse.json({ error: 'Override hak akses gagal diperbarui.' }, { status: 400 });
    }
    if (rows.length) {
      const { error: overrideError } = await admin.database
        .from('user_permission_overrides')
        .insert(rows);
      if (overrideError) {
        await admin.database.from('team_members').update(existing).eq('user_id', userId);
        await admin.database.from('user_permission_overrides').delete().eq('user_id', userId);
        if (previousOverrides?.length) {
          await admin.database.from('user_permission_overrides').insert(previousOverrides);
        }
        return NextResponse.json({ error: 'Override hak akses gagal disimpan.' }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
