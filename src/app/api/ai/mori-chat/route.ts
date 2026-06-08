import { NextResponse } from 'next/server';
import merge from 'lodash/merge';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';

export async function POST(req: Request) {
  try {
    const { messages, cvData, selection, jobData, targetRole, seniorityLevel } = await req.json();

    const latestMessage = messages[messages.length - 1];
    
    // Construct the system prompt
    const systemPrompt = `You are Mori, an expert CV AI assistant. Your goal is to help users edit their CVs via natural language.
    
Current CV Data Context:
Target Role: ${targetRole || 'Not specified'}
Seniority: ${seniorityLevel || 'Not specified'}

User Selection Context:
${selection ? `Path: ${selection.path}\nContent: "${selection.text}"` : 'No specific section selected.'}

Your task:
1. Respond to the user's request conversationally (be encouraging and concise).
2. If the user asks to modify the CV, you MUST provide the specific data updates in a JSON block at the end of your response, wrapped in \`\`\`json update ... \`\`\`. 

Example response if a user asks to improve their summary:
Here is an improved version of your summary focusing on leadership.
\`\`\`json update
{
  "basics": {
    "summary": "Dynamic leader with 10 years of experience..."
  }
}
\`\`\`

Only include the exact fields that need to be updated. The system will deep-merge this with the existing CV data, so you do not need to provide unchanged fields.`;

    const formattedMessages = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    
    const prompt = `Chat History:\n${formattedMessages}`;

    const result = await callAIWithFallback({
      prompt,
      systemPrompt,
      temperature: 0.7,
      action: 'mori_chat'
    });

    const aiResponse = result.content;

    // Parse out the JSON update if it exists
    let finalCvData = null;
    let cleanMessage = aiResponse;

    const jsonMatch = aiResponse.match(/```json\s*update\n([\s\S]*?)\n```/i);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const updatePayload = JSON.parse(jsonMatch[1]);
        // Deep merge the update payload into the original cvData
        finalCvData = merge({}, cvData, updatePayload);
        cleanMessage = aiResponse.replace(/```json\s*update\n[\s\S]*?\n```/i, '').trim();
      } catch (e) {
        console.error('Failed to parse Mori JSON update', e);
      }
    }

    return NextResponse.json({
      message: cleanMessage,
      updatedCV: finalCvData
    });

  } catch (error: any) {
    console.error('Mori Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
