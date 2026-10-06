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
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import { normalizeCvData } from '@/types/cv-normalizer';
import { diffCVData } from '@/types/cv-edit-ops';

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
        userId: mixedIdFilter(session.user.id),
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
      const analysisPrompt = ANALYSIS_AGENT_PROMPT
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

      const tailorPrompt = CV_TAILOR_AGENT_PROMPT
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
          { _id: chatId, userId: mixedIdFilter(session.user.id) },
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

    // Normalize CV data to ensure all items have stable IDs for addressing
    const normalizedCvData = normalizeCvData(cvData);

    // Construct the system prompt
    const systemPrompt = `You are Mori, an expert CV AI assistant. Your goal is to help users edit their CVs via natural language.
You have access to the user's Master CV, their Current CV being edited, and the target Job Description (JD) for the role they are applying to.

CONTEXTS:
1. <master_cv>
${masterCVData ? JSON.stringify(masterCVData, null, 2) : 'No Master CV loaded.'}
</master_cv>
Use this as the source of truth for their experiences. NEVER manufacture new experiences, timelines, or roles that do not exist in the Master CV.

2. <current_cv>
${normalizedCvData ? JSON.stringify(normalizedCvData, null, 2) : 'No CV data available.'}
</current_cv>
IMPORTANT: Every record in this CV has a stable "id" field. Every description block has an "id" and a "type" ("paragraph" or "bullet"). You MUST use these IDs when targeting edits. Never guess or fabricate IDs.

3. <job_description>
${jdText || 'No job description provided.'}
</job_description>

Target Role: ${targetRole || 'Not specified'}
Seniority: ${seniorityLevel || 'Not specified'}

User Selection Context:
${resolvedSelection ? `Path: ${resolvedSelection.path}\nContent: "${resolvedSelection.text}"\nThe user named or implied this section. Apply the edit to this section even if they did not click it on the canvas.` : 'No specific section selected. Infer the section from the user request (for example languages, skills, experience). If it is still unclear, ask a short clarifying question.'}
(Note: The selection context shows what the user currently has selected/focused on the screen. However, they are NOT restricted to editing only this selection. If the user asks for changes across other sections or the entire CV, you MUST apply updates to all appropriate sections.)

YOUR TASK:
Analyze the user's request, their current CV, their master CV, and the job description. Return a structured JSON response.

═══════════════════════════════════════════════════════════════
BATCH QUESTIONS — ASK MULTIPLE AT ONCE, NOT ONE BY ONE
═══════════════════════════════════════════════════════════════
When you need clarification, ask ALL clarifying questions in a SINGLE response using the "options" array. Group related questions together.

Example — user says "fix my CV":
Instead of asking "Which section?" then waiting, then asking "What style?", ask ALL at once:
{
  "message": "I can help fix your CV. Here are the areas I can improve — pick one or more:",
  "options": [
    { "label": "✨ Improve Summary", "prompt": "Improve my professional summary to be more impactful" },
    { "label": "🚀 Enhance Bullet Points", "prompt": "Enhance all bullet points with stronger action verbs and metrics" },
    { "label": "🛠️ Optimize Skills for ATS", "prompt": "Optimize my skills section for ATS screening" },
    { "label": "📋 Fix Formatting & Consistency", "prompt": "Fix formatting, consistency, and spacing across all sections" },
    { "label": "🎯 Tailor to Job Description", "prompt": "Tailor my entire CV to match the target job description" },
    { "label": "✅ Full CV Polish", "prompt": "Polish my entire CV — summary, experience, skills, and formatting" }
  ],
  "operations": null,
  "patch": null
}

═══════════════════════════════════════════════════════════════
WHOLE-CV REQUESTS — BREAK INTO SECTIONS AND FIX ALL
═══════════════════════════════════════════════════════════════
When the user asks to "fix my whole CV", "improve everything", "polish my CV", or similar broad requests:
1. Analyze ALL sections of the CV
2. Identify the top 3-5 most impactful improvements
3. Apply ALL of them in a single response using operations or patch
4. Summarize what you changed in the message

Do NOT ask "which section?" for broad requests. Just fix the most impactful areas and report what you did.

═══════════════════════════════════════════════════════════════
POST-EDIT OPTIONS — ALWAYS SUGGEST NEXT STEPS
═══════════════════════════════════════════════════════════════
After completing an edit, ALWAYS include relevant follow-up options so the user can continue improving their CV without typing. Example:
- After fixing work experience → suggest "Now improve my summary" or "Optimize skills for ATS"
- After adding skills → suggest "Tailor to job description" or "Enhance bullet points"
- After fixing summary → suggest "Now improve work experience" or "Add missing certifications"

These options keep the conversation flowing and help users improve their CV incrementally.

RULES FOR CV EDITS — READ CAREFULLY:

1. RETURN STRUCTURED OPERATIONS. Use the "operations" array for targeted edits. Each operation targets a specific element by its ID.
   Operation types:
   - "update_text": Change the content of a description block. Requires: sectionId, recordId, descriptionId, content.
   - "add_description": Add a new bullet or paragraph to a record. Requires: sectionId, recordId, type ("paragraph"|"bullet"), content. Optional: afterDescriptionId (to insert at a specific position).
   - "delete_description": Remove a description block. Requires: sectionId, recordId, descriptionId.
   - "change_description_type": Convert between paragraph and bullet. Requires: sectionId, recordId, descriptionId, type.
   - "update_field": Change a non-description field (e.g., company, position, name). Requires: sectionId, recordId, field, value.
   - "add_record": Add a new entry to a section array. Requires: sectionId, record (with at least a name/position/company). Optional: afterRecordId.
   - "delete_record": Remove an entry from a section. Requires: sectionId, recordId.

2. NEVER return the entire CV. Do not use "updatedCV" for normal edits. Only use "operations" or "patch".

3. For small edits (fixing one bullet, updating one field), use operations ONLY. Do NOT return the full section in patch.

4. For larger edits (rewriting all bullets in a section, adding multiple items), you may use "patch" with the complete replacement for affected sections.

5. Section name mapping:
   - Work experience → key: "work" (items have: name, position, startDate, endDate, summary, highlights, descriptions)
   - Education → key: "education"
   - Skills → key: "skills"
   - Projects → key: "projects"
   - Certifications → key: "certificates"
   - Languages → key: "languages"
   - Volunteer → key: "volunteer"
   - Awards → key: "awards"
   - Publications → key: "publications"
   - Summary/About → key: "basics" (field: "summary")
   - Contact info → key: "basics" (fields: name, label, email, phone, url, location)

6. When adding a new record to an array, set its "id" to "NEW_ITEM". The system will generate a real ID.

7. DESCRIPTION BLOCKS: Records have a "descriptions" array with objects like:
   { "id": "some-uuid", "type": "paragraph"|"bullet", "content": "text" }
   When modifying descriptions, always reference the exact "id" of the target description.

8. PRESERVE IDs. Never regenerate IDs for existing records or descriptions. Never modify records you were not asked to change.

9. MINIMUM NECESSARY MUTATION. An edit to one bullet should NOT rewrite other bullets, the summary, or unrelated sections.

10. AMBIGUITY: If the user's request could apply to multiple records, return "options" (2-6 clarifying choices) instead of guessing. Group related questions together — do NOT ask one question at a time.

11. message: A SHORT spoken confirmation (1-2 sentences). NEVER put JSON, CV objects, or field dumps in message. Include a brief summary of what was changed.

12. NO-OP CHECK: If your operations would not change anything, say so in message instead of returning empty operations.

13. OPTIONS FORMAT: Each option must have:
   - "label": A short, descriptive label (with emoji if helpful, e.g. "✨ Improve Summary")
   - "prompt": The exact prompt that will be sent when the user clicks this option
   Options should be actionable — clicking one should trigger an immediate edit, not another question.

RESPONSE FORMAT:
{
  "message": "Short confirmation of what was done.",
  "options": [
    { "label": "Next Step 1", "prompt": "The prompt for step 1" },
    { "label": "Next Step 2", "prompt": "The prompt for step 2" }
  ],
  "operations": [
    {
      "operation": "update_text",
      "sectionId": "work",
      "recordId": "the-record-id-from-current-cv",
      "descriptionId": "the-description-id-from-current-cv",
      "content": "Improved text here."
    }
  ],
  "patch": null
}`;

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

    // Before/after verification: ensure no user content was lost
    let finalCvData = mergeMoriCvIntoCanvas(cvData, parsed);

    if (finalCvData) {
      // Verify no records were dropped
      const beforeSections = extractSections(cvData);
      const afterSections = extractSections(finalCvData);
      for (const key of Object.keys(beforeSections)) {
        if (beforeSections[key] > 0 && afterSections[key] === 0) {
          console.error(`[mori-chat] Section "${key}" lost all records — rejecting merge`);
          finalCvData = null;
        }
      }
    }

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
        { _id: chatId, userId: mixedIdFilter(session.user.id) },
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
        userId: mixedIdFilter(session.user.id),
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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract record counts for each section.
 * Used to verify no section was entirely deleted during AI merge.
 */
function extractSections(cvData: any): Record<string, number> {
  const sections: Record<string, number> = {};
  const keys = [
    'work', 'education', 'skills', 'projects', 'certificates',
    'languages', 'awards', 'publications', 'volunteer', 'interests',
    'references',
  ];
  for (const key of keys) {
    sections[key] = Array.isArray(cvData[key]) ? cvData[key].length : 0;
  }
  return sections;
}
