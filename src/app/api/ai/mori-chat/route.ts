import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import MoriChat from '@/models/MoriChat';
import CV from '@/models/CV';
import { isFreeTierPlan } from '@/lib/utils/subscription-helpers';

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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, messages, cvData, selection, jobData, targetRole, seniorityLevel, cvId } = await req.json();

    const incomingLatest = messages[messages.length - 1];
    const latestMessage = {
      id: incomingLatest.id || Date.now().toString(),
      role: incomingLatest.role,
      content: incomingLatest.content,
      timestamp: incomingLatest.timestamp || Date.now(),
      selection: incomingLatest.selection
    };
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
${selection ? `Path: ${selection.path}\nContent: "${selection.text}"` : 'No specific section selected.'}
(Note: The selection context shows what the user currently has selected/focused on the screen. However, they are NOT restricted to editing only this selection. If the user asks for changes across other sections or the entire CV, you MUST apply updates to all appropriate sections.)

Your task is to analyze the user's request, their current CV, their master CV, and the job description, and return a structured JSON response.

Strict Rules for CV updates:
1. If the user asks to modify the CV and the request is clear, you MUST suggest updates.
2. All suggestions/edits must be returned in the \`updatedCV\` property.
3. The \`updatedCV\` property MUST contain the ENTIRE CV structure (with your updates merged). Do NOT return partial snippets. Truncating any section in \`updatedCV\` will cause user data loss.
4. When adding a new item to any array (like \`work\`, \`education\`, \`projects\`, \`volunteer\`, etc.), you MUST set its \`id\` to the placeholder string "NEW_ITEM". Never generate random IDs.
5. Keep \`highlights\` arrays as array of strings (\`string[]\`). Do not change their structure.
6. The conversational message answering the user must be placed in the \`message\` property.
7. If the user's query is vague, or if they need to choose a direction (e.g. "make it sound better"), ask a clarifying question in the \`message\` property, and provide 2-4 options in the \`options\` array.
8. If options are provided, do NOT populate \`updatedCV\`.
9. The response must be a single JSON object with the format:
{
  "message": "Conversational reply text...",
  "options": [
    { "label": "Option label (2-5 words)", "prompt": "Prompt that will be sent if user clicks this" }
  ],
  "updatedCV": <Full CV object structure, or null/omitted if no updates>
}
10. Ensure the response conforms strictly to this JSON format and is valid JSON.
11. Selection Boundary Rule: Do NOT restrict your modifications only to the 'User Selection Context' if the user's request asks to update other sections, multiple sections, or the entire CV. The selection context is merely a focus guide. If they ask to update the whole CV or sections different from the selection, execute the requested broader updates.`;

    const formattedMessages = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const prompt = `Chat History:\n${formattedMessages}`;

    const result = await callAIWithFallback({
      prompt,
      systemPrompt,
      temperature: 0.5,
      maxTokens: 4096,
      responseMimeType: 'application/json',
      action: 'mori_chat'
    });

    const aiResponse = result.content;

    let jsonResponse: any = {};
    try {
      jsonResponse = JSON.parse(aiResponse);
    } catch (parseErr) {
      console.error('Failed to parse structured JSON from Mori response:', parseErr);
      let cleanText = aiResponse.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      }
      try {
        jsonResponse = JSON.parse(cleanText);
      } catch (nestedErr) {
        console.error('Secondary parse attempt failed:', nestedErr);
        jsonResponse = { message: aiResponse };
      }
    }

    const cleanMessage = jsonResponse.message || '';
    const options = jsonResponse.options || null;
    let finalCvData = jsonResponse.updatedCV || null;

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
