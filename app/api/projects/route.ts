import { adminClient, currentMember, hasServerPermission } from '@/lib/insforge/server';
import { projectSlug, type Project } from '@/lib/projects';
import { NextResponse } from 'next/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const prefixPattern = /^[A-Z]{2,8}$/;

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  ticket_prefix: string;
  description: string;
  is_active: boolean;
};

function mapProject(row: ProjectRow): Project {
  return {
    id: row.slug,
    databaseId: row.id,
    name: row.name,
    prefix: row.ticket_prefix,
    description: row.description,
    active: row.is_active,
  };
}

function projectInput(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? '').trim(),
    ticket_prefix: String(body.prefix ?? '')
      .trim()
      .toUpperCase(),
    description: String(body.description ?? '').trim(),
    is_active: body.active !== false,
  };
}

function validate(input: ReturnType<typeof projectInput>) {
  if (!input.name || input.name.length > 80)
    return 'Nama project wajib diisi, maksimal 80 karakter.';
  if (!prefixPattern.test(input.ticket_prefix)) return 'Prefix harus 2–8 huruf A–Z.';
  if (input.description.length > 180) return 'Deskripsi maksimal 180 karakter.';
  return '';
}

async function authorize() {
  const auth = await currentMember();
  if (!auth) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!(await hasServerPermission(auth.user.id, 'manage_projects'))) {
    return { error: NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 }) };
  }
  return { auth };
}

async function nameExists(name: string, exceptId?: string) {
  const { data, error } = await adminClient()
    .database.from('projects')
    .select('id, name')
    .limit(500);
  if (error) throw error;
  const normalizedName = name.toLocaleLowerCase('id-ID');
  return (data ?? []).some(
    (row: { id: string; name: string }) =>
      row.id !== exceptId && row.name.toLocaleLowerCase('id-ID') === normalizedName
  );
}

function databaseError(message: string) {
  if (/duplicate|unique/i.test(message)) {
    return NextResponse.json(
      { error: 'Nama link atau prefix sudah digunakan project lain.' },
      { status: 409 }
    );
  }
  return NextResponse.json({ error: 'Project gagal disimpan ke backend.' }, { status: 400 });
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if ('error' in authorization) return authorization.error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = projectInput(body);
  const validationError = validate(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  try {
    if (await nameExists(input.name)) {
      return NextResponse.json({ error: 'Nama project sudah digunakan.' }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: 'Validasi project gagal.' }, { status: 400 });
  }

  const slug = projectSlug(input.name);
  if (!slug) {
    return NextResponse.json(
      { error: 'Nama project harus memuat minimal satu huruf atau angka untuk link.' },
      { status: 400 }
    );
  }

  const { data, error } = await adminClient()
    .database.from('projects')
    .insert([{ slug, ...input }])
    .select('id, slug, name, ticket_prefix, description, is_active')
    .single();
  if (error || !data) return databaseError(error?.message ?? 'insert failed');
  return NextResponse.json({ project: mapProject(data as ProjectRow) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await authorize();
  if ('error' in authorization) return authorization.error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const databaseId = String(body.databaseId ?? '');
  const input = projectInput(body);
  const validationError = validate(input);
  if (!uuidPattern.test(databaseId) || validationError) {
    return NextResponse.json(
      { error: validationError || 'ID project tidak valid.' },
      { status: 400 }
    );
  }

  try {
    if (await nameExists(input.name, databaseId)) {
      return NextResponse.json({ error: 'Nama project sudah digunakan.' }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: 'Validasi project gagal.' }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .database.from('projects')
    .update(input)
    .eq('id', databaseId)
    .select('id, slug, name, ticket_prefix, description, is_active')
    .maybeSingle();
  if (error) return databaseError(error.message);
  if (!data) return NextResponse.json({ error: 'Project tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ project: mapProject(data as ProjectRow) });
}
