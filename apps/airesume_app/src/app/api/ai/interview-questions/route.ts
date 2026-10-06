// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { callGeminiWithFallback } from '@/lib/utils/gemini-api-helper';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';
import ApplicationJourney from '@/models/ApplicationJourney';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Interview Questions API - Request received');
    await getConnection();
    
    const auth = await authenticateRequest(request);
    if (!auth) {
      console.log('❌ Interview Questions API - Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ Interview Questions API - User authenticated:', auth.userId);

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      console.log('❌ Interview Questions API - Missing jobId');
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Interview Questions API - Processing jobId:', jobId);

    // Convert jobId to ObjectId if it's a string
    let jobObjectId;
    try {
      jobObjectId = mongoose.Types.ObjectId.isValid(jobId) 
        ? new mongoose.Types.ObjectId(jobId) 
        : jobId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    // Convert userId to ObjectId
    const userObjectId = mongoose.Types.ObjectId.isValid(auth.userId)
      ? new mongoose.Types.ObjectId(auth.userId)
      : auth.userId;

    // Get job
    const job = await JobApplication.findOne({
      _id: jobObjectId,
      userId: mixedIdFilter(userObjectId)
    }).lean();

    if (!job) {
      console.log('❌ Interview Questions API - Job not found:', jobObjectId);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    console.log('✅ Interview Questions API - Job found:', job.jobTitle);

    // Try to get journey for this job first
    let cv = null;
    const journey = await ApplicationJourney.findOne({
      jobId: jobObjectId,
      userId: userObjectId
    }).lean();

    if (journey && journey.cvId) {
      // Use CV from journey
      const cvObjectId = mongoose.Types.ObjectId.isValid(journey.cvId)
        ? new mongoose.Types.ObjectId(journey.cvId)
        : journey.cvId;
      cv = await CV.findOne({
        _id: cvObjectId,
        userId: userObjectId
      }).lean();
    }

    // Fallback to master CV if no journey CV found
    if (!cv) {
      // Try to find master CV
      cv = await CV.findOne({
        userId: userObjectId,
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
          userId: userObjectId
        }).sort({ createdAt: 1 }).lean() as any;
      }
    }

    if (!cv || !cv.cvData) {
      console.log('❌ Interview Questions API - CV not found');
      return NextResponse.json(
        { error: 'CV not found. Please create a master CV or CV journey first.' },
        { status: 404 }
      );
    }

    console.log('✅ Interview Questions API - CV found, generating questions...');

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

    // Generate interview questions using AI with answers and pain point analysis
    const systemPrompt = `You are an expert interview coach and career advisor. Generate comprehensive interview questions with detailed answers that help candidates identify and address their weaknesses while highlighting their strengths. 

CRITICAL: You MUST return ONLY valid JSON. All string values must have:
- Quotes properly escaped (use \\" for quotes inside strings)
- Newlines escaped as \\n
- No trailing commas
- Valid JSON syntax only`;

    const userPrompt = `Generate 8-12 comprehensive interview questions for this job application with detailed answers and pain point analysis.

CRITICAL JSON FORMATTING RULES:
- All quotes inside string values must be escaped as \\"
- All newlines must be escaped as \\n
- No trailing commas anywhere
- Return ONLY the JSON array, no markdown, no explanations
- Ensure all string values are properly escaped

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
    "suggestedAnswer": "A comprehensive, well-structured answer that the candidate can use as a template. Include specific examples from their experience where possible.",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
    "painPoints": ["Potential weakness or gap 1", "Potential weakness or gap 2"],
    "improvementTips": ["How to address pain point 1", "How to address pain point 2", "How to enhance the answer"],
    "whyAsked": "Brief explanation of why this question is likely and what the interviewer is looking for",
    "starExample": "An example of an outstanding answer that goes above and beyond"
  }
]

Focus on:
- Questions that match the job requirements and relate to the candidate's experience
- Identifying potential gaps or weaknesses in the candidate's profile
- Providing actionable improvement tips to address those gaps
- Including specific examples from the candidate's CV where relevant
- Creating answers that highlight transferable skills and learning ability
- Questions that test both technical and soft skills
- Providing "star example" answers that demonstrate exceptional responses`;

    const result = await callGeminiWithFallback({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096, // Increased for comprehensive answers
      model: 'gemini-2.5-flash-lite'
    });

    // Robust JSON parsing with error handling
    const parseRobustJson = (input: string): any[] => {
      let jsonText = input;
      
      // Remove markdown code blocks
      jsonText = jsonText
        .replace(/```json[\s\S]*?\n/g, '')
        .replace(/```[\s\S]*?\n/g, '')
        .replace(/```/g, '')
        .trim();

      // Extract JSON array - try multiple patterns
      let jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Try to find array starting from first [
        const firstBracket = jsonText.indexOf('[');
        const lastBracket = jsonText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonMatch = [jsonText.substring(firstBracket, lastBracket + 1)];
        }
      }
      
      if (!jsonMatch) {
        throw new Error('Could not find JSON array in AI response');
      }

      const jsonString = jsonMatch[0];
      const originalJsonString = jsonString;

      // Fix common JSON issues - multiple attempts
      const fixAttempts = [
        // Attempt 1: Just remove trailing commas
        (str: string) => str.replace(/,\s*([}\]])/g, '$1'),
        
        // Attempt 2: Remove trailing commas + fix common escape issues
        (str: string) => {
          const fixed = str.replace(/,\s*([}\]])/g, '$1');
          // Simple approach: replace newlines that appear to be in string values
          // This is a heuristic - we'll be more careful in attempt 3
          return fixed;
        },
        
        // Attempt 3: More aggressive - try to fix quotes in problematic areas
        (str: string) => {
          const fixed = str.replace(/,\s*([}\]])/g, '$1');
          // This is complex - we'll use a state machine approach
          let result = '';
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i];
            const prevChar = i > 0 ? fixed[i - 1] : '';
            
            if (escapeNext) {
              result += char;
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              result += char;
              escapeNext = true;
              continue;
            }
            
            if (char === '"' && prevChar !== '\\') {
              inString = !inString;
              result += char;
            } else if (inString && (char === '\n' || char === '\r')) {
              result += char === '\n' ? '\\n' : '\\r';
            } else {
              result += char;
            }
          }
          
          return result;
        }
      ];

      // Try each fix attempt
      for (let attempt = 0; attempt < fixAttempts.length; attempt++) {
        try {
          const fixed = fixAttempts[attempt](jsonString);
          const parsed = JSON.parse(fixed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`✅ JSON parsed successfully on attempt ${attempt + 1}`);
            return parsed;
          }
        } catch (e) {
          if (attempt === fixAttempts.length - 1) {
            // Last attempt failed, try recovery
            console.log('⚠️ All fix attempts failed, trying recovery...');
            
            // Recovery: Extract individual question objects
            const questionPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
            const matches = originalJsonString.match(questionPattern);
            
            if (matches && matches.length > 0) {
              const recoveredQuestions: any[] = [];
              for (const match of matches) {
                try {
                  const fixed = match.replace(/,\s*([}\]])/g, '$1');
                  // Try to parse this individual object
                  const parsed = JSON.parse(fixed);
                  if (parsed && typeof parsed === 'object' && parsed.question) {
                    recoveredQuestions.push(parsed);
                  }
                } catch (objError) {
                  // Skip this object
                  console.log('Skipping malformed question object');
                }
              }
              
              if (recoveredQuestions.length > 0) {
                console.log(`✅ Recovered ${recoveredQuestions.length} questions from partial parse`);
                return recoveredQuestions;
              }
            }
            
            // If recovery failed, throw the original error
            console.error('❌ JSON parsing failed after all attempts');
            console.error('Error:', e);
            console.error('JSON string (first 1500 chars):', originalJsonString.substring(0, 1500));
            throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
      
      throw new Error('All parsing attempts failed');
    };

    let questions;
    try {
      questions = parseRobustJson(result.content);
    } catch (parseError) {
      console.error('❌ Interview Questions API - JSON parsing error:', parseError);
      console.error('Raw response (first 2000 chars):', result.content.substring(0, 2000));
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    console.log('✅ Interview Questions API - Generated', questions.length, 'questions');

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

