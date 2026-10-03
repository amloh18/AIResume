/**
 * Browser Speech Recognition Provider
 *
 * Uses the native Web Speech API (SpeechRecognition).
 * Falls back gracefully if not available.
 *
 * Privacy note: Browser speech recognition behavior depends on
 * browser/platform implementation and may use external speech processing.
 * This is NOT a local-only transcription engine.
 */

import type { TranscriptResult, TranscriptSegment } from '../types';

export interface BrowserSpeechConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onInterim?: (segment: TranscriptSegment) => void;
  onFinal?: (segment: TranscriptSegment) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

let segmentCounter = 0;

function getSegmentId(): string {
  segmentCounter += 1;
  return `seg-${segmentCounter}-${Date.now()}`;
}

/**
 * Check if browser speech recognition is supported.
 */
export function isBrowserSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return !!SpeechRecognition;
}

/**
 * Create and start a browser speech recognition session.
 * Returns a cleanup function to stop recognition.
 */
export function startBrowserSpeech(config: BrowserSpeechConfig): () => void {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    onInterim,
    onFinal,
    onError,
    onEnd,
  } = config;

  if (!isBrowserSpeechSupported()) {
    onError?.('Browser speech recognition is not supported');
    return () => {};
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const recognition: SpeechRecognitionInstance = new SpeechRecognition();
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.lang = language;

  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || '';
      const confidence = result[0]?.confidence || 0;

      const segment: TranscriptSegment = {
        id: getSegmentId(),
        text: transcript,
        isFinal: result.isFinal,
        provider: 'web_speech',
        timestamp: Date.now(),
      };

      if (result.isFinal) {
        onFinal?.({ ...segment, confidence });
      } else {
        onInterim?.(segment);
      }
    }
  };

  recognition.onerror = (event: any) => {
    const error = event.error || 'unknown';
    // 'no-speech' is common and not a real error — just means silence
    if (error === 'no-speech') return;
    if (error === 'aborted') return;
    onError?.(`Speech recognition error: ${error}`);
  };

  recognition.onend = () => {
    onEnd?.();
  };

  try {
    recognition.start();
  } catch (e) {
    onError?.('Failed to start speech recognition');
    return () => {};
  }

  return () => {
    try {
      recognition.abort();
    } catch {
      // ignore
    }
  };
}

/**
 * Merge interim and final segments into a single transcript string.
 * Final segments are immutable — interim is appended at the end.
 */
export function mergeSegments(segments: TranscriptSegment[]): {
  finalText: string;
  interimText: string;
  fullText: string;
} {
  const finalParts: string[] = [];
  let interimText = '';

  for (const seg of segments) {
    if (seg.isFinal) {
      finalParts.push(seg.text.trim());
      interimText = ''; // clear interim once confirmed
    } else {
      interimText = seg.text;
    }
  }

  const finalText = finalParts.join(' ');
  const fullText = interimText ? `${finalText} ${interimText}`.trim() : finalText;

  return { finalText, interimText, fullText };
}
