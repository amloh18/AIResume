import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';

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
8. If the text is a cover letter body, make sure it is comprehensive and meets the industry standard length of at least 1000 characters (approx. 200-300 words), covering introduction, alignment of key qualifications, company motivation, and a professional closing statement. Do not use placeholders or shorthand.

Please provide the improved content only, without explanations or markdown formatting.
`;

    // Generate content using Gemini with fallback
    const content = await callGeminiWithAllKeysFallback(enhancedPrompt);

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
