/**
 * Whisper Transcription API Route
 *
 * Proxies audio to the local Whisper worker subprocess.
 * Returns the transcript in the same format as browser speech recognition.
 *
 * POST /api/interview/transcribe-whisper
 * GET  /api/interview/transcribe-whisper (health check)
 */

import { NextRequest, NextResponse } from 'next/server';

const WHISPER_WORKER_URL = process.env.WHISPER_WORKER_URL || 'http://127.0.0.1:8787';
const WHISPER_TIMEOUT_MS = parseInt(process.env.WHISPER_TIMEOUT_MS || '120000', 10);

export async function GET() {
  try {
    const response = await fetch(`${WHISPER_WORKER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        online: false,
        modelLoaded: false,
        queueAvailable: false,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      online: false,
      modelLoaded: false,
      queueAvailable: false,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Forward to local Whisper worker
    const workerFormData = new FormData();
    workerFormData.append('audio', audioFile);

    const language = formData.get('language') || 'en';
    workerFormData.append('language', language as string);

    const sessionId = formData.get('sessionId');
    if (sessionId) workerFormData.append('sessionId', sessionId as string);

    const questionId = formData.get('questionId');
    if (questionId) workerFormData.append('questionId', questionId as string);

    const response = await fetch(`${WHISPER_WORKER_URL}/transcribe`, {
      method: 'POST',
      body: workerFormData,
      signal: AbortSignal.timeout(WHISPER_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Whisper API] Worker error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `Whisper worker error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Whisper API] Error:', error?.message || error);

    if (error?.name === 'TimeoutError' || error?.code === 'ABORT_ERR') {
      return NextResponse.json(
        { success: false, error: 'Whisper transcription timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Whisper worker unavailable' },
      { status: 503 }
    );
  }
}
