import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signToken } from '../../../lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === 'boma2026' && password === 'bomakeren2026') {
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      const token = signToken(username, expiresAt);

      const cookieStore = await cookies();
      cookieStore.set('posster_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 // 24 hours in seconds
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: 'Username atau password salah.' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}
