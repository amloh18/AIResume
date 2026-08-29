'use client';

/**
 * VoiceInterviewStage
 *
 * The primary voice interview UI component.
 * Manages all listening states from idle → recording → review → submit.
 *
 * Design principles:
 * - Question remains visually dominant
 * - Microphone is the primary interaction
 * - Transcript is the confirmation layer
 * - Lightweight CSS animations (no heavy React re-renders)
 * - Matches existing BuildAIResume design system
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  RotateCcw,
  Pencil,
  Send,
  Loader2,
  Clock,
  Keyboard,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';
import type { VoiceStage } from '@/lib/interview/types';

interface VoiceInterviewStageProps {
  questionId: string;
  questionText: string;
  sessionId?: string;
  /** Called when user submits their answer */
  onSubmit: (transcript: string, durationMs: number, provider: string) => void;
  /** Called when user wants to type instead */
  onTypeFallback?: () => void;
  /** Whether the question is already answered */
  isAnswered?: boolean;
  /** Existing answer text (for review mode) */
  existingAnswer?: string;
  /** Disable voice (e.g., free plan Q1 only) */
  disabled?: boolean;
}

// ── Waveform Bar (CSS-only animation) ──────────────────────────────────────

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-6">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${active ? 'waveform-bar' : ''}`}
          style={{
            height: active ? undefined : '4px',
            backgroundColor: active
              ? 'var(--accent-primary, #013f2e)'
              : 'var(--text-tertiary, #9ca3af)',
            opacity: active ? 0.6 : 0.3,
            animationDelay: active ? `${i * 0.05}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ── Animated Mic Button ────────────────────────────────────────────────────

function MicButton({
  stage,
  onClick,
  disabled,
}: {
  stage: VoiceStage;
  onClick: () => void;
  disabled?: boolean;
}) {
  const isListening = stage === 'listening';
  const isPaused = stage === 'paused';
  const isProcessing = stage === 'processing' || stage === 'transcribing' || stage === 'submitting' || stage === 'evaluating';

  return (
    <div className="relative flex items-center justify-center">
      {/* Soft ring animation */}
      {isListening && (
        <>
          <div className="absolute w-24 h-24 rounded-full border-2 border-[var(--accent-primary, #013f2e)] opacity-20 animate-ping" />
          <div className="absolute w-20 h-20 rounded-full border border-[var(--accent-primary, #013f2e)] opacity-10 animate-pulse" />
        </>
      )}

      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg ${
          isListening
            ? 'bg-rose-600 hover:bg-rose-700 text-white scale-105'
            : isPaused
            ? 'bg-amber-500 hover:bg-amber-600 text-white'
            : isProcessing
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
            : 'bg-[var(--accent-primary, #013f2e)] hover:bg-[var(--accent-hover, #02523c)] dark:bg-lime-500 dark:hover:bg-lime-600 dark:text-black text-white hover:scale-105'
        }`}
        aria-label={
          isListening
            ? 'Stop recording'
            : isPaused
            ? 'Resume recording'
            : isProcessing
            ? 'Processing answer'
            : 'Start recording answer'
        }
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isListening ? (
          <Square className="w-5 h-5 fill-white" />
        ) : isPaused ? (
          <Play className="w-6 h-6 fill-white" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}

// ── Timer Display ──────────────────────────────────────────────────────────

function TimerDisplay({ seconds, className = '' }: { seconds: number; className?: string }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <span className={`font-mono tabular-nums text-sm font-semibold ${className}`}>
      {mins}:{secs < 10 ? '0' : ''}
      {secs}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function VoiceInterviewStage({
  questionId,
  questionText,
  sessionId,
  onSubmit,
  onTypeFallback,
  isAnswered = false,
  existingAnswer,
  disabled = false,
}: VoiceInterviewStageProps) {
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [typedText, setTypedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { state, actions, analyserNode, isListening, audioBlob } = useVoiceRecorder({
    language: 'en-US',
    maxDurationSec: 600,
    sessionId,
    questionId,
  });

  const { stage, transcript, finalTranscript, durationSec, provider, error, browserSpeechSupported, edited } = state;

  // ── Stage-based rendering ─────────────────────────────────────────────

  const renderStage = () => {
    switch (stage) {
      // ── IDLE ──────────────────────────────────────────────────────────
      case 'idle':
        return (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-5 py-6"
          >
            <MicButton stage={stage} onClick={actions.startRecording} disabled={disabled} />

            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Ready when you are</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                Speak naturally and answer the question in your own words.
              </p>
            </div>

            {!browserSpeechSupported && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                Voice recognition will use BuildAIResume&apos;s local transcription.
              </p>
            )}

            {onTypeFallback && (
              <button
                onClick={() => {
                  setShowTypeInput(true);
                  onTypeFallback();
                }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors mt-2"
              >
                <Keyboard className="w-3.5 h-3.5" />
                Type your answer instead
              </button>
            )}
          </motion.div>
        );

      // ── REQUESTING_MIC ────────────────────────────────────────────────
      case 'requesting_mic':
        return (
          <motion.div
            key="requesting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Requesting microphone access...</p>
          </motion.div>
        );

      // ── LISTENING ─────────────────────────────────────────────────────
      case 'listening':
        return (
          <motion.div
            key="listening"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <MicButton stage={stage} onClick={actions.stopRecording} />

            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-xs font-medium">Listening...</span>
              <TimerDisplay seconds={durationSec} className="text-xs text-[var(--text-secondary)]" />
            </div>

            <WaveformBars active={true} />

            {/* Live transcript */}
            {transcript && (
              <div className="w-full max-w-lg mt-2">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] max-h-40 overflow-y-auto">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {transcript}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={actions.pauseRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-semibold transition-all"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
              <button
                onClick={actions.stopRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Square className="w-3 h-3 fill-white" />
                Stop
              </button>
            </div>

            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
              {browserSpeechSupported ? 'Transcript updates live as you speak' : 'Audio is being recorded for transcription'}
            </p>
          </motion.div>
        );

      // ── PAUSED ────────────────────────────────────────────────────────
      case 'paused':
        return (
          <motion.div
            key="paused"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            <MicButton stage={stage} onClick={actions.resumeRecording} />

            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Paused</p>
              <p className="text-xs text-[var(--text-secondary)]">Take your time.</p>
            </div>

            <TimerDisplay seconds={durationSec} className="text-xs text-[var(--text-secondary)]" />

            <WaveformBars active={false} />

            {/* Show transcript so far */}
            {transcript && (
              <div className="w-full max-w-lg mt-2">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] max-h-40 overflow-y-auto">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {transcript}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={actions.resumeRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-primary, #013f2e)] hover:bg-[var(--accent-hover, #02523c)] dark:bg-lime-500 dark:hover:bg-lime-600 dark:text-black text-white text-xs font-bold transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Resume
              </button>
              <button
                onClick={actions.stopRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Square className="w-3 h-3 fill-white" />
                Stop
              </button>
            </div>
          </motion.div>
        );

      // ── PROCESSING / TRANSCRIBING ─────────────────────────────────────
      case 'processing':
      case 'transcribing':
        return (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[var(--accent-primary, #013f2e)] dark:text-lime-400 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {stage === 'transcribing' ? 'Transcribing audio...' : 'Processing your answer...'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {stage === 'transcribing'
                  ? 'Using local voice transcription'
                  : 'Finalizing your recording'}
              </p>
            </div>
          </motion.div>
        );

      // ── REVIEWING ─────────────────────────────────────────────────────
      case 'reviewing':
        return (
          <motion.div
            key="reviewing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-4 py-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Your Answer</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Clock className="w-3.5 h-3.5" />
                <TimerDisplay seconds={durationSec} />
              </div>
            </div>

            {/* Transcript display / edit */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={edited ? transcript : (finalTranscript || transcript)}
                onChange={(e) => actions.setTranscript(e.target.value)}
                rows={6}
                className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-relaxed resize-none focus:outline-none focus:border-[var(--accent-primary, #013f2e)] dark:focus:border-lime-500 focus:ring-1 focus:ring-[var(--accent-primary, #013f2e)] dark:focus:ring-lime-500 transition-all"
                placeholder="Your transcript will appear here..."
              />
              {provider && (
                <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold rounded-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-tertiary)] uppercase">
                  {provider === 'web_speech' ? 'Browser' : provider === 'local_whisper' ? 'Whisper' : 'Manual'}
                </span>
              )}
            </div>

            <p className="text-[10px] text-[var(--text-secondary)]">
              Review your answer. You can edit the transcript before submitting.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={actions.reRecord}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-record
              </button>

              <button
                onClick={() => textareaRef.current?.focus()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-semibold transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit transcript
              </button>

              <button
                onClick={() => {
                  const text = transcript || finalTranscript;
                  const durationMs = durationSec * 1000;
                  onSubmit(text, durationMs, provider);
                  actions.submitAnswer();
                }}
                disabled={!transcript.trim() && !finalTranscript.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent-primary, #013f2e)] hover:bg-[var(--accent-hover, #02523c)] dark:bg-lime-500 dark:hover:bg-lime-600 dark:text-black text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Answer
              </button>
            </div>
          </motion.div>
        );

      // ── SUBMITTING / SAVED / EVALUATING ───────────────────────────────
      case 'submitting':
      case 'saved':
      case 'evaluating':
        return (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-lime-500/10 flex items-center justify-center">
              {stage === 'saved' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-lime-400" />
              ) : (
                <Loader2 className="w-6 h-6 text-[var(--accent-primary, #013f2e)] dark:text-lime-400 animate-spin" />
              )}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {stage === 'submitting'
                  ? 'Submitting your answer...'
                  : stage === 'saved'
                  ? 'Answer saved'
                  : 'Analyzing your response...'}
              </p>
              {stage === 'saved' && (
                <p className="text-xs text-[var(--text-secondary)]">
                  AI evaluation will appear shortly
                </p>
              )}
            </div>
          </motion.div>
        );

      // ── COMPLETED ─────────────────────────────────────────────────────
      case 'completed':
        return (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-lime-500/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-600 dark:text-lime-400" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Evaluation complete</p>
          </motion.div>
        );

      // ── ERROR ─────────────────────────────────────────────────────────
      case 'error':
        return (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center space-y-2 max-w-sm">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Voice unavailable</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {error || 'Microphone not available.'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={actions.reRecord}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try Again
              </button>
              {onTypeFallback && (
                <button
                  onClick={() => {
                    setShowTypeInput(true);
                    onTypeFallback();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-primary, #013f2e)] hover:bg-[var(--accent-hover, #02523c)] dark:bg-lime-500 dark:hover:bg-lime-600 dark:text-black text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Type Your Answer
                </button>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  // If showing type input, render textarea instead
  if (showTypeInput) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Type your answer</span>
          <button
            onClick={() => setShowTypeInput(false)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back to voice
          </button>
        </div>
        <textarea
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          rows={6}
          placeholder="Type your answer here..."
          className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-relaxed resize-none focus:outline-none focus:border-[var(--accent-primary, #013f2e)] dark:focus:border-lime-500 focus:ring-1 focus:ring-[var(--accent-primary, #013f2e)] dark:focus:ring-lime-500 transition-all"
        />
        <button
          onClick={() => {
            onSubmit(typedText, 0, 'manual');
          }}
          disabled={!typedText.trim()}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent-primary, #013f2e)] hover:bg-[var(--accent-hover, #02523c)] dark:bg-lime-500 dark:hover:bg-lime-600 dark:text-black text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          Submit Answer
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {renderStage()}
      </AnimatePresence>
    </div>
  );
}
