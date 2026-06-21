import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../lib/auth';
import { getSupabaseClient, saveStateToSupabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('posster_session')?.value;
    const isValid = verifyToken(token);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Silakan login sebagai panitia.' },
        { status: 401 }
      );
    }

    const { state } = await request.json();
    if (!state) {
      return NextResponse.json(
        { success: false, message: 'Payload state tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const supabaseUrl = state.supabaseConfig?.url;
    const supabaseAnonKey = state.supabaseConfig?.anonKey;
    
    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    if (!client) {
      return NextResponse.json(
        { success: false, message: 'Gagal menginisialisasi client Supabase di server.' },
        { status: 500 }
      );
    }

    await saveStateToSupabase(client, state);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving state in server route:", error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}
