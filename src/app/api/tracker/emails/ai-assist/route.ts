import { NextRequest, NextResponse } from 'next/server';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UNIVERSAL_SYSTEM_CONTEXT = `
You are a professional career communication specialist embedded inside 
AIResume, a job application SaaS. You write emails on behalf of job 
seekers to recruiters, hiring managers, and HR teams.

Your writing must always be:
- Professional but human — never robotic or templated-sounding
- Concise — recruiters spend under 30 seconds reading candidate emails
- Confident without arrogance — the candidate wants the role, not desperately
- Specific — reference real details from the thread, job, and candidate profile
- Honest — never fabricate experience, availability, or intent

You write the email body only. Greeting (e.g. "Hi Jane,") and 
sign-off (e.g. "Best regards, Amloh") are auto-appended by the system.
Do not include them.

Return ONLY valid JSON matching the schema defined in each prompt.
No preamble, no explanation, no markdown fences.
`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { actionType, variables = {} } = body;

    const candidateName = variables.CANDIDATE_NAME || session.user.name || 'Candidate';
    const candidateRoleTarget = variables.CANDIDATE_ROLE_TARGET || variables.JOB_TITLE || 'the role';
    const companyName = variables.COMPANY_NAME || 'the company';
    const recruiterName = variables.RECRUITER_NAME || 'Recruiter';
    const jobTitle = variables.JOB_TITLE || candidateRoleTarget;
    const tonePreference = variables.TONE_PREFERENCE || 'formal';
    const customInstruction = variables.CUSTOM_INSTRUCTION || '';
    const availability = variables.CANDIDATE_AVAILABILITY || 'Monday to Friday business hours';
    const postponeReason = variables.POSTPONE_REASON || 'a scheduling conflict';
    const daysSinceLastContact = variables.DAYS_SINCE_LAST_CONTACT || 7;

    let prompt = '';
    let responseSchema: any = {};
    let fallbackText = '';
    let fallbackSubject = '';

    switch (actionType) {
      case 'recreate':
      case 'reply':
        prompt = `
TASK: Write or rewrite a reply email from candidate ${candidateName} to ${recruiterName} at ${companyName} regarding the ${jobTitle} role.
${variables.LAST_MESSAGE ? `LATEST MESSAGE FROM RECRUITER:\n"""\n${variables.LAST_MESSAGE}\n"""\n` : ''}
${variables.CURRENT_DRAFT ? `CURRENT DRAFT TO REWRITE/IMPROVE:\n"""\n${variables.CURRENT_DRAFT}\n"""\n` : ''}
${variables.THREAD_SUMMARY ? `THREAD CONTEXT:\n${variables.THREAD_SUMMARY}\n` : ''}
INPUTS:
- Candidate: ${candidateName}
- Recruiter / Hiring Team: ${recruiterName}
- Target Role: ${jobTitle}
- Company: ${companyName}
- Desired Tone: ${tonePreference}
- Custom Instructions / Candidate Notes: ${customInstruction || 'Write a clear, compelling, professional response that directly addresses the recruiter\'s message.'}

GUIDANCE:
- Directly answer questions, scheduling proposals, or requests from the recruiter's latest message.
- Keep the writing polished, concise, authentic, and professional.
- Do NOT fabricate facts, availability, or experience.
- Do NOT use bracketed placeholders like [Your Name] — use actual provided inputs.
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = variables.CURRENT_SUBJECT || `Re: ${jobTitle} at ${companyName}`;
        fallbackText = `Dear ${recruiterName},\n\nThank you for getting in touch regarding the ${jobTitle} position at ${companyName}.\n\nI remain very enthusiastic about this opportunity and would be glad to coordinate next steps. Please let me know what dates and times work best for your team.\n\nThank you again for your time and consideration.\n\nBest regards,\n${candidateName}`;
        break;

      case 'initial_outreach':
        prompt = `
TASK: Write a cold outreach email from ${candidateName} to a recruiter or hiring manager at ${companyName} expressing interest in the ${jobTitle} role.
INPUTS:
- Candidate: ${candidateName}
- Target role: ${jobTitle}
- Company: ${companyName}
- Recruiter: ${recruiterName}
- Referral: ${variables.REFERRAL_NAME || 'None'}
- Tone: ${tonePreference}
- Custom instruction: ${customInstruction}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Keen on the ${jobTitle} role — ${candidateName}`;
        fallbackText = `I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. I have been following ${companyName}'s work and am incredibly impressed by your team's approach to technology and product growth. With my background in this space, I believe I can bring immediate value to the team. Would you be open to a brief 10-minute call next week to introduce myself and learn more about what you look for in this role?`;
        break;

      case 'thank_you':
        prompt = `
TASK: Write a post-interview thank you email sent within 24 hours of completing an interview.
INPUTS:
- Recruiter: ${recruiterName}
- Job: ${jobTitle}
- Company: ${companyName}
- Format: ${variables.INTERVIEW_FORMAT || 'our conversation'}
- Tone: ${tonePreference}
- Custom instruction: ${customInstruction}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Re: Interview for ${jobTitle} at ${companyName}`;
        fallbackText = `Thank you so much for taking the time to speak with me about the ${jobTitle} role. I really enjoyed our conversation and learning more about the challenges your team is solving. The discussion reinforced my enthusiasm for the role and my belief that my experience aligns well with what you need. Please let me know if you need any additional details from my end, and I look forward to your update.`;
        break;

      case 'follow_up':
        prompt = `
TASK: Write a follow-up email after ${daysSinceLastContact} days of silence.
INPUTS:
- Recruiter: ${recruiterName}
- Job: ${jobTitle}
- Company: ${companyName}
- Stage: ${variables.CURRENT_STAGE || 'Applied'}
- Days since contact: ${daysSinceLastContact}
- Tone: ${tonePreference}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Re: Application Status — ${jobTitle} at ${companyName}`;
        fallbackText = `I am checking in on my application for the ${jobTitle} position. I wanted to follow up and see if there are any updates regarding the next steps or if there is any further information I can provide to support my application. I remain very interested in the opportunity to join the team at ${companyName}.`;
        break;

      case 'acceptance':
        prompt = `
TASK: Write a formal offer acceptance email.
INPUTS:
- Recruiter: ${recruiterName}
- Offer role: ${variables.OFFER_ROLE || jobTitle}
- Company: ${companyName}
- Offered salary: ${variables.OFFER_SALARY || 'negotiated amount'} ${variables.OFFER_CURRENCY || ''}
- Proposed start date: ${variables.OFFER_START_DATE || 'the proposed date'}
- Notice period: ${variables.NOTICE_PERIOD || 'none'}
- Tone: ${tonePreference}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Acceptance of Offer — ${variables.OFFER_ROLE || jobTitle} — ${candidateName}`;
        fallbackText = `I am absolutely delighted to formally accept your offer of employment for the ${variables.OFFER_ROLE || jobTitle} role at ${companyName}. I am excited to join the team and get started. I confirm my acceptance of the salary and terms outlined. Regarding my start date, I will align with my notice period of ${variables.NOTICE_PERIOD || 'none'} and look forward to completing the onboarding steps.`;
        break;

      case 'negotiation':
        prompt = `
TASK: Write a salary or package negotiation email.
INPUTS:
- Recruiter: ${recruiterName}
- Offer role: ${variables.OFFER_ROLE || jobTitle}
- Company: ${companyName}
- Offered salary: ${variables.OFFER_SALARY || ''}
- Desired salary: ${variables.DESIRED_SALARY || ''}
- Tone: ${tonePreference}
- Custom instruction: ${customInstruction}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Re: Offer Discussion — ${variables.OFFER_ROLE || jobTitle} — ${candidateName}`;
        fallbackText = `Thank you so much for offering me the ${variables.OFFER_ROLE || jobTitle} position. I am thrilled about the opportunity to join ${companyName} and work with the team. Before I sign the contract, I wanted to discuss the compensation package. Given my experience in this field and the value I expect to bring, I was hoping we could get the base salary to ${variables.DESIRED_SALARY || 'a slightly higher number'}. I am keen to finalize the terms and start making an impact.`;
        break;

      case 'decline':
        prompt = `
TASK: Write a professional, warm offer decline email.
INPUTS:
- Recruiter: ${recruiterName}
- Offer role: ${variables.OFFER_ROLE || jobTitle}
- Company: ${companyName}
- Decline reason: ${variables.DECLINE_REASON || 'accepted another offer'}
- Tone: ${tonePreference}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Offer Status — ${variables.OFFER_ROLE || jobTitle} — ${candidateName}`;
        fallbackText = `Thank you so much for the offer to join ${companyName} as a ${variables.OFFER_ROLE || jobTitle}. I sincerely appreciate the time your team invested in discussing this opportunity with me. After careful consideration, I have decided to accept another offer that aligns more closely with my current career path. I wish you and the team the absolute best, and hope our paths cross again in the future.`;
        break;

      case 'reschedule':
        prompt = `
TASK: Write an interview reschedule request email.
INPUTS:
- Recruiter: ${recruiterName}
- Job: ${jobTitle}
- Company: ${companyName}
- Original date: ${variables.INTERVIEW_DATE || 'the scheduled date'}
- Availability: ${availability}
- Reason: ${postponeReason}
- Tone: ${tonePreference}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Scheduling conflict — Interview for ${jobTitle}`;
        fallbackText = `I am writing to apologize, but due to an unexpected scheduling conflict, I need to request that we reschedule our upcoming interview for the ${jobTitle} position. I remain very enthusiastic about speaking with you. I am available during these alternative times: ${availability}. Thank you for your understanding.`;
        break;

      case 'extension':
        prompt = `
TASK: Write an email requesting more time on a take-home task or offer decision.
INPUTS:
- Recruiter: ${recruiterName}
- Job: ${jobTitle}
- Company: ${companyName}
- Task/Offer: ${variables.ASSESSMENT_NAME || 'the offer'}
- Tone: ${tonePreference}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Re: Deadline extension request — ${jobTitle}`;
        fallbackText = `I am writing regarding the deadline for ${variables.ASSESSMENT_NAME || 'the offer decision'}. To ensure I have adequate time to complete this thoroughly and give it the consideration it deserves, would it be possible to extend the deadline by a few days? I would appreciate if we could move it to next week. Thank you for your flexibility.`;
        break;

      case 'custom':
      default:
        prompt = `
TASK: Write a custom email based entirely on the user's instructions.
INPUTS:
- User instruction: ${customInstruction || 'Write a professional response email.'}
- Job: ${jobTitle}
- Company: ${companyName}
- Tone: ${tonePreference}
`;
        responseSchema = {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            writing_notes: { type: 'string' }
          },
          required: ['subject', 'body']
        };
        fallbackSubject = `Regarding ${jobTitle} application at ${companyName}`;
        fallbackText = customInstruction ? `Regarding my application for the ${jobTitle} position, ${customInstruction}` : `I am reaching out to follow up on my application for the ${jobTitle} position at ${companyName}. I look forward to connecting soon.`;
        break;
    }

    try {
      const aiResponse = await callAIWithFallback({
        prompt: prompt,
        systemPrompt: UNIVERSAL_SYSTEM_CONTEXT,
        responseSchema: responseSchema,
        responseMimeType: 'application/json',
        userId: session.user.id,
        action: `email_draft_${actionType}`
      });

      const parsed = JSON.parse(aiResponse.content);
      return NextResponse.json({
        success: true,
        subject: parsed.subject || fallbackSubject,
        body: parsed.body || fallbackText,
        writing_notes: parsed.writing_notes || ''
      });
    } catch (aiError) {
      console.warn('AI Assist generation failed, returning fallback template:', aiError);
      return NextResponse.json({
        success: true,
        subject: fallbackSubject,
        body: fallbackText,
        writing_notes: 'Fallback template used due to AI call failure.'
      });
    }
  } catch (error: any) {
    console.error('AI Assist error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
