import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  try {
    const supabase = await createClient();

    const { data: current } = await supabase
      .from('email_tracking')
      .select('open_count')
      .eq('tracking_id', trackingId)
      .single();

    const newCount = (current?.open_count || 0) + 1;

    await supabase
      .from('email_tracking')
      .update({
        opened_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
        open_count: newCount
      })
      .eq('tracking_id', trackingId);

  } catch (error) {
    console.error('Error in email tracking:', error);
  }

  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}