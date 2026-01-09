import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Force dynamic to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
  }

  try {
    // --- 1. SECURITY & AUTHENTICATION ---
    const cookieStore = await cookies();
    
    // Create an authenticated Supabase client using the request cookies
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored as this route is read-only.
            }
          },
        },
      }
    );

    // A. Check if user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // B. Fetch User Profile to determine Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    // C. Authorization Check (IDOR Protection)
    // Verify that the requested fileId actually exists in a contract_url visible to this user.
    let isAuthorized = false;

    if (profile.role === 'internal') {
      // Internal staff can access contracts associated with ANY client
      const { data } = await supabase
        .from('clients')
        .select('id')
        .ilike('contract_url', `%${fileId}%`)
        .limit(1);
      
      if (data && data.length > 0) isAuthorized = true;

    } else {
      // External clients can ONLY access contracts associated with THEIR specific account
      if (profile.client_id) {
        const { data } = await supabase
          .from('clients')
          .select('id')
          .eq('id', profile.client_id)
          .ilike('contract_url', `%${fileId}%`)
          .single();
        
        if (data) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      // Log this security event internally
      console.warn(`SECURITY ALERT: Unauthorized file access attempt. User: ${user.id}, File: ${fileId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- 2. GOOGLE DRIVE FETCH ---
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Handle newline characters in private key for Vercel/Env variables
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Get metadata (for MIME type and name)
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'mimeType, name',
    });

    // Get content stream
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Create a web-standard ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        response.data.on('data', (chunk) => controller.enqueue(chunk));
        response.data.on('end', () => controller.close());
        response.data.on('error', (err) => controller.error(err));
      },
    });

    // LOG SUCCESSFUL ACCESS
    // Note: Use .rpc() to call the secure function we just made
    await supabase.rpc('log_security_event', {
      p_event_type: 'contract_view',
      p_user_id: user.id,
      p_metadata: { file_id: fileId, role: profile.role },
      p_severity: 'info'
    });

    // Return stream with headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': metadata.data.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${metadata.data.name}"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error: any) {
    // Secure error logging (do not expose stack trace to client)
    console.error('Secure Drive Proxy Error'); 
    
    if (error.code === 403) return NextResponse.json({ error: 'Upstream Permission Denied' }, { status: 403 });
    if (error.code === 404) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}