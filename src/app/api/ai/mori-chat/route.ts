import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import MoriChat from '@/models/MoriChat';
import CV from '@/models/CV';
import { isFreeTierPlan } from '@/lib/utils/subscription-helpers';
import crypto from 'crypto';
import { ANALYSIS_AGENT_PROMPT, CV_TAILOR_AGENT_PROMPT } from '@/lib/prompts/promptTemplates';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { cleanAndParseJSON, inferCvSectionFromPrompt, mergeMoriCvIntoCanvas, parseMoriChatContent } from '@/lib/utils/mori-chat-response';

function injectItemIds(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => injectItemIds(item));
  }

  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === 'id' && obj[key] === 'NEW_ITEM') {
        newObj[key] = Math.random().toString(36).substring(2, 11); // 9-chars
      } else {
        newObj[key] = injectItemIds(obj[key]);
      }
    }
  }
  return newObj;
}

export async function POST(req: NextRequest) {
  let session: { user?: { id?: string; email?: string | null } | null } | null = null;
  let cvId: string | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, messages, cvData, selection, jobData, targetRole, seniorityLevel, cvId: incomingCvId, cvType } = await req.json();
    cvId = incomingCvId;

    const incomingLatest = messages[messages.length - 1];
    const latestMessage = {
      id: incomingLatest.id || Date.now().toString(),
      role: incomingLatest.role,
      content: incomingLatest.content,
      timestamp: incomingLatest.timestamp || Date.now(),
      selection: incomingLatest.selection
    };
    const resolvedSelection = selection || latestMessage.selection || inferCvSectionFromPrompt(latestMessage.content);
    // Connect to database and check plan and usage limits
    await getConnection();

    const User = (await import('@/models/User')).default;
    const user = await User.findById(session.user.id).select('currentPlanKey credits.lastResetDate').lean() as any;
    // Apply 5-message limit for free-tier users (free + starter_monthly are the same plan)
    if (user && isFreeTierPlan(user.currentPlanKey || 'free')) {
      const lastResetDate = user.credits?.lastResetDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const userChats = await MoriChat.find({
        userId: session.user.id,
        updatedAt: { $gte: lastResetDate }
      }).lean();

      let inwardCount = 0;
      let outwardCount = 0;

      userChats.forEach((chat: any) => {
        if (Array.isArray(chat.messages)) {
          chat.messages.forEach((msg: any) => {
            if (msg.id === 'welcome') return;
            if (msg.role === 'user') {
              inwardCount++;
            } else if (msg.role === 'assistant') {
              outwardCount++;
            }
          });
        }
      });

      if (inwardCount >= 5 || outwardCount >= 5) {
        return NextResponse.json({
          error: 'Mori Chat limit reached. Please upgrade your plan to continue editing your CV with AI.',
          limitExhausted: true
        }, { status: 403 });
      }
    }
    
    let masterCVData = null;
    try {
      const masterCV = await CV.findOne({
        userId: new mongoose.Types.ObjectId(session.user.id),
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { cvType: 'master' },
          { 'metadata.createdVia': 'ai-career-report' }
        ]
      }).select('cvData').lean() as any;
      if (masterCV?.cvData) {
        masterCVData = masterCV.cvData;
      }
    } catch (err) {
      console.warn('Failed to fetch Master CV for user:', err);
    }

    // Format job data
    let jdText = '';
    if (jobData) {
      if (typeof jobData === 'string') {
        jdText = jobData;
      } else {
        jdText = [
          jobData.title ? `Role: ${jobData.title}` : '',
          jobData.company ? `Company: ${jobData.company}` : '',
          jobData.description || jobData.jd || jobData.jobDescription || (typeof jobData.text === 'string' ? jobData.text : '')
        ].filter(Boolean).join('\n');
      }
    }

    // Intercept "Optimize my CV" suggestion chip trigger
    if (latestMessage && latestMessage.content && latestMessage.content.toLowerCase().trim() === 'optimize my cv') {
      console.log('⚡ Intercepted "Optimize my CV" command. Executing chained AI flow...');

      const currentCvType = cvType || (jdText ? 'journey' : 'standalone');

      // 1. Run Analysis Prompt
      let analysisPrompt = ANALYSIS_AGENT_PROMPT
        .replace('{{CV_DATA}}', typeof cvData === 'string' ? cvData : JSON.stringify(cvData, null, 2))
        .replace('{{CV_TYPE}}', currentCvType)
        .replace('{{JD_DATA}}', jdText || 'N/A')
        .replace('{{TARGET_ROLE}}', targetRole || 'N/A')
        .replace('{{MASTER_CV_DATA}}', masterCVData ? JSON.stringify(masterCVData, null, 2) : 'N/A');

      const analysisResponse = await callAIWithFallback({
        prompt: analysisPrompt,
        systemPrompt: 'You are a JSON-only recruiter analysis API. Return ONLY valid JSON.',
        temperature: 0.2,
        maxTokens: 8000,
        action: 'analyze_cv'
      });

      let scoreReport: any;
      try {
        scoreReport = cleanAndParseJSON(analysisResponse.content);
      } catch (err: any) {
        console.error('Failed to parse score report in Mori intercept:', err);
        return NextResponse.json({ error: 'Failed to generate score report: ' + err.message }, { status: 500 });
      }

      // 2. Run CV Tailor Prompt
      const primaryRole = targetRole || 'N/A';
      const seniority = seniorityLevel || 'professional';

      let tailorPrompt = CV_TAILOR_AGENT_PROMPT
        .replace('{{CV_DATA}}', typeof cvData === 'string' ? cvData : JSON.stringify(cvData, null, 2))
        .replace('{{CV_TYPE}}', currentCvType)
        .replace('{{SCORE_REPORT}}', JSON.stringify(scoreReport, null, 2))
        .replace('{{MASTER_CV_DATA}}', masterCVData ? JSON.stringify(masterCVData, null, 2) : JSON.stringify(cvData, null, 2))
        .replace('{{JD_DATA}}', jdText || 'N/A')
        .replace('{{TARGET_ROLE}}', targetRole || 'N/A')
        .replace('{{PRIMARY_ROLE}}', primaryRole)
        .replace('{{INFERRED_OR_TARGET_SENIORITY}}', seniority);

      const tailorResponse = await callAIWithFallback({
        prompt: tailorPrompt,
        systemPrompt: 'You are a JSON-only CV rewrite engine. Return ONLY valid JSON matching the return shape.',
        temperature: 0.3,
        maxTokens: 8000,
        action: 'tailor_cv'
      });

      let tailorResultObj: any;
      try {
        tailorResultObj = cleanAndParseJSON(tailorResponse.content);
      } catch (err: any) {
        console.error('Failed to parse tailor response in Mori intercept:', err);
        return NextResponse.json({ error: 'Failed to rewrite CV: ' + err.message }, { status: 500 });
      }

      const optimised_cv = tailorResultObj.optimised_cv || {};
      const changes_log = tailorResultObj.changes_log || {};

      // Map back to UnifiedCVDataStructure
      const mappedCV: any = { ...cvData };

      if (optimised_cv.personal_details || optimised_cv.professional_summary) {
        mappedCV.basics = {
          ...mappedCV.basics,
          name: optimised_cv.personal_details?.name || mappedCV.basics?.name,
          label: optimised_cv.personal_details?.title || mappedCV.basics?.label,
          email: optimised_cv.personal_details?.email || mappedCV.basics?.email,
          phone: optimised_cv.personal_details?.phone || mappedCV.basics?.phone,
          url: optimised_cv.personal_details?.portfolio || mappedCV.basics?.url,
          summary: optimised_cv.professional_summary || mappedCV.basics?.summary
        };
        const profiles = [];
        if (optimised_cv.personal_details?.linkedin) {
          profiles.push({ network: 'LinkedIn', url: optimised_cv.personal_details.linkedin });
        }
        if (optimised_cv.personal_details?.github) {
          profiles.push({ network: 'GitHub', url: optimised_cv.personal_details.github });
        }
        if (profiles.length > 0) {
          mappedCV.basics.profiles = profiles;
        }
      }

      if (optimised_cv.work_experience) {
        mappedCV.work = optimised_cv.work_experience.map((w: any) => ({
          company: w.company,
          position: w.title,
          startDate: w.start_date,
          endDate: w.end_date,
          location: w.location,
          highlights: w.bullets
        }));
      }

      if (optimised_cv.projects) {
        mappedCV.projects = optimised_cv.projects.map((p: any) => ({
          name: p.name,
          description: p.bullets ? p.bullets.join('\n') : '',
          highlights: p.bullets || [],
          startDate: p.start_date,
          endDate: p.end_date
        }));
      }

      if (optimised_cv.education) {
        mappedCV.education = optimised_cv.education.map((e: any) => ({
          institution: e.institution,
          area: e.area,
          studyType: e.degree,
          startDate: e.start_date,
          endDate: e.end_date,
          description: e.description
        }));
      }

      if (optimised_cv.skills) {
        if (Array.isArray(optimised_cv.skills) && optimised_cv.skills[0]?.category) {
          mappedCV.skills = optimised_cv.skills.map((s: any) => ({
            category: s.category,
            skills: s.items || []
          }));
        } else if (Array.isArray(optimised_cv.skills)) {
          mappedCV.skills = [{ category: 'Skills', skills: optimised_cv.skills }];
        }
      }

      // Save analysis report to database cache to prevent redundant re-generation when editor loads
      if (cvId) {
        try {
          const contentHash = crypto.createHash('md5').update(JSON.stringify(cvData) + (jdText || '')).digest('hex');
          await CV.findOneAndUpdate(
            { _id: cvId, userId: session.user.id },
            {
              $set: {
                'metadata.surgeonAnalysis': {
                  score: scoreReport.overall_score || 0,
                  fixes: [],
                  annotations: [],
                  targetRole: targetRole || '',
                  seniorityLevel: seniorityLevel || '',
                  analyzedAt: new Date(),
                  contentHash,
                  scoreReport
                }
              }
            }
          );
        } catch (dbErr) {
          console.warn('Failed to save surgeonAnalysis cache to DB in Mori intercept:', dbErr);
        }
      }

      const cleanMessage = `I've analyzed your CV and applied all recommended optimizations to align it with your goals. Here is the optimized version!\n\n**Summary of changes:**\n- **Strategy**: ${changes_log.strategy_used || 'Tailored to job requirements'}\n- **Action**: ${changes_log.summary?.action || 'Improved bullets and keyword alignment'}\n- **Keywords Added**: ${changes_log.summary?.keywords_added?.join(', ') || 'N/A'}`;

      const assistantMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: cleanMessage,
        timestamp: Date.now()
      };

      let chatRecord;
      if (chatId) {
        chatRecord = await MoriChat.findOneAndUpdate(
          { _id: chatId, userId: session.user.id },
          {
            $push: { messages: { $each: [latestMessage, assistantMessage] } },
            $set: { updatedAt: new Date() }
          },
          { new: true }
        ).lean();
      } else {
        chatRecord = await MoriChat.create({
          userId: session.user.id,
          cvId: cvId || null,
          title: 'CV Optimization Flow',
          messages: [
            {
              id: 'welcome',
              role: 'assistant',
              content: "Hi! I'm Mori. I can help you edit your CV using natural language. You can also select any part of the CV on the left to focus our conversation.",
              timestamp: Date.now() - 1000
            },
            latestMessage,
            assistantMessage
          ]
        });
      }

      if (!chatRecord) {
        return NextResponse.json({ error: 'Failed to create or update chat session' }, { status: 500 });
      }

      // Log user action & AI activity
      await ActivityLogService.logUserAction({
        userId: session.user.id,
        userEmail: session.user.email ?? undefined,
        action: 'mori_chat_message',
        resourceType: 'cv',
        resourceId: cvId ?? undefined,
        status: 'success',
        metadata: {
          chatId: chatRecord._id.toString(),
          command: 'optimize_my_cv',
          hasCvUpdate: true
        }
      });

      await ActivityLogService.logAI({
        userId: session.user.id,
        userEmail: session.user.email ?? undefined,
        model: 'gemini-1.5-flash',
        tokensUsed: 0,
        cost: 0,
        prompt: 'Optimize my CV command',
        responseLength: cleanMessage.length,
        action: 'optimize_cv_chain',
        status: 'success',
        endpoint: '/api/ai/mori-chat'
      });

      return NextResponse.json({
        chatId: chatRecord._id,
        title: chatRecord.title,
        message: cleanMessage,
        updatedCV: mappedCV,
        limitExhausted: false
      });
    }

    // Construct the system prompt
    const systemPrompt = `You are Mori, an expert CV AI assistant. Your goal is to help users edit their CVs via natural language.
You have access to the user's Master CV, their Current CV being edited, and the target Job Description (JD) for the role they are applying to.

Contexts:
1. <master_cv>
${masterCVData ? JSON.stringify(masterCVData, null, 2) : 'No Master CV loaded.'}
</master_cv>
Use this as the source of truth for their experiences. NEVER manufacture new experiences, timelines, or roles that do not exist in the Master CV.

2. <current_cv>
${cvData ? JSON.stringify(cvData, null, 2) : 'No CV data available.'}
</current_cv>
Any changes you suggest should be applied to this version.

3. <job_description>
${jdText || 'No job description provided.'}
</job_description>

Target Role: ${targetRole || 'Not specified'}
Seniority: ${seniorityLevel || 'Not specified'}

User Selection Context:
${resolvedSelection ? `Path: ${resolvedSelection.path}\nContent: "${resolvedSelection.text}"\nThe user named or implied this section. Apply the edit to this section even if they did not click it on the canvas.` : 'No specific section selected. Infer the section from the user request (for example languages, skills, experience). If it is still unclear, ask a short clarifying question.'}
(Note: The selection context shows what the user currently has selected/focused on the screen. However, they are NOT restricted to editing only this selection. If the user asks for changes across other sections or the entire CV, you MUST apply updates to all appropriate sections.)

Your task is to analyze the user's request, their current CV, their master CV, and the job description, and return a structured JSON response.

Strict Rules for CV updates:
1. If the user asks to modify the CV and the request is clear, you MUST apply the edit in \`patch\`.
2. NEVER put JSON, CV objects, or field dumps in \`message\`. \`message\` is a short spoken confirmation only (1-2 sentences).
3. Do NOT return the entire CV. Do not use \`updatedCV\`. Full CV payloads truncate and get shown in chat by accident.
4. Put only the sections you changed in \`patch\`. Each patch value must be the complete replacement for that section after the edit (include existing items plus any new ones).
5. Use the field names from <current_cv>: \`experience\` (not \`work\`), \`certifications\` (not \`certificates\`), language items as \`{ "language", "fluency", "level" }\`.
6. When adding a new item to any array, set its \`id\` to the placeholder string "NEW_ITEM". Never generate random IDs.
7. Keep \`highlights\` arrays as \`string[]\`. Do not change their structure.
8. If the user's query is vague, ask a clarifying question in \`message\` and provide 2-4 \`options\`. If options are provided, omit \`patch\`.
9. Return a single JSON object:
{
  "message": "Short confirmation with no JSON.",
  "options": null,
  "patch": {
    "languages": [ { "id": "NEW_ITEM", "language": "Spanish", "fluency": "Fluent", "level": 4 } ]
  }
}
10. \`patch\` keys are section names from the current CV (\`languages\`, \`skills\`, \`experience\`, \`education\`, \`basics\`, etc.). Omit \`patch\` when nothing should change.
11. Selection Boundary Rule: Do NOT restrict modifications only to 'User Selection Context' if the user asks to update other sections or the entire CV.
12. Section Target Protection Rule: Do not modify unrelated sections unless the user explicitly asks.
13. Strict Targeting Priorities: Prefer the exact field in 'User Selection Context' when the request is about that selection.`;

    const formattedMessages = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const prompt = `Chat History:\n${formattedMessages}`;

    const result = await callAIWithFallback({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 4096,
      responseMimeType: 'application/json',
      action: 'mori_chat'
    });

    const parsed = parseMoriChatContent(result.content);
    const cleanMessage = parsed.message;
    const options = parsed.options;
    let finalCvData = mergeMoriCvIntoCanvas(cvData, parsed);

    if (finalCvData) {
      finalCvData = injectItemIds(finalCvData);
    }

    const assistantMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: cleanMessage,
      timestamp: Date.now(),
      options: options
    };

    let chatRecord;
    
    if (chatId) {
      chatRecord = await MoriChat.findOneAndUpdate(
        { _id: chatId, userId: session.user.id },
        { 
          $push: { messages: { $each: [latestMessage, assistantMessage] } },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      ).lean();
    } else {
      let generatedTitle = latestMessage.content.substring(0, 40) + (latestMessage.content.length > 40 ? '...' : '');
      try {
         const titleResult = await callAIWithFallback({
            prompt: `Generate a very short (2-4 words) title for this chat based on this first message: "${latestMessage.content}"`,
            systemPrompt: 'You are a helpful assistant. Output ONLY the title, no quotes, no extra text.',
            temperature: 0.3,
            action: 'mori_chat_title'
         });
         if (titleResult && titleResult.content) {
             generatedTitle = titleResult.content.replace(/["']/g, '').trim();
         }
      } catch (e) {
         console.warn("Failed to generate title, using fallback", e);
      }

      chatRecord = await MoriChat.create({
        userId: session.user.id,
        cvId: cvId || null,
        title: generatedTitle,
        messages: [
          {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm Mori. I can help you edit your CV using natural language. You can also select any part of the CV on the left to focus our conversation.",
            timestamp: Date.now() - 1000
          },
          latestMessage,
          assistantMessage
        ]
      });
    }

    if (!chatRecord) {
      return NextResponse.json({ error: 'Chat session not found or failed to create' }, { status: 404 });
    }

    // Check if the limit is now exhausted (meaning we have completed 5 turns)
    let limitExhausted = false;
    if (user && user.currentPlanKey === 'starter_monthly') {
      const lastResetDate = user.credits?.lastResetDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const userChats = await MoriChat.find({
        userId: session.user.id,
        updatedAt: { $gte: lastResetDate }
      }).lean();

      let inwardCount = 0;
      let outwardCount = 0;

      userChats.forEach((chat: any) => {
        if (Array.isArray(chat.messages)) {
          chat.messages.forEach((msg: any) => {
            if (msg.id === 'welcome') return;
            if (msg.role === 'user') {
              inwardCount++;
            } else if (msg.role === 'assistant') {
              outwardCount++;
            }
          });
        }
      });

      if (inwardCount >= 5 || outwardCount >= 5) {
        limitExhausted = true;
      }
    }

    // Log user action & AI activity
    await ActivityLogService.logUserAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: 'mori_chat_message',
      resourceType: 'cv',
      resourceId: cvId ?? undefined,
      status: 'success',
      metadata: {
        chatId: chatRecord._id.toString(),
        messageLength: latestMessage.content.length,
        hasSelection: !!selection,
        selectionPath: selection?.path,
        hasCvUpdate: !!finalCvData
      }
    });

    await ActivityLogService.logAI({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      model: 'gemini-1.5-flash',
      tokensUsed: 0,
      cost: 0,
      prompt: latestMessage.content,
      responseLength: cleanMessage.length,
      action: 'mori_chat',
      status: 'success',
      endpoint: '/api/ai/mori-chat'
    });

    return NextResponse.json({
      chatId: chatRecord._id,
      title: chatRecord.title,
      message: cleanMessage,
      options: options,
      updatedCV: finalCvData,
      limitExhausted
    });

  } catch (error: any) {
    console.error('Mori Chat Error:', error);
    try {
      await ActivityLogService.logUserAction({
        userId: session?.user?.id ?? '',
        userEmail: session?.user?.email ?? undefined,
        action: 'mori_chat_message',
        resourceType: 'cv',
        resourceId: cvId ?? undefined,
        status: 'failed',
        metadata: {
          error: error.message
        }
      });
    } catch (_) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
