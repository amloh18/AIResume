/**
 * Interview Voice System — Core Types
 *
 * Unified transcription abstraction.
 * The interview system does not care which provider produced the transcript.
 */

// ── Transcription ───────────────────────────────────────────────────────────

export type TranscriptionProvider = 'web_speech' | 'local_whisper' | 'manual';

export interface TranscriptResult {
  text: string;
  language: string;
  confidence?: number;
  isFinal: boolean;
  provider: TranscriptionProvider;
  durationMs?: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  confidence?: number;
  isFinal: boolean;
  provider: TranscriptionProvider;
  timestamp: number;
}

// ── Voice Recording States ──────────────────────────────────────────────────

export type VoiceStage =
  | 'idle'
  | 'requesting_mic'
  | 'listening'
  | 'paused'
  | 'processing'
  | 'transcribing'
  | 'reviewing'
  | 'editing'
  | 'submitting'
  | 'saved'
  | 'evaluating'
  | 'completed'
  | 'error';

export interface VoiceState {
  stage: VoiceStage;
  /** Current live transcript (interim + final merged) */
  transcript: string;
  /** Final confirmed transcript after recording stops */
  finalTranscript: string;
  /** Duration in seconds */
  durationSec: number;
  /** Which transcription engine produced the result */
  provider: TranscriptionProvider;
  /** Error message if stage === 'error' */
  error?: string;
  /** Whether browser speech recognition is available */
  browserSpeechSupported: boolean;
  /** Whether the user manually edited the transcript */
  edited: boolean;
}

// ── Voice Actions ───────────────────────────────────────────────────────────

export interface VoiceActions {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  setTranscript: (text: string) => void;
  submitAnswer: () => void;
  reRecord: () => void;
  reset: () => void;
}

// ── Whisper Worker ──────────────────────────────────────────────────────────

export interface WhisperTranscribeRequest {
  audio: Blob;
  language?: string;
  sessionId?: string;
  questionId?: string;
}

export interface WhisperTranscribeResponse {
  success: boolean;
  text?: string;
  language?: string;
  durationMs?: number;
  provider: 'local_whisper';
  error?: string;
}

export interface WhisperHealthResponse {
  online: boolean;
  modelLoaded: boolean;
  queueAvailable: boolean;
  queueDepth: number;
  model?: string;
  device?: string;
}

// ── Interview Answer (extended) ─────────────────────────────────────────────

export interface InterviewAnswer {
  sessionId: string;
  questionId: string;
  userId: string;
  /** Final submitted text */
  transcript: string;
  /** Whether the user manually edited the transcript */
  transcriptEdited: boolean;
  /** Which transcription engine was used */
  transcriptionProvider: TranscriptionProvider;
  /** Recording duration in milliseconds */
  durationMs: number;
  /** ISO timestamp of submission */
  submittedAt: string;
  /** Evaluation status */
  evaluationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  /** AI evaluation result */
  evaluation?: {
    score: number;
    strengths: string[];
    improvements: string[];
    improvedScript: string;
    feedbackSummary: string;
    yourEdge: string;
    voiceCoaching?: VoiceCoaching;
  };
}

export interface VoiceCoaching {
  answerLengthWords: number;
  estimatedPaceWpm: number;
  fillerWordCount: number;
  pauseCount: number;
  overallPaceAssessment: string;
  suggestions: string[];
}

// ── Voice Health (Admin) ────────────────────────────────────────────────────

export interface VoiceHealthMetrics {
  browserSpeechSupported: boolean;
  browserSpeechPercentage: number;
  whisperFallbackPercentage: number;
  whisperFallbackCount: number;
  whisperFailureCount: number;
  averageTranscriptionLatencyMs: number;
  averageRecordingDurationMs: number;
  totalVoiceAnswers: number;
  whisperQueueDepth: number;
  whisperHealth: 'healthy' | 'degraded' | 'offline';
}
