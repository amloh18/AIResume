import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { ActivityLogService } from '@/lib/services/activityLogService';

function getGeminiApiKey(): string {
  const key =
    process.env.gemini_api_key ||
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1 ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!key) throw new Error('No Gemini API key configured');

  return key;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    const model = 'gemini-2.5-flash-lite';
    const prompt = `You are an expert interview coach analyzing a candidate's voice response.
Please provide:
1. The exact transcription of the audio.
2. A brief tone analysis (e.g., Confident, Nervous, Enthusiastic).
3. A brief pace analysis (e.g., Too fast, Appropriate, Too slow).

Return the response STRICTLY as a JSON object with this format:
{
  "transcription": "...",
  "toneAnalysis": {
    "tone": "...",
    "pace": "..."
  }
}`;

    const apiKey = getGeminiApiKey();

    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: audioFile.type || 'audio/webm',
                data: base64Audio
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '{}';

    const usageMetadata = (response as any).usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || Math.ceil(base64Audio.length / 4);
    const outputTokens = usageMetadata?.candidatesTokenCount || Math.ceil(responseText.length / 4);
    const tokensUsed = inputTokens + outputTokens;
    const cost = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;

    await ActivityLogService.logAI({
      model: model,
      tokensUsed,
      cost,
      prompt: 'Audio Transcription & Tone Analysis',
      responseLength: responseText.length,
      action: 'audio_transcription',
      endpoint: 'transcribe',
      status: 'success'
    }).catch(console.error);

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        transcription: responseText,
        toneAnalysis: { tone: 'Neutral', pace: 'Moderate' }
      };
    }

    return NextResponse.json({
      success: true,
      text: parsedData.transcription,
      toneAnalysis: parsedData.toneAnalysis
    });

  } catch (error: any) {
    console.error('Audio Transcription Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to transcribe audio. Ensure Gemini API key is valid and supports audio.'
    }, { status: 500 });
  }
}
