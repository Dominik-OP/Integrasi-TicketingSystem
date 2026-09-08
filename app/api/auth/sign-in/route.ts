import { adminClient } from '@/lib/insforge/server';
import { createAuthActions } from '@insforge/sdk/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body.password ?? '');
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return NextResponse.json(
      { error: 'Masukkan email valid dan password minimal 6 karakter.' },
      { status: 400 }
    );
  }

  const cookieResponse = NextResponse.json({ ok: true });
  const auth = createAuthActions({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    requestCookies: await cookies(),
    responseCookies: cookieResponse.cookies,
  });

  const signInResult = await auth.signInWithPassword({ email, password });
  let authUser = signInResult.data?.user;
  if (signInResult.error || !authUser) {
    const { count, error: countError } = await adminClient()
      .database.from('team_members')
      .select('user_id', { count: 'exact', head: true });
    if (countError || count !== 0) {
      return NextResponse.json({ error: 'Email atau password tidak cocok.' }, { status: 401 });
    }

    const signUpResult = await auth.signUp({
      email,
      password,
      name: email.split('@')[0] || 'Admin',
    });
    if (signUpResult.error || !signUpResult.data?.user) {
      return NextResponse.json(
        { error: signUpResult.error?.message ?? 'Akun Admin pertama tidak dapat dibuat.' },
        { status: 400 }
      );
    }
    authUser = signUpResult.data.user;
  }

  const { error: memberError } = await adminClient().database.rpc('bootstrap_first_admin', {
    p_user_id: authUser.id,
    p_email: authUser.email,
    p_display_name: authUser.profile?.name ?? email.split('@')[0] ?? 'Admin',
  });
  if (memberError) {
    await auth.signOut();
    return NextResponse.json(
      { error: 'Email ini belum terdaftar sebagai anggota tim. Hubungi administrator.' },
      { status: 403, headers: cookieResponse.headers }
    );
  }

  return cookieResponse;
}
