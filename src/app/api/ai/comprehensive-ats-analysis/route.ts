import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { cvData, jobData } = await request.json();

    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400 }
      );
    }

    // Create the enhanced ATS analysis prompt
    const prompt = createComprehensiveATSPrompt(cvData, jobData);

    // Generate analysis using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No analysis generated' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (it might have additional text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse analysis response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Comprehensive ATS analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform ATS analysis' },
      { status: 500 }
    );
  }
}

function createComprehensiveATSPrompt(cvData: any, jobData: any) {
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  
  return `You are an advanced ATS (Applicant Tracking System) expert and career consultant. Your task is to analyze a user's CV against a specific job description and provide actionable, honest feedback.

Here is the full context:
- User's Full CV: ${JSON.stringify(cvData, null, 2)}
- Original Job Description: ${jobDescription}

Instructions:
1. **First, generate a JSON object with the following fields:**
   * \`keywordMatch\`: A percentage score (0-100) based on how many keywords from the job description are in the CV.
   * \`experienceEducation\`: A percentage score (0-100) comparing the user's years of experience and education to the job requirements.
   * \`actionVerbs\`: A percentage score (0-100) based on the usage of strong action verbs in the Work Experience descriptions.
   * \`skills\`: A percentage score (0-100) for the skills match.
   * \`formatting\`: A percentage score (0-100) for clean formatting (check for markdown consistency).
   * \`matchedKeywords\`: An array of strings of all keywords from the job description that were found in the CV.
   * \`missingKeywords\`: An array of strings of all keywords from the job description that were NOT found in the CV.

2. **Next, provide a bulleted list of actionable recommendations.** Do NOT provide a generic score. Instead, give specific advice.
3. Each bullet point must explain what the user can do to improve.
4. Be honest about the gaps. If the user is missing a required skill or a specific number of years of experience, state this clearly but professionally.
5. If the user has a gap in their experience or skills, suggest adding a relevant project or certification.
6. The final output should be the JSON object followed by the bulleted list.`;
}
