import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('posster_session')?.value;
  const isValid = verifyToken(token);
  return NextResponse.json({ isLoggedIn: isValid });
}
