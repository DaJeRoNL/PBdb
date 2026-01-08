import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  try {
    const { fileId, accessToken } = await req.json();
    const serviceAccountEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!fileId || !accessToken || !serviceAccountEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize OAuth2 client with the user's access token from the Picker
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth });

    // Add the Service Account as a Viewer
    // Crucial: sendNotificationEmail: false makes it silent
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
    console.error('Permission Error:', error);
    
    // If the service account already has permission, Drive API might return 400 or 403 details, 
    // but usually it just works or throws a "member already exists" type error which is fine to ignore.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}