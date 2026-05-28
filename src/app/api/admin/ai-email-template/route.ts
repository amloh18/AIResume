import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';

export async function POST(request: NextRequest) {
  try {
    const { prompt, category, context } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const systemPrompt = `You are an expert B2B and B2C email marketing copywriter. Your task is to generate compelling, high-converting email content based on the user's prompt. 
You must output ONLY a valid JSON object with EXACTLY two fields:
{
  "subject": "The email subject line",
  "htmlContent": "The email body in raw HTML format, using only tags like <h1>, <p>, <strong>, <ul>, <li>, and <a class='btn'> for CTA buttons."
}

Important HTML formatting rules:
- Do not include <html>, <head>, or <body> tags. The output will be injected into an existing template body.
- Use <h1> for the main heading.
- Use <p> for paragraphs.
- For a Call to Action (CTA), use <a href="{{appUrl}}/path" class="btn">Button Text</a>. Note the single or double quotes, but ensure the JSON is correctly escaped.
- Make it sound professional, engaging, and action-oriented.
- Do NOT output markdown code blocks like \`\`\`json. Output raw JSON only.`;

    const userPrompt = `Generate an email campaign for the following scenario:
Prompt: ${prompt}
Category/Type: ${category || 'general'}
Additional Context: ${context || 'None'}`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    let generatedText: string | null = null;
    try {
      generatedText = await callGeminiWithAllKeysFallback(fullPrompt, {
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 2048,
      });
    } catch (error) {
      // Fallback model if the first one fails
       generatedText = await callGeminiWithAllKeysFallback(fullPrompt, {
        model: 'gemini-2.0-flash',
        temperature: 0.7,
        maxTokens: 2048,
      });
    }

    if (!generatedText) {
      return NextResponse.json({ error: 'No content generated from AI' }, { status: 500 });
    }

    // Clean up potential markdown formatting
    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON output:', cleanedText);
      return NextResponse.json({ error: 'AI returned invalid JSON format' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subject: parsedResult.subject,
      htmlContent: parsedResult.htmlContent
    });
  } catch (error: any) {
    console.error('AI Email Template Generation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate email template',
      details: error.message
    }, { status: 500 });
  }
}
