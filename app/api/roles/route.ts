import { adminClient, currentMember, hasServerPermission } from '@/lib/insforge/server';
import { permissionList, type Permission } from '@/lib/permissions';
import { projectSlug } from '@/lib/projects';
import type { Role } from '@/lib/domain';
import { NextResponse } from 'next/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const levelKeys: Record<Role, string> = { Agent: 'agent', Reviewer: 'reviewer', Admin: 'admin' };
const allowedLevels = new Set<Role>(['Agent', 'Reviewer', 'Admin']);

function roleInput(body: Record<string, unknown>) {
  const permissions =
    body.permissions && typeof body.permissions === 'object'
      ? (body.permissions as Record<string, unknown>)
      : {};
  return {
    id: String(body.id ?? ''),
    name: String(body.name ?? '').trim(),
    base: String(body.base ?? '') as Role,
    permissions: Object.fromEntries(
      permissionList.map(({ key }) => [key, permissions[key] === true])
    ) as Record<Permission, boolean>,
  };
}

function validate(role: ReturnType<typeof roleInput>, needsId: boolean) {
  if (needsId && !uuidPattern.test(role.id)) return 'ID role tidak valid.';
  if (!role.name || role.name.length > 50) return 'Nama role wajib diisi, maksimal 50 karakter.';
  if (!allowedLevels.has(role.base)) return 'Level akses tidak valid.';
  return '';
}

async function authorize() {
  const auth = await currentMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await hasServerPermission(auth.user.id, 'manage_roles'))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }
  return null;
}

function conflict(message: string) {
  const duplicate = /duplicate|unique/i.test(message);
  return NextResponse.json(
    { error: duplicate ? 'Nama role sudah digunakan.' : 'Role gagal disimpan ke backend.' },
    { status: duplicate ? 409 : 400 }
  );
}

function permissionRows(roleId: string, permissions: Record<Permission, boolean>) {
  return permissionList.map(({ key }) => ({
    role_id: roleId,
    permission_key: key,
    allowed: permissions[key],
  }));
}

export async function POST(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const role = roleInput(body);
  const validationError = validate(role, false);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const slug = projectSlug(role.name);
  if (!slug)
    return NextResponse.json(
      { error: 'Nama role harus memuat huruf atau angka.' },
      { status: 400 }
    );
  const admin = adminClient();
  const { data, error } = await admin.database
    .from('roles')
    .insert([{ slug, name: role.name, access_level_key: levelKeys[role.base] }])
    .select('id')
    .single();
  if (error || !data) return conflict(error?.message ?? 'insert failed');

  const roleId = String((data as { id: string }).id);
  const { error: permissionError } = await admin.database
    .from('role_permissions')
    .insert(permissionRows(roleId, role.permissions));
  if (permissionError) {
    await admin.database.from('roles').delete().eq('id', roleId);
    return NextResponse.json({ error: 'Permission role gagal disimpan.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const role = roleInput(body);
  const validationError = validate(role, true);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const admin = adminClient();
  const [
    { data: previous, error: previousError },
    { data: previousPermissions, error: readError },
  ] = await Promise.all([
    admin.database
      .from('roles')
      .select('id, name, access_level_key')
      .eq('id', role.id)
      .maybeSingle(),
    admin.database
      .from('role_permissions')
      .select('role_id, permission_key, allowed')
      .eq('role_id', role.id),
  ]);
  if (previousError || readError) {
    return NextResponse.json({ error: 'Role gagal dibaca.' }, { status: 400 });
  }
  if (!previous) return NextResponse.json({ error: 'Role tidak ditemukan.' }, { status: 404 });

  const { error } = await admin.database
    .from('roles')
    .update({ name: role.name, access_level_key: levelKeys[role.base] })
    .eq('id', role.id);
  if (error) return conflict(error.message);

  const { error: clearError } = await admin.database
    .from('role_permissions')
    .delete()
    .eq('role_id', role.id);
  if (clearError) {
    await admin.database.from('roles').update(previous).eq('id', role.id);
    return NextResponse.json({ error: 'Permission role gagal diperbarui.' }, { status: 400 });
  }

  const { error: permissionError } = await admin.database
    .from('role_permissions')
    .insert(permissionRows(role.id, role.permissions));
  if (permissionError) {
    await admin.database.from('roles').update(previous).eq('id', role.id);
    if (previousPermissions?.length) {
      await admin.database.from('role_permissions').insert(previousPermissions);
    }
    return NextResponse.json({ error: 'Permission role gagal disimpan.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
