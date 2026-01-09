import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Force dynamic to prevent static generation issues with searchParams
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
  }

  try {
    // 1. Authenticate with Google Service Account using env vars
    // Ensure you've added GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY to your .env.local
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines for the private key
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 2. Get file metadata (for MIME type and name)
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'mimeType, name',
    });

    // 3. Get the file content as a stream
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // 4. Create a web-standard ReadableStream from the Node.js stream
    const stream = new ReadableStream({
      start(controller) {
        response.data.on('data', (chunk) => controller.enqueue(chunk));
        response.data.on('end', () => controller.close());
        response.data.on('error', (err) => controller.error(err));
      },
    });

    // 5. Return the file stream to the client with correct headers
    return new NextResponse(stream, {
      headers: {
        'Content-Type': metadata.data.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${metadata.data.name}"`,
        // Cache for 1 hour to improve performance
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error: any) {
    console.error('Drive Proxy Error:', error.message);
    
    // Handle specific Google API errors gracefully
    if (error.code === 403) {
      return NextResponse.json(
        { error: 'Permission denied. Ensure the file is shared with the Service Account email.' },
        { status: 403 }
      );
    }
    if (error.code === 404) {
      return NextResponse.json({ error: 'File not found or ID is incorrect.' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}