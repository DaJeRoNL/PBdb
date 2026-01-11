import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { fileId, candidateId } = await request.json();

    if (!fileId || !candidateId) {
      return NextResponse.json(
        { error: 'fileId and candidateId are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Placeholder until Gemini integration is fully configured
    const parsed_data = {
      name: '',
      email: '',
      phone: '',
      skills: [],
      experience: [],
      education: [],
      summary: 'Parsed from resume.'
    };

    // Update the document with parsed data
    const { error: updateError } = await supabase
      .from('candidate_documents')
      .update({
        parsing_status: 'completed',
        parsed_data,
        updated_at: new Date().toISOString()
      })
      .eq('file_id', fileId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, parsed_data });
  } catch (error) {
    console.error('Error parsing resume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}