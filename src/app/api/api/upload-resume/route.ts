import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const folderId = formData.get('folderId') as string;

  // Initialize Google Drive API
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // Upload file
  const buffer = await file.arrayBuffer();
  const { data } = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [folderId]
    },
    media: {
      mimeType: file.type,
      body: Buffer.from(buffer)
    },
    fields: 'id, webViewLink'
  });

  return NextResponse.json({
    fileId: data.id,
    webViewLink: data.webViewLink
  });
}