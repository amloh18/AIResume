import { NextRequest, NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityRequest {
  prompt: string;
  context?: string;
  type: 'rewrite' | 'optimize' | 'suggest' | 'generate';
  section?: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Verify request method
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Parse request body
    const body: PerplexityRequest = await request.json();
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
        systemPrompt = `You are an expert CV/resume writer. Rewrite the following content to be more professional, impactful, and engaging while maintaining the original meaning and facts. Use action verbs and quantifiable achievements where possible.`;
        userPrompt = `Content to rewrite: ${prompt}\n\nPlease provide the rewritten version:`;
        break;

      case 'optimize':
        systemPrompt = `You are an expert CV/resume optimizer. Optimize the following content for Applicant Tracking Systems (ATS) by incorporating relevant keywords, improving structure, and ensuring it's easily scannable.`;
        userPrompt = `Content to optimize: ${prompt}\n\nSection: ${section || 'general'}\n\nPlease provide the optimized version with relevant keywords:`;
        break;

      case 'suggest':
        systemPrompt = `You are an expert CV/resume consultant. Analyze the following content and provide specific suggestions for improvement, including what to add, remove, or modify to make it more compelling.`;
        userPrompt = `Content to analyze: ${prompt}\n\nSection: ${section || 'general'}\n\nPlease provide specific suggestions for improvement:`;
        break;

      case 'generate':
        systemPrompt = `You are an expert CV/resume writer. Generate professional content based on the following requirements. Make it compelling, specific, and tailored to the request.`;
        userPrompt = `Generate content for: ${prompt}\n\nContext: ${context || 'No additional context provided'}\n\nPlease provide the generated content:`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid type specified' }, { status: 400 });
    }

    // Prepare the request to Perplexity API
    const perplexityRequest = {
      model: "sonar-pro-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.95,
      stream: false
    };

    // Make request to Perplexity API
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(perplexityRequest),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Perplexity API error:', errorData);
      
      // Check if it's a quota error
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'API quota exceeded',
          details: 'The Perplexity AI service has reached its usage limits. Please try again later.',
          provider: 'perplexity'
        }, { status: 429 });
      }
      
      return NextResponse.json({ 
        error: 'AI service temporarily unavailable',
        details: 'Failed to generate content',
        provider: 'perplexity',
        status: response.status
      }, { status: 503 });
    }

    const data: PerplexityResponse = await response.json();

    // Extract the generated text
    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json({ 
        error: 'No content generated',
        details: 'AI model returned empty response',
        provider: 'perplexity'
      }, { status: 500 });
    }

    const generatedText = data.choices[0].message.content;

    // Log successful request (without sensitive data)
    console.log(`Perplexity AI request completed - Type: ${type}, Section: ${section || 'general'}`);

    return NextResponse.json({
      success: true,
      content: generatedText,
      type,
      section: section || 'general',
      provider: 'perplexity'
    });

  } catch (error) {
    console.error('Perplexity AI API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'Failed to process AI request',
      provider: 'perplexity'
    }, { status: 500 });
  }
} 