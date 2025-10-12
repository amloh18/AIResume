import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { 
      cvData, 
      jobData, 
      currentText, 
      sectionType, 
      jobTitle, 
      companyName 
    } = await request.json();

    if (!cvData || !currentText || !sectionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the enhanced prompt based on the guide
    const prompt = createSectionGenerationPrompt({
      cvData,
      jobData,
      currentText,
      sectionType,
      jobTitle,
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
      sectionType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Section generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

function createSectionGenerationPrompt({
  cvData,
  jobData,
  currentText,
  sectionType,
  jobTitle,
  companyName
}: {
  cvData: any;
  jobData: any;
  currentText: string;
  sectionType: string;
  jobTitle?: string;
  companyName?: string;
}) {
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  
  return `You are an expert career coach and a highly effective copywriter. Your task is to rewrite a single job description into powerful, ATS-friendly bullet points.

Here is the full context:
- User's Full CV: ${JSON.stringify(cvData, null, 2)}
- Original Job Description: ${jobDescription}
- User's current text to rewrite: "${currentText}"
- This is for the job title: ${jobTitle || 'Position'} at ${companyName || 'Company'}

Instructions:
1. Analyze the Original Job Description to find the most relevant keywords, skills, and requirements.
2. Rewrite the user's text into 3 to 5 distinct bullet points.
3. Each bullet point MUST follow the "Challenge-Action-Result" (CAR) framework.
4. Integrate the keywords from the Original Job Description naturally into the rewritten bullet points.
5. Use strong, quantifiable action verbs at the beginning of each bullet point (e.g., "Managed," "Spearheaded," "Analyzed").
6. **CRITICAL:** Remove any headers like "Tasks:", "Requirements:", "Benefits:", or any special characters (e.g., "-"). Only generate clean bullet points.
7. Be concise and impactful. Do not write a paragraph.
8. Format the response as a clean, markdown bulleted list. Do NOT include any special characters or symbols that are not standard markdown.`;
}
