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
  let promptText = '';
  try {
    const { prompt, cvData, jobData } = await request.json();
    promptText = String(prompt || '');

    if (!promptText) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Create a more detailed prompt for better AI responses
    const enhancedPrompt = `
You are an expert CV/resume writer and career coach. Your task is to improve CV content based on the following request:

${promptText}

Additional Context:
- CV Data: ${JSON.stringify(cvData || {}, null, 2)}
- Job Context: ${jobData ? JSON.stringify(jobData, null, 2) : 'No specific job context'}

Guidelines for improvement:
1. Use strong action verbs (developed, implemented, led, managed, created, designed, optimized, increased, reduced)
2. Quantify achievements with specific numbers, percentages, and metrics
3. Focus on results and impact rather than just responsibilities
4. Use professional, concise language
5. Ensure ATS-friendly formatting and keywords
6. Tailor content to the job context when available
7. Keep suggestions practical and implementable

Please provide the improved content only, without explanations or markdown formatting.
`;

    // Generate content using Gemini with fallback
    const content = await callGeminiWithFallback(enhancedPrompt);

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
    console.error('AI content improvement error:', error);
    
    // Fallback response for when AI is not available
    const fallbackResponses = {
      summary: 'Experienced professional with proven track record of delivering results and driving innovation. Skilled in strategic planning, team leadership, and process optimization.',
      description: 'Led cross-functional teams to deliver high-impact solutions that improved efficiency and drove business growth.',
      highlights: '• Increased team productivity by 25% through process optimization\n• Managed team of 8 developers across multiple projects\n• Delivered project 2 weeks ahead of schedule\n• Reduced costs by $50K through strategic planning',
      achievements: '• Led team of 5 developers to deliver project on time\n• Improved system performance by 30%\n• Reduced customer complaints by 25%',
      skills: 'JavaScript, React, Node.js, TypeScript, AWS, Docker, Git, Agile, Scrum, Leadership, Communication, Problem-solving',
      projects: 'Developed full-stack web application using React and Node.js, resulting in 40% improvement in user engagement.',
      position: 'Senior Software Engineer',
      company: 'Technology company specializing in innovative solutions'
    };

    // Determine the type of content being improved
    let fallbackContent = 'Improved content based on best practices...';
    if (promptText.includes('summary')) fallbackContent = fallbackResponses.summary;
    else if (promptText.includes('description')) fallbackContent = fallbackResponses.description;
    else if (promptText.includes('highlights')) fallbackContent = fallbackResponses.highlights;
    else if (promptText.includes('achievements')) fallbackContent = fallbackResponses.achievements;
    else if (promptText.includes('skills')) fallbackContent = fallbackResponses.skills;
    else if (promptText.includes('projects')) fallbackContent = fallbackResponses.projects;
    else if (promptText.includes('position')) fallbackContent = fallbackResponses.position;
    else if (promptText.includes('company')) fallbackContent = fallbackResponses.company;

    return NextResponse.json({
      success: true,
      content: fallbackContent,
      timestamp: new Date().toISOString(),
      note: 'Using fallback response due to AI service unavailability'
    });
  }
}
