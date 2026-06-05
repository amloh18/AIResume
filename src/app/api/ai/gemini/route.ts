import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';

interface GeminiRequest {
  prompt: string;
  context?: string;
  type: 'rewrite' | 'optimize' | 'suggest' | 'generate';
  section?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify request method
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Parse request body
    const body: GeminiRequest = await request.json();
    const { prompt, context, type, section } = body;

    // Validate required fields
    if (!prompt || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Construct the prompt based on type
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'rewrite':
        systemPrompt = `You are an expert career coach and a highly effective copywriter. Your task is to rewrite content into powerful, ATS-friendly bullet points following the "Challenge-Action-Result" (CAR) framework.`;
        userPrompt = `Content to rewrite: ${prompt}\n\nInstructions:
1. Rewrite into 3-5 distinct bullet points
2. Each bullet point MUST follow the "Challenge-Action-Result" (CAR) framework
3. Use strong, quantifiable action verbs at the beginning
4. Remove any headers like "Tasks:", "Requirements:", "Benefits:", or special characters
5. Be concise and impactful
6. Format as clean markdown bulleted list

Please provide the rewritten version:`;
        break;

      case 'optimize':
        systemPrompt = `You are an expert CV/resume optimizer. Optimize the following content for Applicant Tracking Systems (ATS) by incorporating relevant keywords, improving structure, and ensuring it's easily scannable.`;
        userPrompt = `Content to optimize: ${prompt}\n\nSection: ${section || 'general'}\n\nInstructions:
1. Integrate relevant keywords naturally
2. Use strong action verbs
3. Focus on quantifiable achievements
4. Ensure ATS-friendly formatting
5. Make content more scannable

Please provide the optimized version:`;
        break;

      case 'suggest':
        systemPrompt = `You are an expert CV/resume consultant. Analyze the following content and provide specific, actionable suggestions for improvement.`;
        userPrompt = `Content to analyze: ${prompt}\n\nSection: ${section || 'general'}\n\nInstructions:
1. Provide specific, actionable recommendations
2. Focus on quantifiable improvements
3. Consider ATS optimization
4. Be realistic and implementable
5. Use professional language

Please provide specific suggestions for improvement:`;
        break;

      case 'generate':
        systemPrompt = `You are an expert CV/resume writer. Generate professional content based on the following requirements. Make it compelling, specific, and tailored to the request.`;
        userPrompt = `Generate content for: ${prompt}\n\nContext: ${context || 'No additional context provided'}\n\nInstructions:
1. Be specific and compelling
2. Use action verbs and quantifiable achievements
3. Tailor to the specific request
4. Focus on results and impact
5. Keep it professional and concise

Please provide the generated content:`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid type specified' }, { status: 400 });
    }

    // Use Gemini API with fallback across all 3 keys
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    let generatedText: string | null = null;

    try {
      generatedText = await callGeminiWithAllKeysFallback(fullPrompt, {
        action: `gemini_${type}`,
        endpoint: '/api/ai/gemini'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a quota error
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        return NextResponse.json({ 
          error: 'API quota exceeded',
          details: 'The AI service has reached its usage limits. Please try again later or upgrade your plan.',
          retryAfter: '30s'
        }, { status: 429 });
      }

      return NextResponse.json({ 
        error: 'AI service temporarily unavailable',
        details: `Failed to generate content: ${errorMessage}`,
        status: 503
      }, { status: 503 });
    }

    if (!generatedText) {
      return NextResponse.json({ 
        error: 'No content generated',
        details: 'AI model returned empty response'
      }, { status: 500 });
    }

    // Log successful request (without sensitive data)
    console.log(`AI request completed - Type: ${type}, Section: ${section || 'general'}`);

    return NextResponse.json({
      success: true,
      content: generatedText,
      type,
      section: section || 'general'
    });

  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'Failed to process AI request'
    }, { status: 500 });
  }
} 