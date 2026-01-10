import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
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
    )
    
    // 1. Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // 2. ✅ LOG THE LOGIN EVENT (Server-Side)
      // This runs reliably before the user is even redirected
      await supabase.rpc('log_security_event', {
        p_event_type: 'system_login',
        p_user_id: data.user.id,
        p_metadata: { 
          method: data.user.app_metadata.provider || 'email',
          email: data.user.email 
        },
        p_severity: 'info'
      });

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If error, return to home with error code
  return NextResponse.redirect(`${origin}/?error=auth-code-error`)
}