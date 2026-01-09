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
    // We act on behalf of the USER to share the file with the SERVICE ACCOUNT
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth });

    // Add the Service Account as a Viewer
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'user',
        emailAddress: serviceAccountEmail,
      },
      sendNotificationEmail: false, // Silent share
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Permission Error:', error);
    // Ignore errors if permission already exists
    return NextResponse.json({ error: error.message }, { status: 200 }); // Return 200 to not break frontend flow
  }
}