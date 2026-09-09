import type { Category } from '@/lib/domain';
import { adminClient, currentMember, hasServerPermission } from '@/lib/insforge/server';
import { projectSlug } from '@/lib/projects';
import { NextResponse } from 'next/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const priorities = new Set(['low', 'medium', 'high', 'urgent']);

type CategoryRow = {
  id: string;
  name: string;
  default_priority: string;
  is_active: boolean;
};

function input(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? '').trim(),
    priority: String(body.priority ?? '')
      .trim()
      .toLowerCase(),
    response: Number(body.response),
    resolution: Number(body.resolution),
    active: body.active !== false,
  };
}

function validate(data: ReturnType<typeof input>) {
  if (!data.name || data.name.length > 80)
    return 'Nama kategori wajib diisi, maksimal 80 karakter.';
  if (!priorities.has(data.priority)) return 'Prioritas kategori tidak valid.';
  if (!Number.isInteger(data.response) || data.response < 1 || data.response > 720) {
    return 'Target respons harus 1–720 jam.';
  }
  if (
    !Number.isInteger(data.resolution) ||
    data.resolution < data.response ||
    data.resolution > 2160
  ) {
    return 'Target penyelesaian harus antara target respons dan 2160 jam.';
  }
  return '';
}

async function authorize() {
  const auth = await currentMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await hasServerPermission(auth.user.id, 'manage_categories'))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }
  return null;
}

function responseCategory(row: CategoryRow, response: number, resolution: number): Category {
  return {
    id: row.id,
    name: row.name,
    priority: row.default_priority.charAt(0).toUpperCase() + row.default_priority.slice(1),
    response,
    resolution,
    active: row.is_active,
  };
}

function conflict(message: string) {
  const duplicate = /duplicate|unique/i.test(message);
  return NextResponse.json(
    { error: duplicate ? 'Nama kategori sudah digunakan.' : 'Kategori gagal disimpan ke backend.' },
    { status: duplicate ? 409 : 400 }
  );
}

export async function POST(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const data = input(body);
  const validationError = validate(data);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const slug = projectSlug(data.name);
  if (!slug) {
    return NextResponse.json(
      { error: 'Nama kategori harus memuat huruf atau angka.' },
      { status: 400 }
    );
  }
  const admin = adminClient();
  const { data: category, error } = await admin.database
    .from('categories')
    .insert([
      {
        slug,
        name: data.name,
        default_priority: data.priority,
        is_active: data.active,
      },
    ])
    .select('id, name, default_priority, is_active')
    .single();
  if (error || !category) return conflict(error?.message ?? 'insert failed');

  const { error: slaError } = await admin.database.from('sla_rules').insert([
    {
      category_id: (category as CategoryRow).id,
      response_target_minutes: data.response * 60,
      resolution_target_minutes: data.resolution * 60,
    },
  ]);
  if (slaError) {
    await admin.database
      .from('categories')
      .delete()
      .eq('id', (category as CategoryRow).id);
    return NextResponse.json({ error: 'Aturan SLA gagal disimpan.' }, { status: 400 });
  }
  return NextResponse.json(
    { category: responseCategory(category as CategoryRow, data.response, data.resolution) },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const data = input(body);
  const id = String(body.id ?? '');
  const validationError = validate(data);
  if (!uuidPattern.test(id) || validationError) {
    return NextResponse.json(
      { error: validationError || 'ID kategori tidak valid.' },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const [{ data: previous, error: previousError }, { data: previousSla, error: slaReadError }] =
    await Promise.all([
      admin.database
        .from('categories')
        .select('id, name, default_priority, is_active')
        .eq('id', id)
        .maybeSingle(),
      admin.database
        .from('sla_rules')
        .select('id, response_target_minutes, resolution_target_minutes')
        .eq('category_id', id)
        .maybeSingle(),
    ]);
  if (previousError || slaReadError) {
    return NextResponse.json({ error: 'Kategori gagal dibaca.' }, { status: 400 });
  }
  if (!previous || !previousSla) {
    return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
  }

  const { data: category, error } = await admin.database
    .from('categories')
    .update({ name: data.name, default_priority: data.priority, is_active: data.active })
    .eq('id', id)
    .select('id, name, default_priority, is_active')
    .maybeSingle();
  if (error || !category) return conflict(error?.message ?? 'update failed');

  const { error: slaError } = await admin.database
    .from('sla_rules')
    .update({
      response_target_minutes: data.response * 60,
      resolution_target_minutes: data.resolution * 60,
    })
    .eq('category_id', id);
  if (slaError) {
    await admin.database.from('categories').update(previous).eq('id', id);
    return NextResponse.json({ error: 'Aturan SLA gagal disimpan.' }, { status: 400 });
  }
  return NextResponse.json({
    category: responseCategory(category as CategoryRow, data.response, data.resolution),
  });
}
