import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';
import { COVER_LETTER_AGENT_PROMPT } from '@/lib/prompts/promptTemplates';
import { aiCoverLetterService } from '@/lib/services/aiCoverLetterService';
import getConnection from '@/lib/database';
import CoverLetter from '@/models/CoverLetter';
import { toObjectId } from '@/lib/db-utils';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export const dynamic = 'force-dynamic';

const corsHeaders = new Headers();
corsHeaders.set('Access-Control-Allow-Origin', '*');
corsHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400, headers: corsHeaders }
    );
  }

  switch (body?.mode) {
    case 'auto':
      return handleAutoGenerate(body);
    case 'agent':
      return handleAgentGenerate(body);
    default:
      return handleGenerate(body);
  }
}

async function handleGenerate(body: any) {
  try {
    const {
      cvData,
      jobData,
      recipientName,
      companyName,
      tone,
      length,
      creativity,
      personalization,
      skipExperience,
      skipProjects,
      mode
    } = body;

    if (!cvData || !jobData) {
      return NextResponse.json(
        { success: false, error: 'CV data and job data are required' },
        { status: 400 }
      );
    }

    const { structuredContent, legacyBody } = await aiCoverLetterService.generateModularCoverLetter({
      cvData,
      jobData,
      recipientName,
      companyName,
      tone,
      length: typeof length === 'number' ? (length > 70 ? 'Long' : length < 30 ? 'Short' : 'Medium') : length,
      creativity,
      personalization,
      skipExperience,
      skipProjects,
      mode
    });

    return NextResponse.json({
      success: true,
      structuredContent,
      content: legacyBody,
      body: legacyBody,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}

async function handleAgentGenerate(body: any) {
  try {
    const {
      CV_DATA,
      CV_TYPE,
      SCORE_REPORT,
      MASTER_CV_DATA,
      JD_DATA,
      TARGET_ROLE,
      COMPANY_NAME,
      CANDIDATE_NAME,
      HIRING_MANAGER_NAME,
      TONE_PREFERENCE
    } = body;

    if (CV_TYPE === 'master') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cover letters are generated from standalone or journey CVs only. A master CV is a comprehensive source document.'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!CV_DATA || !CV_TYPE || !SCORE_REPORT || !TARGET_ROLE || !COMPANY_NAME || !CANDIDATE_NAME) {
      return NextResponse.json(
        { success: false, error: 'CV_DATA, CV_TYPE, SCORE_REPORT, TARGET_ROLE, COMPANY_NAME, and CANDIDATE_NAME are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (CV_TYPE === 'journey' && !JD_DATA) {
      return NextResponse.json(
        { success: false, error: 'JD_DATA is required for journey Cover Letter generation' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!hasAIApiKeys()) {
      return NextResponse.json({
        success: false,
        error: 'AI API keys not configured'
      }, { status: 503, headers: corsHeaders });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const prompt = COVER_LETTER_AGENT_PROMPT
      .replace('{{CV_DATA}}', typeof CV_DATA === 'string' ? CV_DATA : JSON.stringify(CV_DATA, null, 2))
      .replace('{{CV_TYPE}}', CV_TYPE)
      .replace('{{SCORE_REPORT}}', typeof SCORE_REPORT === 'string' ? SCORE_REPORT : JSON.stringify(SCORE_REPORT, null, 2))
      .replace('{{MASTER_CV_DATA}}', MASTER_CV_DATA ? (typeof MASTER_CV_DATA === 'string' ? MASTER_CV_DATA : JSON.stringify(MASTER_CV_DATA, null, 2)) : 'N/A')
      .replace('{{JD_DATA}}', JD_DATA ? (typeof JD_DATA === 'string' ? JD_DATA : JSON.stringify(JD_DATA, null, 2)) : 'N/A')
      .replace('{{TARGET_ROLE}}', TARGET_ROLE)
      .replace('{{COMPANY_NAME}}', COMPANY_NAME)
      .replace('{{CANDIDATE_NAME}}', CANDIDATE_NAME)
      .replace('{{HIRING_MANAGER_NAME}}', HIRING_MANAGER_NAME || 'Hiring Manager')
      .replace('{{TONE_PREFERENCE}}', TONE_PREFERENCE || 'confident and direct');

    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert cover letter writer. Return ONLY a JSON object containing the letter and metadata. No conversational filler, no markdown code blocks.',
      temperature: 0.5,
      maxTokens: 6000
    });

    let content = aiResponse.content.trim();

    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const codeBlockMatch = content.match(codeBlockRegex);
    if (codeBlockMatch) {
      content = codeBlockMatch[1].trim();
    }

    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error('No valid JSON object found in response');
    }

    let jsonString = content.substring(jsonStart, jsonEnd + 1);
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

    const resultObj = JSON.parse(jsonString);

    return NextResponse.json({
      success: true,
      ...resultObj
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in cover letter agent generation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

async function handleAutoGenerate(body: any) {
  try {
    await getConnection();

    const { userId, journeyId, cvId, jobId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    if (journeyId) {
      const existing = await CoverLetter.findOne({ journeyId, userId: toObjectId(userId) });
      if (existing) {
        return NextResponse.json({ success: true, coverLetterId: existing._id, status: 'exists' });
      }
    }

    let cvData: UnifiedCVDataStructure | null = null;
    let jobData: any = null;

    if (cvId) {
      const cvRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cvs/${cvId}?userId=${userId}`);
      if (cvRes.ok) {
        const json = await cvRes.json();
        cvData = json.data?.cv?.cvData || json.cv?.cvData;
      }
    }

    if (jobId) {
      const jobRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/jobs/${jobId}?userId=${userId}`);
      if (jobRes.ok) {
        const json = await jobRes.json();
        jobData = json.data?.job || json.job;
      }
    }

    if (!cvData || !jobData) {
      return NextResponse.json({ success: false, message: 'Missing CV or Job data' }, { status: 400 });
    }

    const { structuredContent, legacyBody } = await aiCoverLetterService.generateModularCoverLetter({
      cvData,
      jobData,
      companyName: jobData.company
    });

    const newCoverLetter = await CoverLetter.create({
      userId: toObjectId(userId),
      title: `Cover Letter for ${jobData.company || 'Job'}`,
      content: '',
      header: structuredContent.header ? formatHeader(structuredContent.header, cvData) : formatDefaultHeader(cvData),
      body: legacyBody,
      footer: structuredContent.sections?.closing?.text || 'Sincerely,',
      status: 'draft',
      cvId: toObjectId(cvId),
      jobId: toObjectId(jobId),
      journeyId: journeyId ? toObjectId(journeyId) : undefined,
      metadata: {
        structuredBody: structuredContent,
        targetCompany: jobData.company,
        targetPosition: jobData.title,
        lastModified: new Date(),
        version: 1
      }
    });

    return NextResponse.json({ success: true, coverLetterId: newCoverLetter._id, status: 'created', coverLetter: newCoverLetter });

  } catch (error) {
    console.error('Auto-generation error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

function formatHeader(headerData: any, cvData: any) {
  return `${cvData.basics?.name || ''}\n${cvData.basics?.email || ''}\n${cvData.basics?.phone || ''}\n\n${new Date().toLocaleDateString()}\n\n${headerData.recipient || 'Hiring Manager'}\n${headerData.company || ''}`;
}

function formatDefaultHeader(cvData: any) {
  return `${cvData.basics?.name || ''}\n${cvData.basics?.email || ''}`;
}
