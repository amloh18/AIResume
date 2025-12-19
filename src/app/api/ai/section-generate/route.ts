import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';

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

    // Generate content using Gemini with fallback
    const content = await callGeminiWithAllKeysFallback(prompt);

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

  return `You are an expert Senior HR Recruiter and CV Coach. Your task is to rewrite the user's text into high-impact, ATS-optimized bullet points that will pass a 6-second recruiter scan.

CONTEXT:
- Target Job: ${jobTitle || 'Position'} at ${companyName || 'Company'}
- Job Description Keywords: ${jobDescription}
- User's Current Text: "${currentText}"
- Section Type: ${sectionType}

INSTRUCTIONS:
1. **Analyze & Align**: Identify the top 3-5 hard skills and requirements from the Job Description. Ensure the rewritten bullets demonstrate these skills.
2. **CAR Framework**: Every bullet point MUST follow the Challenge-Action-Result structure.
   - *Challenge*: What was the context?
   - *Action*: What specific action did the candidate take? (Use strong verbs like "Engineered", "Spearheaded", "Optimized")
   - *Result*: What was the outcome? (Quantify with numbers, %, $, or time saved).
3. **Quantify Impact**: If the user's text lacks numbers, infer logical metrics or emphasize the *qualitative* result (e.g., "resulting in improved efficiency" -> "increasing workflow efficiency by ~20%"). *Note: Be realistic, do not fabricate impossible numbers, but frame achievements to sound measurable.*
4. **Front-Load Value**: Place the most important keywords and results at the *beginning* of the bullet point.
5. **Remove Fluff**: Delete passive phrases like "Responsible for", "Helped with", "Tasked to". Start directly with the action verb.
6. **Formatting**:
   - Generate 3-5 distinct bullet points.
   - Clean markdown format (just the bullets).
   - NO headers, NO explanations.

OUTPUT:
Provide ONLY the rewritten bullet points in markdown format.`;
}
