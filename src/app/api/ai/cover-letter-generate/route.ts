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
    let content = response.text();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No content generated' },
        { status: 500 }
      );
    }

    // Clean up the generated content to remove any headers, greetings, or closings
    content = cleanupCoverLetterContent(content, cvData);

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

/**
 * Clean up cover letter content to remove any unwanted headers, greetings, or closings
 */
function cleanupCoverLetterContent(content: string, cvData: any): string {
  let cleaned = content.trim();
  
  // STEP 1: Remove name if it appears at the start (all caps or Title Case)
  if (cvData?.basics?.name) {
    const nameUpper = cvData.basics.name.toUpperCase();
    const nameTitle = cvData.basics.name;
    // Remove name line (case insensitive, with optional newline)
    cleaned = cleaned.replace(new RegExp(`^${nameUpper}\\s*\\n`, 'mi'), '');
    cleaned = cleaned.replace(new RegExp(`^${nameTitle}\\s*\\n`, 'mi'), '');
  }
  
  // STEP 2: Remove any contact information lines (name, phone, email, location patterns)
  // This handles lines with pipes separating contact info (e.g., "location | phone | email")
  const contactPatterns = [
    /^.*\|.*\|.*@.*\n/m, // Line with pipes and email (most specific)
    /^.*\|\s*[+\d].*\|\s*.*@.*\n/m, // Line with pipes, phone, and email
    /^\[object Object\].*\n/m, // Remove "[object Object]" artifacts
    /^.*[+\d]{10,}.*@.*\..+\n/m, // Phone and email on same line
    /^.*@.*\.\w+.*\n/m, // Email line
  ];
  
  contactPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // STEP 3: Remove date lines at the start or after header
  cleaned = cleaned.replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s*\n/mi, '');
  cleaned = cleaned.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*\n/m, '');
  
  // STEP 4: Remove recipient info lines (Hiring Manager, Company Name, etc.)
  cleaned = cleaned.replace(/^(Hiring Manager|Recruitment Team|Human Resources|Dear Hiring Manager)\s*\n/mi, '');
  // Remove company name lines (typically after date)
  cleaned = cleaned.replace(/^[A-Z][a-zA-Z\s&,]+(?:Inc|LLC|Ltd|Corp|Corporation|Company)\.?\s*\n/m, '');
  cleaned = cleaned.replace(/^Company Address.*\n/mi, '');
  // Remove location lines (city, state patterns)
  cleaned = cleaned.replace(/^[A-Z][a-z]+,\s*[A-Z]{2}\s*\n/m, ''); // e.g., "Chicago, IL"
  
  // STEP 5: Remove "Dear..." greeting if present (including any variation)
  cleaned = cleaned.replace(/^Dear\s+[^,\n]+,?\s*\n*/mi, '');
  
  // STEP 6: Remove closing signatures
  const closingPatterns = [
    /\n*Sincerely,?\s*\n*.*/gi,
    /\n*Best regards,?\s*\n*.*/gi,
    /\n*Kind regards,?\s*\n*.*/gi,
    /\n*Yours (sincerely|faithfully),?\s*\n*.*/gi,
    /\n*Thank you for (your consideration|considering my application)[.,]?\s*\n*/gi,
    /\n*I look forward to (hearing from you|speaking with you)[.,]?\s*\n*.*/gi
  ];
  
  closingPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // STEP 7: Remove any remaining header artifacts at the beginning
  // Keep removing lines that look like headers until we hit actual content
  const lines = cleaned.split('\n');
  let startIndex = 0;
  
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      startIndex = i + 1;
      continue;
    }
    
    // Check if this line looks like content (starts with "I" or has multiple words and punctuation)
    const isContent = /^I\s+/i.test(line) || 
                     (/\w+.*\w+/.test(line) && line.length > 50) ||
                     line.startsWith('With') ||
                     line.startsWith('As') ||
                     line.startsWith('Having');
    
    if (isContent) {
      startIndex = i;
      break;
    } else {
      startIndex = i + 1;
    }
  }
  
  cleaned = lines.slice(startIndex).join('\n');
  
  // STEP 8: Clean up excessive newlines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
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
  const jobDescription = jobData?.jobDescription || '';
  const jobTitle = jobData?.title || jobData?.jobTitle || 'Position';
  const userName = cvData?.basics?.name || 'Applicant';
  
  // Extract key experiences and achievements from CV
  const workExperiences = cvData?.work || [];
  const skills = cvData?.skills || [];
  const education = cvData?.education || [];
  
  // Build experience summary
  let experienceSummary = '';
  if (workExperiences.length > 0) {
    const recentExperience = workExperiences[0];
    experienceSummary = `Most recent role: ${recentExperience.position || 'N/A'} at ${recentExperience.name || 'N/A'}`;
    if (recentExperience.highlights && recentExperience.highlights.length > 0) {
      experienceSummary += `\nKey achievements:\n${recentExperience.highlights.slice(0, 3).map((h: string) => `- ${h}`).join('\n')}`;
    }
  }
  
  return `You are an expert career writer crafting a compelling cover letter that will make the candidate stand out.

CANDIDATE PROFILE:
Name: ${userName}
${experienceSummary}
Skills: ${skills.map((s: any) => s.name || s).slice(0, 10).join(', ')}

TARGET ROLE:
Position: ${jobTitle}
Company: ${companyName}
Job Description: ${jobDescription.substring(0, 500)}...

TASK: Write ONLY the body paragraphs of the cover letter (NO header, NO contact info, NO greeting, NO closing signature).

STRUCTURE (3 paragraphs):

Paragraph 1 - Opening Hook (80-100 words):
- Express strong interest in the specific role at the specific company
- Immediately state 1-2 key qualifications that make the candidate an ideal fit
- Reference something specific about the company or role that excites them

Paragraph 2 - Career Highlights (120-150 words):
- Analyze the candidate's work experience from the CV data above
- Pick the 2-3 most relevant achievements that align with the job requirements
- Use specific metrics, percentages, or outcomes from their CV highlights
- Demonstrate how their experience directly translates to this role
- Emphasize skills that match the job description

Paragraph 3 - Value Proposition & Call-to-Action (60-80 words):
- Summarize why they're uniquely qualified for this specific role
- Express enthusiasm about contributing to the company's goals
- Request an interview to discuss how they can add value

CRITICAL RULES:
✗ DO NOT include name, contact information, or location at the top
✗ DO NOT include "Dear Hiring Manager" or any greeting
✗ DO NOT include "Sincerely" or closing signature
✗ DO NOT use "[Your Name]", "[Company]", or any placeholders
✗ DO NOT repeat the same information multiple times
✓ START directly with: "I am writing to express my strong interest..."
✓ Use actual metrics and achievements from the CV data
✓ Reference specific skills and experiences from the CV
✓ Keep it professional, confident, and specific to this role

FORMAT:
- Use **bold** sparingly for 2-3 key achievements or skills
- Separate paragraphs with double line breaks
- Write in active voice with strong action verbs

Output ONLY the 3 body paragraphs. Nothing else.`;
}
