'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const FEEDBACK_PROMPT_DELAY = 10 * 60 * 1000; // 10 minutes in milliseconds
const STORAGE_KEY = 'feedback-prompt-shown';
const SESSION_START_KEY = 'feedback-session-start';

interface UseSessionTimerOptions {
  onPrompt: () => void;
  enabled?: boolean;
}

export function useSessionTimer({ onPrompt, enabled = true }: UseSessionTimerOptions) {
  const { data: session, status } = useSession();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPromptedRef = useRef(false);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    // Only track for authenticated users
    if (!enabled || status !== 'authenticated' || !session?.user) {
      // Clear timer if user is not authenticated
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const userId = session.user.id || session.user.email || 'unknown';
    const now = Date.now();

    // Check if we've already shown the prompt today
    const lastPromptTime = localStorage.getItem(STORAGE_KEY);
    const lastPrompt = lastPromptTime ? parseInt(lastPromptTime, 10) : 0;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Reset if it's been more than a day since last prompt
    if (lastPrompt < oneDayAgo) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_START_KEY);
      hasPromptedRef.current = false;
    } else {
      hasPromptedRef.current = true;
    }

    // Get or set session start time
    const storedSessionStart = localStorage.getItem(SESSION_START_KEY);
    if (!storedSessionStart) {
      sessionStartRef.current = now;
      localStorage.setItem(SESSION_START_KEY, now.toString());
    } else {
      sessionStartRef.current = parseInt(storedSessionStart, 10);
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Calculate time elapsed since session start
    const timeElapsed = now - (sessionStartRef.current || now);
    const timeRemaining = Math.max(0, FEEDBACK_PROMPT_DELAY - timeElapsed);

    // Only set timer if we haven't prompted yet and there's time remaining
    if (!hasPromptedRef.current && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        if (!hasPromptedRef.current) {
          hasPromptedRef.current = true;
          localStorage.setItem(STORAGE_KEY, Date.now().toString());
          onPrompt();
        }
      }, timeRemaining);
    } else if (!hasPromptedRef.current && timeRemaining <= 0) {
      // If 10 minutes have already passed, prompt immediately
      hasPromptedRef.current = true;
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      onPrompt();
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [session, status, enabled, onPrompt]);

  // Reset session start when user logs in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const storedSessionStart = localStorage.getItem(SESSION_START_KEY);
      if (!storedSessionStart) {
        const now = Date.now();
        sessionStartRef.current = now;
        localStorage.setItem(SESSION_START_KEY, now.toString());
      }
    } else if (status === 'unauthenticated') {
      // Clear session start when user logs out
      localStorage.removeItem(SESSION_START_KEY);
      sessionStartRef.current = null;
      hasPromptedRef.current = false;
    }
  }, [status, session]);

  return {
    hasPrompted: hasPromptedRef.current,
  };
}

