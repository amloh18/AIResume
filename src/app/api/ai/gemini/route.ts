import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAnOiNIKp0jVXQeFOYo2Z26Wza8kijf6SA';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

interface GeminiRequest {
  prompt: string;
  context?: string;
  type: 'rewrite' | 'optimize' | 'suggest' | 'generate';
  section?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
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
    const body: GeminiRequest = await request.json();
    const { prompt, context, type, section } = body;

    // Validate required fields
    if (!prompt || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Rate limiting check (basic implementation)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    // In production, implement proper rate limiting with Redis or similar

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

    // Prepare the request to Gemini API
    const geminiRequest = {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\n${userPrompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Make request to Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequest),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      
      // Check if it's a quota error
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'API quota exceeded',
          details: 'The AI service has reached its usage limits. Please try again later or upgrade your plan.',
          retryAfter: '27s'
        }, { status: 429 });
      }
      
      return NextResponse.json({ 
        error: 'AI service temporarily unavailable',
        details: 'Failed to generate content',
        status: response.status
      }, { status: 503 });
    }

    const data: GeminiResponse = await response.json();

    // Extract the generated text
    if (!data.candidates || data.candidates.length === 0) {
      return NextResponse.json({ 
        error: 'No content generated',
        details: 'AI model returned empty response'
      }, { status: 500 });
    }

    const generatedText = data.candidates[0].content.parts[0].text;

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

// Add rate limiting middleware (basic implementation)
function checkRateLimit(clientIP: string): boolean {
  // In production, implement proper rate limiting
  // For now, return true to allow all requests
  return true;
} 