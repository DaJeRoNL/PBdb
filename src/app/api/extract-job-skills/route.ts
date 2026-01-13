import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Define schema for strict output
const SkillsSchema = z.object({
  skills: z.array(z.string()).min(1),
  seniority: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description missing' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      Analyze the following Job Description and extract the top 10 most important technical and soft skills required. 
      Also estimate the seniority level (Junior, Mid, Senior, Lead).
      
      Return ONLY a JSON object with this structure:
      {
        "skills": ["skill1", "skill2"],
        "seniority": "Senior"
      }

      Job Description:
      ${description.substring(0, 5000)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean markdown if present
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch (e) {
        // Fallback for simple list if JSON fails
        return NextResponse.json({ skills: [], seniority: 'Unknown' });
    }
    
    // Validate
    const parsed = SkillsSchema.safeParse(data);

    if (!parsed.success) {
        return NextResponse.json({ skills: [], seniority: 'Unknown' });
    }

    return NextResponse.json({ 
      skills: parsed.data.skills.map(s => s.toLowerCase()), // Normalize for matching
      seniority: parsed.data.seniority 
    });

  } catch (error: any) {
    console.error('Job Parsing Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}