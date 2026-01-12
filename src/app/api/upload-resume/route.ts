import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const candidateId = formData.get('candidateId') as string;

    if (!file || !folderId) {
        return NextResponse.json({ error: 'Missing file or folderId' }, { status: 400 });
    }

    // --- GOOGLE AUTH ---
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // --- STREAM UPLOAD ---
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
        name: `${candidateId}_${file.name}`,
        parents: [folderId],
    };

    const media = {
        mimeType: file.type,
        body: stream,
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true, 
    });

    return NextResponse.json({
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
        downloadLink: response.data.webContentLink
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}