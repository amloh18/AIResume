'use client';

/**
 * useVoiceRecorder
 *
 * Core hook for the voice interview system.
 * Manages microphone, browser speech recognition, MediaRecorder, and Whisper fallback.
 *
 * Architecture:
 *   Browser Speech Recognition (primary) → live transcript
 *   MediaRecorder (backup) → audio blob → Whisper fallback
 *
 * The hook does NOT run Whisper continuously.
 * Whisper is only used if browser speech recognition fails.
 */

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from 'react';
import type {
  VoiceStage,
  VoiceState,
  VoiceActions,
  TranscriptSegment,
  TranscriptResult,
} from '@/lib/interview/types';
import {
  isBrowserSpeechSupported,
  startBrowserSpeech,
  mergeSegments,
} from '@/lib/interview/providers/browserSpeech';
import { transcribeWithWhisper } from '@/lib/interview/providers/whisperProvider';

export interface MicSupport {
  available: boolean;
  /** User-facing explanation when `available` is false. */
  reason?: string;
}

/**
 * Capability probe for the microphone.
 *
 * This does NOT request access and does NOT trigger a permission prompt — it
 * only inspects what the environment exposes, so the UI can offer the typed
 * fallback *before* the user clicks into a dead end.
 *
 * `navigator.mediaDevices` is undefined outside a secure context and in many
 * embedded / in-app browsers (IDE preview panes, mobile webviews, some
 * Electron shells), which is a completely different situation from the user
 * denying permission.
 */
export function probeMicSupport(): MicSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { available: false, reason: 'Microphone access is only available in the browser.' };
  }

  if (!window.isSecureContext) {
    return {
      available: false,
      reason:
        'Microphone needs a secure connection. Open the app over HTTPS (or on localhost), or type your answer instead.',
    };
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return {
      available: false,
      reason:
        'This browser does not expose microphone access. In-app and embedded browsers often block it — open the app in a full browser tab, or type your answer instead.',
    };
  }

  return { available: true };
}

/**
 * `useSyncExternalStore` requires a referentially stable snapshot, and the
 * environment's capability cannot change without a page reload — so probe once
 * and cache the result.
 */
let micSupportSnapshot: MicSupport | null = null;

function getMicSupportSnapshot(): MicSupport {
  if (micSupportSnapshot === null) micSupportSnapshot = probeMicSupport();
  return micSupportSnapshot;
}

/** Server snapshot: assume available. The client snapshot takes over on hydration. */
const SERVER_MIC_SUPPORT: MicSupport = { available: true };

function getServerMicSupportSnapshot(): MicSupport {
  return SERVER_MIC_SUPPORT;
}

/** Nothing to subscribe to — the value is fixed for the lifetime of the page. */
function subscribeToMicSupport(): () => void {
  return () => {};
}

/**
 * Same pattern for browser speech support.
 *
 * `isBrowserSpeechSupported()` reads `window`, so calling it directly during
 * render made the server render "unsupported" while the client hydrated with
 * "supported" — a hydration mismatch. Routing it through
 * `useSyncExternalStore` gives React an explicit server snapshot to hydrate
 * against, then the client value takes over.
 */
let speechSupportSnapshot: boolean | null = null;

function getSpeechSupportSnapshot(): boolean {
  if (speechSupportSnapshot === null) {
    speechSupportSnapshot = isBrowserSpeechSupported();
  }
  return speechSupportSnapshot;
}

function getServerSpeechSupportSnapshot(): boolean {
  return false;
}

function subscribeToSpeechSupport(): () => void {
  return () => {};
}

/** DOMException names raised by getUserMedia that we handle with a specific message. */
const KNOWN_MIC_ERRORS = [
  'NotAllowedError',
  'PermissionDeniedError',
  'NotFoundError',
  'DevicesNotFoundError',
  'NotReadableError',
  'TrackStartError',
  'OverconstrainedError',
  'SecurityError',
  'AbortError',
];

export interface UseVoiceRecorderOptions {
  /** Language for speech recognition (default: en-US) */
  language?: string;
  /** Maximum recording duration in seconds (default: 600) */
  maxDurationSec?: number;
  /** Session ID for Whisper tracking */
  sessionId?: string;
  /** Question ID for Whisper tracking */
  questionId?: string;
  /** Called when transcript changes */
  onTranscriptChange?: (text: string, isFinal: boolean) => void;
  /** Called when stage changes */
  onStageChange?: (stage: VoiceStage) => void;
  /** Called when recording duration ticks */
  onDurationTick?: (seconds: number) => void;
}

export interface UseVoiceRecorderReturn {
  state: VoiceState;
  actions: VoiceActions;
  /** Audio analyser node for optional waveform visualization */
  analyserNode: AnalyserNode | null;
  /** Whether the microphone is currently active */
  isListening: boolean;
  /** The final audio blob (available after recording stops) */
  audioBlob: Blob | null;
  /**
   * Whether this environment can record audio at all. Resolved after mount so
   * SSR and the first client render agree. Never triggers a permission prompt.
   */
  micSupport: MicSupport;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    language = 'en-US',
    maxDurationSec = 600,
    sessionId,
    questionId,
    onTranscriptChange,
    onStageChange,
    onDurationTick,
  } = options;

  // ── State ───────────────────────────────────────────────────────────────

  const [stage, setStage] = useState<VoiceStage>('idle');
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [durationSec, setDurationSec] = useState(0);
  const [provider, setProvider] = useState<'web_speech' | 'local_whisper' | 'manual'>('web_speech');
  const [error, setError] = useState<string | undefined>();
  const [edited, setEdited] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // SSR-safe read (see getSpeechSupportSnapshot).
  const browserSupported = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getServerSpeechSupportSnapshot
  );

  // Read via useSyncExternalStore rather than setState-in-an-effect: the value
  // is browser-only (so it needs a server snapshot for hydration parity) and
  // constant for the page's lifetime.
  const micSupport = useSyncExternalStore(
    subscribeToMicSupport,
    getMicSupportSnapshot,
    getServerMicSupportSnapshot
  );

  // ── Refs ────────────────────────────────────────────────────────────────

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stageRef = useRef<VoiceStage>('idle');
  const stopRecordingRef = useRef<(() => void) | null>(null);

  // Keep stageRef in sync
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const updateStage = useCallback(
    (newStage: VoiceStage) => {
      setStage(newStage);
      onStageChange?.(newStage);
    },
    [onStageChange]
  );

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    // Stop speech recognition
    if (stopSpeechRef.current) {
      try {
        stopSpeechRef.current();
      } catch {
        // ignore
      }
      stopSpeechRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    clearTimers();
  }, [clearTimers]);

  // ── Start Recording ─────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (stage === 'listening' || stage === 'paused') return;

    setError(undefined);
    setTranscript('');
    setFinalTranscript('');
    setDurationSec(0);
    setAudioBlob(null);
    setEdited(false);
    segmentsRef.current = [];
    audioChunksRef.current = [];

    updateStage('requesting_mic');

    // 1. Capability check — the same probe the UI uses, re-run here so a click
    //    is validated against the live environment rather than stale state.
    const support = probeMicSupport();
    if (!support.available) {
      // Expected in embedded / in-app browsers and on insecure origins, and the
      // typed-answer fallback always exists — so this is a warning, not an error.
      console.warn('[useVoiceRecorder] Microphone unavailable:', support.reason);
      setError(support.reason);
      updateStage('error');
      return;
    }

    // 2. Request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      // Acquiring the mic always has a typed fallback, so the known DOMException
      // modes are warnings. Only an unrecognised failure is worth an error.
      if (KNOWN_MIC_ERRORS.includes(err?.name)) {
        console.warn('[useVoiceRecorder] getUserMedia failed:', err?.name, err?.message);
      } else {
        console.error('[useVoiceRecorder] getUserMedia error:', err?.name, err?.message, err);
      }

      let msg: string;
      switch (err?.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          msg = 'Microphone permission denied. Please allow mic access in your browser settings and try again.';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          msg = 'No microphone found. Please connect a microphone and try again.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          msg = 'Microphone is in use by another application. Please close other apps using the mic and try again.';
          break;
        case 'OverconstrainedError':
          msg = 'Microphone does not meet the required constraints. Please try a different microphone.';
          break;
        case 'SecurityError':
          msg = 'Microphone blocked by browser security. Please ensure you are on HTTPS or localhost.';
          break;
        case 'AbortError':
          msg = 'Microphone request was cancelled.';
          break;
        default:
          msg = `Microphone error: ${err?.message || err?.name || 'Unknown error'}. Please type your answer.`;
      }
      setError(msg);
      updateStage('error');
      return;
    }

    streamRef.current = stream;

    // 2. Set up audio analyser for waveform visualization
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {
      // Waveform is optional — not a blocker
    }

    // 3. Start browser speech recognition (primary)
    let speechActive = false;
    if (browserSupported) {
      stopSpeechRef.current = startBrowserSpeech({
        language,
        continuous: true,
        interimResults: true,
        onInterim: (segment) => {
          segmentsRef.current = [...segmentsRef.current.filter((s) => s.isFinal), segment];
          const merged = mergeSegments(segmentsRef.current);
          setTranscript(merged.fullText);
          onTranscriptChange?.(merged.fullText, false);
        },
        onFinal: (segment) => {
          segmentsRef.current = [...segmentsRef.current.filter((s) => s.isFinal), segment];
          const merged = mergeSegments(segmentsRef.current);
          setTranscript(merged.fullText);
          setFinalTranscript(merged.finalText);
          onTranscriptChange?.(merged.fullText, true);
        },
        onError: (errMsg) => {
          console.warn('[useVoiceRecorder] Speech recognition error:', errMsg);
        },
        onEnd: () => {
          // If speech recognition ends while we're still listening, it may have been
          // an intermittent disconnect. Don't auto-stop the recording.
        },
      });
      speechActive = true;
      setProvider('web_speech');
    } else {
      setProvider('local_whisper');
    }

    // 4. Start MediaRecorder (for Whisper fallback + duration tracking)
    if (typeof MediaRecorder !== 'undefined') {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Build audio blob
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);

          // If browser speech didn't produce a transcript, use Whisper
          if (!speechActive || segmentsRef.current.length === 0) {
            updateStage('transcribing');
            try {
              const result = await transcribeWithWhisper(blob, { language: 'en', sessionId, questionId });
              setTranscript(result.text);
              setFinalTranscript(result.text);
              setProvider('local_whisper');
              onTranscriptChange?.(result.text, true);
            } catch (whisperErr: any) {
              console.error('[useVoiceRecorder] Whisper fallback failed:', whisperErr);
              setError('Transcription failed. Please type your answer.');
              updateStage('error');
              return;
            }
          }
        }

        // Transition to reviewing
        updateStage('reviewing');
      };

      recorder.start();
    }

    // 5. Start duration timer
    timerRef.current = setInterval(() => {
      setDurationSec((prev) => {
        const next = prev + 1;
        onDurationTick?.(next);
        return next;
      });
    }, 1000);

    // 6. Max duration safety
    maxTimerRef.current = setTimeout(() => {
      if (stageRef.current === 'listening' || stageRef.current === 'paused') {
        stopRecordingRef.current?.();
      }
    }, maxDurationSec * 1000);

    updateStage('listening');
  }, [stage, browserSupported, language, maxDurationSec, sessionId, questionId, onTranscriptChange, onDurationTick, updateStage]);

  // ── Stop Recording ──────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    clearTimers();
    updateStage('processing');

    // Stop MediaRecorder (triggers onstop which handles transcription)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop speech recognition
    if (stopSpeechRef.current) {
      try {
        stopSpeechRef.current();
      } catch {
        // ignore
      }
      stopSpeechRef.current = null;
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, [clearTimers, updateStage]);

  // Keep stopRecordingRef in sync for use inside startRecording's max duration timer
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // ── Pause / Resume ──────────────────────────────────────────────────────

  const pauseRecording = useCallback(() => {
    if (stage !== 'listening') return;

    // Pause MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }

    // Pause speech recognition
    if (stopSpeechRef.current) {
      try {
        stopSpeechRef.current();
      } catch {
        // ignore
      }
      stopSpeechRef.current = null;
    }

    clearTimers();
    updateStage('paused');
  }, [stage, clearTimers, updateStage]);

  const resumeRecording = useCallback(async () => {
    if (stage !== 'paused') return;

    // Resume MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    // Re-start speech recognition
    if (browserSupported) {
      stopSpeechRef.current = startBrowserSpeech({
        language,
        continuous: true,
        interimResults: true,
        onInterim: (segment) => {
          segmentsRef.current = [...segmentsRef.current.filter((s) => s.isFinal), segment];
          const merged = mergeSegments(segmentsRef.current);
          setTranscript(merged.fullText);
          onTranscriptChange?.(merged.fullText, false);
        },
        onFinal: (segment) => {
          segmentsRef.current = [...segmentsRef.current.filter((s) => s.isFinal), segment];
          const merged = mergeSegments(segmentsRef.current);
          setTranscript(merged.fullText);
          setFinalTranscript(merged.finalText);
          onTranscriptChange?.(merged.fullText, true);
        },
        onError: () => {},
        onEnd: () => {},
      });
    }

    // Restart duration timer
    timerRef.current = setInterval(() => {
      setDurationSec((prev) => {
        const next = prev + 1;
        onDurationTick?.(next);
        return next;
      });
    }, 1000);

    updateStage('listening');
  }, [stage, browserSupported, language, onTranscriptChange, onDurationTick, updateStage]);

  // ── Transcript Edit ─────────────────────────────────────────────────────

  const setTranscriptText = useCallback(
    (text: string) => {
      setTranscript(text);
      setFinalTranscript(text);
      setEdited(true);
      onTranscriptChange?.(text, true);
    },
    [onTranscriptChange]
  );

  // ── Submit Answer ───────────────────────────────────────────────────────

  const submitAnswer = useCallback(() => {
    updateStage('submitting');
  }, [updateStage]);

  // ── Re-record ───────────────────────────────────────────────────────────

  const reRecord = useCallback(() => {
    cleanupAudio();
    setTranscript('');
    setFinalTranscript('');
    setDurationSec(0);
    setAudioBlob(null);
    setEdited(false);
    segmentsRef.current = [];
    audioChunksRef.current = [];
    setError(undefined);
    updateStage('idle');
  }, [cleanupAudio, updateStage]);

  // ── Reset ───────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    cleanupAudio();
    setStage('idle');
    setTranscript('');
    setFinalTranscript('');
    setDurationSec(0);
    setAudioBlob(null);
    setEdited(false);
    setError(undefined);
    segmentsRef.current = [];
    audioChunksRef.current = [];
  }, [cleanupAudio]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // ── Derived state ───────────────────────────────────────────────────────

  const state: VoiceState = {
    stage,
    transcript,
    finalTranscript,
    durationSec,
    provider,
    error,
    browserSpeechSupported: browserSupported,
    edited,
  };

  const actions: VoiceActions = {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    setTranscript: setTranscriptText,
    submitAnswer,
    reRecord,
    reset,
  };

  return {
    state,
    actions,
    analyserNode: analyserRef.current,
    isListening: stage === 'listening',
    audioBlob,
    micSupport,
  };
}
