import { NextRequest, NextResponse } from 'next/server';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional resume assistant. Your task is to clean up a raw copy-pasted job description. Remove all non-essential website clutter like website navigation menu items, header/footer links, cookie policies, similar job suggestions, and sign-in promotions. Reformat the actual job title, company name, location, salary range (if present), key responsibilities, and requirements into a clean, professional, and well-structured job description. Keep the format concise, organized, and professional. Do not add conversational intro/outro text.`;
    const userPrompt = `Clean and format the following raw job description:\n\n${text}`;

    const result = await callAIWithFallback({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.2
    });

    if (result && result.content) {
      return NextResponse.json({
        success: true,
        cleanedText: result.content.trim()
      });
    } else {
      throw new Error('Empty response from AI service');
    }
  } catch (error: any) {
    console.error('Error cleaning job description:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clean job description' },
      { status: 500 }
    );
  }
}
