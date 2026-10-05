/**
 * Whisper Health Check API Route
 *
 * Returns the health status of the local Whisper worker.
 * GET /api/interview/whisper-health
 */

import { NextRequest, NextResponse } from 'next/server';

const WHISPER_WORKER_URL = process.env.WHISPER_WORKER_URL || 'http://127.0.0.1:8787';

export async function GET(_req: NextRequest) {
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
        queueDepth: 0,
        error: `Worker returned ${response.status}`,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({
      online: false,
      modelLoaded: false,
      queueAvailable: false,
      queueDepth: 0,
      error: error?.message || 'Worker unreachable',
    });
  }
}
