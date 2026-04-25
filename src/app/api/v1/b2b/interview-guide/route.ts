import { NextRequest, NextResponse } from 'next/server';
import { withB2BAuth } from '@/lib/middleware/b2b-auth';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import { getConnection } from '@/lib/database';

export async function POST(req: NextRequest, context: any) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    try {
      const body = await req.json();
      const { candidateId, jobDescription, jobTitle } = body;

      if (!candidateId || !jobDescription) {
        return NextResponse.json({ error: 'candidateId and jobDescription are required' }, { status: 400 });
      }

      await getConnection();
      const candidate = await B2BCandidate.findOne({ _id: candidateId, tenantId: tenant._id });

      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      const prompt = `
        You are an expert technical recruiter and hiring manager.
        I am providing you with a candidate's parsed CV data and a Job Description.
        
        Task:
        1. Identify the gaps between the candidate's experience/skills and the Job Description.
        2. Generate 3 to 5 highly specific, technical interview questions designed to probe those exact weaknesses and verify their actual competency in those areas.
        3. For each question, provide a brief "What to look for" guide for the interviewer.

        Job Title: ${jobTitle || 'Not specified'}
        Job Description:
        ${jobDescription}

        Candidate CV Data:
        ${JSON.stringify(candidate.cvData, null, 2)}

        Format your response EXACTLY as a valid JSON array of objects with this structure:
        [
          {
            "question": "The specific interview question",
            "reason": "Why this question is being asked based on the CV gap",
            "whatToLookFor": "What a good vs bad answer sounds like"
          }
        ]
        Do not include markdown blocks like \`\`\`json. Just output the raw JSON array.
      `;

      const responseText = await callGeminiWithAllKeysFallback(prompt, 0.7);
      
      let interviewGuide;
      try {
        // Strip out any markdown formatting if Gemini added it despite instructions
        const cleanJson = responseText.replace(/```json\n?|```/gi, '').trim();
        interviewGuide = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', responseText);
        return NextResponse.json({ error: 'Failed to generate a valid interview guide structure' }, { status: 500 });
      }

      // Save the generated guide to the candidate's metadata
      if (!candidate.metadata) candidate.metadata = {};
      candidate.metadata.interviewGuide = interviewGuide;
      await candidate.save();

      return NextResponse.json({
        success: true,
        data: {
          candidateId,
          interviewGuide
        }
      });
    } catch (error: any) {
      console.error('Interview Guide Generation Error:', error);
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }, ['score', 'parse']); // Assuming 'score' or 'parse' permission is enough for this
}
