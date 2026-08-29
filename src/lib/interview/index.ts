/**
 * Interview Voice System
 *
 * Unified transcription abstraction.
 * The interview system does not care which provider produced the transcript.
 */

export type {
  TranscriptionProvider,
  TranscriptResult,
  TranscriptSegment,
  VoiceStage,
  VoiceState,
  VoiceActions,
  WhisperTranscribeRequest,
  WhisperTranscribeResponse,
  WhisperHealthResponse,
  InterviewAnswer,
  VoiceCoaching,
  VoiceHealthMetrics,
} from './types';

export {
  isBrowserSpeechSupported,
  startBrowserSpeech,
  mergeSegments,
} from './providers/browserSpeech';

export type { BrowserSpeechConfig } from './providers/browserSpeech';

export {
  transcribeWithWhisper,
  checkWhisperHealth,
} from './providers/whisperProvider';

export type { WhisperProviderConfig } from './providers/whisperProvider';
