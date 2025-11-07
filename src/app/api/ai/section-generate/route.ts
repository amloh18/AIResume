import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Get API key with fallback
function getGeminiApiKey(): string | null {
  return (
    process.env.gemini_api_key || 
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1 ||
    null
  );
}

function getGeminiApiKey2(): string | null {
  return (
    process.env.gemini_api_key2 || 
    process.env.GEMINI_API_KEY2 ||
    process.env['GEMINI_API-KEY2'] ||
    process.env['gemini_api-key2'] ||
    null
  );
}

// Helper function to call Gemini with fallback
async function callGeminiWithFallback(prompt: string): Promise<string> {
  const apiKeys = [
    { name: 'gemini_api_key', key: getGeminiApiKey() },
    { name: 'gemini_api_key2', key: getGeminiApiKey2() }
  ].filter(k => k.key);

  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  let lastError: Error | null = null;

  for (const { name, key } of apiKeys) {
    try {
      console.log(`🔑 Attempting Gemini API call with ${name}...`);
      const genAI = new GoogleGenAI({ apiKey: key! });
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt
      });
      const text = result.text || '';
      
      if (text) {
        console.log(`✅ Gemini API call successful with ${name}`);
        return text;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${name} failed:`, errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (apiKeys.indexOf(apiKeys.find(k => k.name === name)!) === apiKeys.length - 1) {
        throw lastError;
      }
      console.log(`⏭️  Continuing to next API key...`);
    }
  }

  throw lastError || new Error('Failed to call Gemini API');
}

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
    const content = await callGeminiWithFallback(prompt);

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
