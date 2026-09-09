import { configuredTeamDomain, isAllowedTeamEmail, normalizeEmail } from '@/lib/auth/access';
import { adminClient } from '@/lib/insforge/server';
import { createAuthActions } from '@insforge/sdk/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ''));
  const otp = String(body.otp ?? '').trim();

  let domain: string;
  try {
    domain = configuredTeamDomain();
  } catch {
    return NextResponse.json({ error: 'Konfigurasi domain tim belum tersedia.' }, { status: 500 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || !isAllowedTeamEmail(email, domain)) {
    return NextResponse.json({ error: 'Gunakan email kantor yang terdaftar.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const auth = createAuthActions({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });

  if (!otp) {
    const { error } = await auth.signInWithOtp({ email });
    if (error) {
      return NextResponse.json(
        { error: 'Kode masuk tidak dapat dikirim. Coba lagi setelah 60 detik.' },
        { status: error.statusCode ?? 400 }
      );
    }
    return NextResponse.json({ ok: true, accessStatus: 'code_sent' });
  }

  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: 'Masukkan kode 6 digit.' }, { status: 400 });
  }
  const { data, error } = await auth.verifyOtp({
    email,
    otp,
    name: email.split('@')[0] || 'Anggota',
  });
  if (error || !data?.user?.email) {
    return NextResponse.json(
      { error: 'Kode salah atau kedaluwarsa.' },
      { status: error?.statusCode ?? 401, headers: response.headers }
    );
  }

  const { data: accessStatus, error: accessError } = await adminClient().database.rpc(
    'register_team_access_request',
    {
      p_user_id: data.user.id,
      p_email: data.user.email,
      p_display_name: data.user.profile?.name ?? email.split('@')[0],
      p_allowed_domain: domain,
    }
  );
  if (accessError) {
    await auth.signOut();
    return NextResponse.json(
      { error: 'Permintaan akses tidak dapat dibuat.' },
      { status: 403, headers: response.headers }
    );
  }

  return NextResponse.json({ ok: true, accessStatus }, { headers: response.headers });
}
