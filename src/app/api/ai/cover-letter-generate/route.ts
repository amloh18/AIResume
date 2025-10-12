import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { 
      cvData, 
      jobData, 
      recipientName, 
      companyName 
    } = await request.json();

    if (!cvData || !jobData) {
      return NextResponse.json(
        { success: false, error: 'CV data and job data are required' },
        { status: 400 }
      );
    }

    // Create the enhanced cover letter prompt
    const prompt = createCoverLetterPrompt({
      cvData,
      jobData,
      recipientName,
      companyName
    });

    // Generate content using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No content generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: content.trim(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}

function createCoverLetterPrompt({
  cvData,
  jobData,
  recipientName,
  companyName
}: {
  cvData: any;
  jobData: any;
  recipientName?: string;
  companyName?: string;
}) {
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const jobTitle = jobData?.title || jobData?.jobTitle || 'Position';
  const userName = cvData?.basics?.name || 'Applicant';
  
  return `You are an expert career writer skilled at crafting professional, well-formatted cover letters tailored to job descriptions.  
Using the following JSON data:

Job Data:
${JSON.stringify(jobData, null, 2)}

Candidate CV Data:
${JSON.stringify(cvData, null, 2)}

Write a compelling and personalized cover letter body content.  

CRITICAL REQUIREMENTS:  
- Generate ONLY the body content (no greeting, no closing, no contact info)
- Keep it between 250–350 words for optimal impact
- Maintain a professional, confident, and enthusiastic tone
- Use the candidate's actual name: ${userName}
- Reference the specific job title: ${jobTitle} at ${companyName}
- Align the candidate's key skills, experiences, and achievements with the job requirements
- Start with a strong opening paragraph that immediately establishes the candidate's value proposition
- Use 2–3 well-structured paragraphs highlighting relevant experience and motivation
- Include specific examples of achievements or skills that match the job requirements
- End with a compelling closing paragraph expressing genuine interest and requesting an interview
- Use active voice and strong action verbs
- Follow formal American English language and grammar
- Make it feel personalized and specific to this role, not generic
- Do NOT include "Dear Hiring Manager" or "Sincerely" - just the body content
- Do NOT include placeholders like [Your Name] or [Company Name]
- Use actual details from the CV and job data provided

FORMAT REQUIREMENTS:
- Use **bold** for key skills or achievements you want to emphasize
- Use *italic* for company names or important terms
- Use bullet points (•) for listing multiple achievements or skills
- Use proper paragraph breaks with double line breaks
- Ensure the content flows naturally and professionally

The final output should be ONLY the cover letter body content, ready to be inserted into the letter template.`;
}
