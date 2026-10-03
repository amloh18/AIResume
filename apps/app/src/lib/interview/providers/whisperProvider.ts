/**
 * Local Whisper Provider
 *
 * Sends audio to the local VPS Whisper worker via API.
 * Used as a fallback when browser speech recognition is unavailable.
 *
 * Architecture: This provider calls /api/interview/transcribe-whisper
 * which forwards to the local Whisper worker subprocess.
 */

import type { TranscriptResult } from '../types';

export interface WhisperProviderConfig {
  workerUrl?: string;
  language?: string;
  sessionId?: string;
  questionId?: string;
}

/**
 * Transcribe audio via the local Whisper worker.
 */
export async function transcribeWithWhisper(
  audioBlob: Blob,
  config: WhisperProviderConfig = {}
): Promise<TranscriptResult> {
  const {
    workerUrl = '/api/interview/transcribe-whisper',
    language = 'en',
    sessionId,
    questionId,
  } = config;

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('language', language);
  if (sessionId) formData.append('sessionId', sessionId);
  if (questionId) formData.append('questionId', questionId);

  const startTime = Date.now();

  const response = await fetch(workerUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper transcription failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Whisper transcription failed');
  }

  return {
    text: data.text || '',
    language: data.language || language,
    confidence: data.confidence,
    isFinal: true,
    provider: 'local_whisper',
    durationMs: data.durationMs || Date.now() - startTime,
  };
}

/**
 * Check if the Whisper worker is healthy.
 */
export async function checkWhisperHealth(
  workerUrl: string = '/api/interview/transcribe-whisper'
): Promise<{ online: boolean; modelLoaded: boolean; queueAvailable: boolean }> {
  try {
    const healthUrl = workerUrl.replace('/transcribe-whisper', '/whisper-health');
    const response = await fetch(healthUrl, { method: 'GET' });
    if (!response.ok) return { online: false, modelLoaded: false, queueAvailable: false };
    const data = await response.json();
    return {
      online: data.online ?? false,
      modelLoaded: data.modelLoaded ?? false,
      queueAvailable: data.queueAvailable ?? false,
    };
  } catch {
    return { online: false, modelLoaded: false, queueAvailable: false };
  }
}
