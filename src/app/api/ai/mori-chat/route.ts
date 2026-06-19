import { NextRequest, NextResponse } from 'next/server';
import merge from 'lodash/merge';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import MoriChat from '@/models/MoriChat';

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
    
    // Construct the system prompt
    const systemPrompt = `You are Mori, an expert CV AI assistant. Your goal is to help users edit their CVs via natural language.
    
Current CV Data Context:
Target Role: ${targetRole || 'Not specified'}
Seniority: ${seniorityLevel || 'Not specified'}

User Selection Context:
${selection ? `Path: ${selection.path}\nContent: "${selection.text}"` : 'No specific section selected.'}

RULES:
1. Respond to the user's request conversationally (be encouraging and concise).
2. If the user's request is NOT related to CV building, editing, career advice, or job applications, politely decline the request and remind them you are a CV assistant.
3. If the user asks to modify the CV and the request is clear, you MUST provide the specific data updates in a JSON block at the end of your response, wrapped in \`\`\`json update ... \`\`\`. 
4. If the user's query is vague, unclear, or has multiple good approaches (e.g. "make it sound better"), ask them a clarifying question and provide 2-4 clickable options in a JSON block wrapped in \`\`\`json options ... \`\`\`. 

Example 1 (Direct Update):
Here is an improved version of your summary focusing on leadership.
\`\`\`json update
{
  "basics": {
    "summary": "Dynamic leader with 10 years of experience..."
  }
}
\`\`\`

Example 2 (Needs Options):
I can definitely help with that. Would you prefer a more technical tone, or something more leadership-focused?
\`\`\`json options
[
  { "label": "Make it technical", "prompt": "Rewrite the summary to focus on my technical skills." },
  { "label": "Focus on leadership", "prompt": "Rewrite the summary emphasizing leadership." }
]
\`\`\`

Only include the exact fields that need to be updated in the "update" JSON. The system will deep-merge this with the existing CV data. Do NOT provide both 'update' and 'options' JSON in the same response.`;

    const formattedMessages = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    
    const prompt = `Chat History:\n${formattedMessages}`;

    const result = await callAIWithFallback({
      prompt,
      systemPrompt,
      temperature: 0.7,
      action: 'mori_chat'
    });

    const aiResponse = result.content;

    let finalCvData = null;
    let cleanMessage = aiResponse;
    let options = null;

    // Check for unrelated query handling by AI
    // (We rely on the prompt instructing the AI to politely decline, no strict parsing needed)

    const updateMatch = aiResponse.match(/```json\s*update\n([\s\S]*?)\n```/i);
    const optionsMatch = aiResponse.match(/```json\s*options\n([\s\S]*?)\n```/i);

    if (updateMatch && updateMatch[1]) {
      try {
        const updatePayload = JSON.parse(updateMatch[1]);
        finalCvData = merge({}, cvData, updatePayload);
        cleanMessage = aiResponse.replace(/```json\s*update\n[\s\S]*?\n```/i, '').trim();
      } catch (e) {
        console.error('Failed to parse Mori JSON update', e);
      }
    } else if (optionsMatch && optionsMatch[1]) {
      try {
        options = JSON.parse(optionsMatch[1]);
        cleanMessage = aiResponse.replace(/```json\s*options\n[\s\S]*?\n```/i, '').trim();
      } catch (e) {
        console.error('Failed to parse Mori JSON options', e);
      }
    }

    // Save to DB
    await getConnection();
    
    const assistantMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: cleanMessage,
      timestamp: Date.now(),
      options: options // Store options in the message state to render them
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
      // Create new chat and generate title based on first message
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

    return NextResponse.json({
      chatId: chatRecord._id,
      title: chatRecord.title,
      message: cleanMessage,
      options: options,
      updatedCV: finalCvData
    });

  } catch (error: any) {
    console.error('Mori Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
