import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js'; 
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Shared Drive Folder IDs
const RESUME_FOLDER_ID = "0AJq5x8EIa82CUk9PVA";
const CONTRACT_FOLDER_ID = "0APf87EZ4FGLgUk9PVA";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');
  const contextType = searchParams.get('type'); // 'contract' | 'resume' | null

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
  }

  try {
    // --- 1. AUTHENTICATION ---
    let supabase;
    let user;
    let authError;

    const authHeader = req.headers.get('Authorization');

    if (authHeader) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet) {
               try {
                 cookiesToSet.forEach(({ name, value, options }) =>
                   cookieStore.set(name, value, options)
                 );
               } catch {}
            },
          },
        }
      );
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      authError = error;
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    // --- 2. GOOGLE AUTH ---
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // --- 3. AUTHORIZATION CHECK ---
    let isAuthorized = false;

    if (profile.role === 'internal') {
      
      // Strategy A: Check Database (Fastest)
      if (contextType === 'resume') {
         const { data: docData } = await supabase.from('candidate_documents').select('id').eq('file_id', fileId).limit(1);
         if (docData?.length) isAuthorized = true;
         
         if (!isAuthorized) {
            const { data: candData } = await supabase.from('candidates').select('id').ilike('resume_url', `%${fileId}%`).limit(1);
            if (candData?.length) isAuthorized = true;
         }
      } else {
         const { data: clientData } = await supabase.from('clients').select('id').ilike('contract_url', `%${fileId}%`).limit(1);
         if (clientData?.length) isAuthorized = true;
      }

      // Strategy B: Check Google Drive Folder Parent (Robust Fallback)
      if (!isAuthorized) {
        try {
          // ✅ ADDED supportsAllDrives: true
          const fileMeta = await drive.files.get({
            fileId: fileId,
            fields: 'parents',
            supportsAllDrives: true 
          });
          
          const parents = fileMeta.data.parents || [];
          
          if (contextType === 'resume') {
             if (parents.includes(RESUME_FOLDER_ID)) isAuthorized = true;
          } else {
             if (parents.includes(CONTRACT_FOLDER_ID)) isAuthorized = true;
          }
        } catch (err) {
          console.warn("Failed to check file parent:", err);
        }
      }

    } else {
      // External Client: Strict DB check only
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
      console.warn(`SECURITY: Blocked. User: ${user.id}, File: ${fileId}`);
      return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    // --- 4. STREAM FILE ---
    // ✅ ADDED supportsAllDrives: true
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'mimeType, name',
      supportsAllDrives: true
    });

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    const stream = new ReadableStream({
      start(controller) {
        response.data.on('data', (chunk) => controller.enqueue(chunk));
        response.data.on('end', () => controller.close());
        response.data.on('error', (err) => controller.error(err));
      },
    });

    await supabase.rpc('log_security_event', {
      p_event_type: 'file_view',
      p_user_id: user.id,
      p_metadata: { file_id: fileId, type: contextType },
      p_severity: 'info'
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': metadata.data.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${metadata.data.name}"`,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error: any) {
    console.error('Proxy Error', error);
    if (error.code === 403) return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    if (error.code === 404) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}