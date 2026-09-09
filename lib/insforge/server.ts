import { createAdminClient } from '@insforge/sdk';
import { createServerClient } from '@insforge/sdk/ssr';
import { cookies } from 'next/headers';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Konfigurasi server ${name} belum tersedia.`);
  return value;
}

export function adminClient() {
  return createAdminClient({
    baseUrl: required('INSFORGE_URL'),
    apiKey: required('INSFORGE_API_KEY'),
  });
}

export async function serverClient() {
  return createServerClient({
    baseUrl: required('NEXT_PUBLIC_INSFORGE_URL'),
    anonKey: required('NEXT_PUBLIC_INSFORGE_ANON_KEY'),
    cookies: await cookies(),
  });
}

export async function currentUser() {
  const client = await serverClient();
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function currentMember() {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await adminClient()
    .database.from('team_members')
    .select('user_id, role_id, display_name, email, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return { user, member: data };
}

export async function hasServerPermission(userId: string, permission: string) {
  const { data, error } = await adminClient().database.rpc('has_permission_for_user', {
    p_user_id: userId,
    p_permission_key: permission,
  });
  return !error && data === true;
}
