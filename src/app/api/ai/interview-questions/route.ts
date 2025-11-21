import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { callGeminiWithFallback } from '@/lib/utils/gemini-api-helper';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';
import ApplicationJourney from '@/models/ApplicationJourney';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job
    const job = await JobApplication.findOne({
      _id: jobId,
      userId: auth.userId
    }).lean();

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Try to get journey for this job first
    let cv = null;
    const journey = await ApplicationJourney.findOne({
      jobId: jobId,
      userId: auth.userId
    }).lean();

    if (journey && journey.cvId) {
      // Use CV from journey
      cv = await CV.findOne({
      _id: journey.cvId,
      userId: auth.userId
    }).lean();
    }

    // Fallback to master CV if no journey CV found
    if (!cv) {
      // Try to find master CV
      cv = await CV.findOne({
        userId: auth.userId,
        $or: [
          { 'metadata.createdVia': 'ai-career-report' },
          { 'metadata.tags': { $in: ['ai-career-report'] } },
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true }
        ]
      }).sort({ createdAt: -1 }).lean() as any;

      // Final fallback: use oldest CV
      if (!cv) {
        cv = await CV.findOne({
          userId: auth.userId
        }).sort({ createdAt: 1 }).lean() as any;
      }
    }

    if (!cv || !cv.cvData) {
      return NextResponse.json(
        { error: 'CV not found. Please create a master CV or CV journey first.' },
        { status: 404 }
      );
    }

    // Extract CV summary for context (handle both cvData and direct structure)
    const cvData = cv.cvData || cv;
    const cvSummary = cvData?.basics?.summary || '';
    const cvWork = (cvData?.work || []).slice(0, 3).map((w: any) => ({
      company: w.name,
      position: w.position,
      summary: w.summary
    }));
    const cvSkills = (cvData?.skills || []).flatMap((s: any) => {
      if (Array.isArray(s.skills)) {
        return s.skills;
      }
      return s.category || s.name || [];
    }) || [];

    // Generate interview questions using AI
    const systemPrompt = `You are an interview coach. Generate relevant interview questions based on the job description and candidate's CV. Return ONLY valid JSON array.`;

    const userPrompt = `Generate 8-10 likely interview questions for this job application.

Job Title: ${job.jobTitle}
Company: ${job.company}
Job Description:
${job.jobDescription || 'No description provided'}

Candidate Summary:
${cvSummary}

Recent Experience:
${JSON.stringify(cvWork, null, 2)}

Key Skills:
${cvSkills.join(', ')}

Return a JSON array of questions in this format:
[
  {
    "question": "Question text",
    "category": "technical" | "behavioral" | "situational" | "company-specific",
    "suggestedPoints": ["Point 1", "Point 2", "Point 3"],
    "whyAsked": "Brief explanation of why this question is likely"
  }
]

Focus on questions that:
- Match the job requirements
- Relate to the candidate's experience
- Are commonly asked for this role type
- Test both technical and soft skills`;

    const result = await callGeminiWithFallback({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2048,
      model: 'gemini-2.5-flash-lite'
    });

    // Parse JSON from response
    let jsonText = result.content;
    jsonText = jsonText
      .replace(/```json[\s\S]*?\n/g, '')
      .replace(/```[\s\S]*?\n/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON array');
    }

    const questions = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        jobTitle: job.jobTitle,
        company: job.company,
        questions
      }
    });
  } catch (error) {
    console.error('Error generating interview questions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate interview questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

