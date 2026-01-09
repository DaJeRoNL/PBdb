import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // --- 1. SECURITY & AUTHENTICATION ---
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignored
            }
          },
        },
      }
    );

    // Check Login
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Role (Strictly INTERNAL only)
    // Only staff should be able to share/link contracts, not clients.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'internal') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- 2. GOOGLE DRIVE PERMISSION LOGIC ---
    const { fileId, accessToken } = await req.json();
    const serviceAccountEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!fileId || !accessToken || !serviceAccountEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize OAuth2 client with the USER'S access token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth });

    // Share file with Service Account
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'user',
        emailAddress: serviceAccountEmail,
      },
      sendNotificationEmail: false,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    // Secure Logging: Don't send full error object to client
    console.error('Permission API Error:', error.message); 
    return NextResponse.json({ error: 'Failed to share file' }, { status: 500 });
  }
}