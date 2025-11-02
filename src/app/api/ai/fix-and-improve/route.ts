import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { content, type, cvData, jobData } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'summary' && type !== 'experience')) {
      return NextResponse.json(
        { success: false, error: 'Type must be "summary" or "experience"' },
        { status: 400 }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'summary') {
      // Fix and improve professional summary
      systemPrompt = `You are an expert CV/resume writer and career coach. Your task is to fix grammar, improve clarity, and enhance the professional summary while maintaining the original meaning and keeping it concise.`;

      userPrompt = `Original Professional Summary:
${content}

Context:
${cvData ? `- CV Data: ${JSON.stringify(cvData, null, 2)}` : ''}
${jobData ? `- Job Context: ${JSON.stringify(jobData, null, 2)}` : ''}

Instructions:
1. Fix any grammatical errors and improve sentence structure
2. Enhance clarity and professional tone
3. Keep it concise (2-4 sentences maximum)
4. Use strong action verbs and quantifiable achievements when possible
5. Ensure it's ATS-friendly
6. Maintain the original meaning and key points
7. Return ONLY the improved text, no explanations or markdown formatting
8. If the content is in HTML, preserve basic formatting but clean it up

Please provide the improved professional summary:`;
    } else if (type === 'experience') {
      // Convert to STAR method bullet points
      systemPrompt = `You are an expert CV/resume writer and career coach. Your task is to convert job experience descriptions into powerful, ATS-friendly bullet points using the STAR (Situation-Task-Action-Result) method.`;

      userPrompt = `Original Experience Description:
${content}

Context:
${cvData ? `- CV Data: ${JSON.stringify(cvData, null, 2)}` : ''}
${jobData ? `- Job Context: ${JSON.stringify(jobData, null, 2)}` : ''}

Instructions:
1. Convert the description into 3-5 distinct bullet points
2. Each bullet point MUST follow the STAR (Situation-Task-Action-Result) method structure:
   - Situation: Briefly set the context
   - Task: What needed to be done
   - Action: What you did (use strong action verbs)
   - Result: The outcome/impact (quantify when possible)
3. Use strong, quantifiable action verbs at the beginning (e.g., "Led", "Managed", "Developed", "Implemented", "Increased", "Reduced", "Optimized")
4. Quantify achievements with specific numbers, percentages, and metrics
5. Focus on results and impact rather than just responsibilities
6. Ensure ATS-friendly formatting
7. Remove any headers, special characters, or markdown formatting
8. Format as clean bullet points using HTML <ul><li> tags if the original content was HTML, or plain text bullet points (•) if it was plain text
9. Each bullet point should be impactful and stand alone

Please provide the STAR method bullet points:`;
    }

    // Generate content using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const generatedContent = response.text();

    if (!generatedContent) {
      return NextResponse.json(
        { success: false, error: 'No content generated' },
        { status: 500 }
      );
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanedContent = generatedContent.trim();
    cleanedContent = cleanedContent.replace(/```html/g, '').replace(/```/g, '').trim();

    return NextResponse.json({
      success: true,
      content: cleanedContent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI fix and improve error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fix and improve content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
