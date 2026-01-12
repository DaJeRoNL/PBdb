import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// === ZOD SCHEMA DEFINITION ===
// This enforces the structure. If AI returns null or weird formats, this fixes it.
const ResumeSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  country_emoji: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  skills: z.array(z.string()).nullable().optional().default([]),
  experience: z.array(
    z.object({
      title: z.string().nullable().optional().default(''),
      company: z.string().nullable().optional().default(''),
      duration: z.string().nullable().optional().default(''),
    })
  ).nullable().optional().default([]),
  education: z.array(
    z.object({
      degree: z.string().nullable().optional().default(''),
      institution: z.string().nullable().optional().default(''),
      year: z.string().nullable().optional().default(''),
    })
  ).nullable().optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const { fileId, candidateId } = await request.json();

    if (!fileId || !candidateId) {
      return NextResponse.json({ error: 'Missing fileId or candidateId' }, { status: 400 });
    }

    // 1. Authenticate (Service Account)
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'], 
    });

    const drive = google.drive({ version: 'v3', auth });

    let fileBuffer: Buffer;
    let mimeType = 'application/pdf';

    // 2. Get Metadata 
    const metaResponse = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true 
    });

    const fileMeta = metaResponse.data;
    const isGoogleDoc = fileMeta.mimeType === 'application/vnd.google-apps.document';

    console.log(`Found file: ${fileMeta.name} (${fileMeta.mimeType})`);

    // 3. Download or Export based on type
    if (isGoogleDoc) {
      console.log('Exporting Google Doc as PDF...');
      const exportResponse = await drive.files.export({
        fileId: fileId,
        mimeType: 'application/pdf'
      }, { responseType: 'arraybuffer' });
      
      fileBuffer = Buffer.from(exportResponse.data as ArrayBuffer);
      mimeType = 'application/pdf'; 

    } else {
      console.log('Downloading binary file...');
      const downloadResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true 
      }, { responseType: 'arraybuffer' });

      fileBuffer = Buffer.from(downloadResponse.data as ArrayBuffer);
      mimeType = fileMeta.mimeType || 'application/pdf'; 
    }

    // 4. Send to Gemini
    const base64File = fileBuffer.toString('base64');
    
    // Using standard flash model. 
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      You are an expert Resume Parser. 
      Analyze the attached resume document and extract the following information into a strict JSON format.
      Return ONLY the JSON. Do not include markdown formatting like \`\`\`json.

      Required JSON Structure:
      {
        "name": "Full Name",
        "email": "email address",
        "phone": "phone number",
        "location": "City, Country (e.g. London, UK) or full address if available",
        "country_emoji": "The flag emoji for the candidate's country location (e.g. 🇺🇸, 🇬🇧, 🇳🇱). Return null if location is unclear.",
        "skills": ["skill1", "skill2"],
        "experience": [
          { "title": "Job Title", "company": "Company Name", "duration": "Dates" }
        ],
        "education": [
          { "degree": "Degree Name", "institution": "School Name", "year": "Year" }
        ],
        "summary": "Brief professional summary."
      }
      If a field is not found, use null or empty array.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64File,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Clean JSON
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let rawData;
    try {
        rawData = JSON.parse(jsonString);
    } catch (e) {
        console.error("Gemini returned invalid JSON:", text);
        throw new Error("AI parsing failed to return valid JSON");
    }

    // === 5. VALIDATE WITH ZOD ===
    const parsedResult = ResumeSchema.safeParse(rawData);

    if (!parsedResult.success) {
        console.error("Zod Validation Error:", parsedResult.error);
        throw new Error("AI returned data that did not match the expected schema");
    }

    const parsed_data = parsedResult.data;

    // 6. Update Database
    const supabase = await createClient();

    const { data: existingDoc } = await supabase
      .from('candidate_documents')
      .select('id')
      .eq('file_id', fileId)
      .single();

    const dbRecord = {
        parsing_status: 'completed',
        parsed_at: new Date().toISOString(),
        parsed_data,
        updated_at: new Date().toISOString()
    };

    if (existingDoc) {
        await supabase
        .from('candidate_documents')
        .update(dbRecord)
        .eq('file_id', fileId);
    } else {
        await supabase.from('candidate_documents').insert([{
            candidate_id: candidateId,
            file_id: fileId,
            document_type: 'resume',
            file_name: fileMeta.name || 'Linked Resume',
            ...dbRecord
        }]);
    }

    return NextResponse.json({ success: true, parsed_data });

  } catch (error: any) {
    console.error('Final Parse Error:', error);
    if (error.code === 404) {
         return NextResponse.json({ error: 'Service Account cannot access this file. Ensure the file is in a folder shared with the Service Account email.' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}