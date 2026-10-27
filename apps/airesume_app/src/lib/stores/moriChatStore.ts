'use client';

/**
 * moriChatStore — the ONE conversation state behind every Mori surface.
 *
 * Mori now has two hosts: the editor's utility panel (primary) and the floating
 * dock it replaced. They are two UIs over one chat, not two chats: the same
 * engine (`/api/ai/mori-chat`), the same Mongo history, and — through this
 * module — the same in-memory conversation. Mounting a second surface, or
 * moving between them, therefore continues the thread instead of starting a
 * blank chat.
 *
 * Deliberately a tiny external store rather than a React context: the surfaces
 * mount/unmount independently and neither is an ancestor of the other, so the
 * state must outlive both. `useSyncExternalStore` gives every mounted surface
 * the same snapshot and re-renders them on write.
 *
 * Server state that already lives elsewhere stays elsewhere: chat history in
 * `/api/ai/mori-chat/history`, the CV in ResumeEnhancerContext.
 */

import { useSyncExternalStore } from 'react';
import type { MoriProposedChange } from '@/lib/utils/mori-proposed-changes';
import type { MoriProposalStatus } from '@/components/mori/MoriProposalCard';

export interface MoriChatOption {
  label: string;
  prompt: string;
  description?: string;
}

/** A pending Mori edit held for review (see MoriProposalCard). */
export interface MoriChatProposal {
  cvData: any;
  changes: MoriProposedChange[];
  hiddenCount: number;
  status: MoriProposalStatus;
  /** Snapshot taken at Apply time, so Undo can restore it faithfully. */
  previousCv?: any;
}

export interface MoriChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selection?: {
    path: string;
    text: string;
  };
  options?: MoriChatOption[];
  isError?: boolean;
  proposal?: MoriChatProposal;
}

export interface MoriChatHistoryItem {
  _id: string;
  title: string;
  updatedAt: string;
  cvId?: string;
}

export interface MoriChatSession {
  messages: MoriChatMessage[];
  chatId: string | null;
  chatHistory: MoriChatHistoryItem[];
  limitExhausted: boolean;
  /**
   * A prompt produced by a canvas affordance (suggestion chip, ask bar) while no
   * chat was mounted yet.
   *
   * The sender cannot dispatch it straight at the chat: the panel that hosts it
   * has not rendered. Queueing makes the hand-off order-independent — the chat
   * drains this when it mounts, which is why the canvas no longer needs its own
   * inline conversation just to catch the first message.
   */
  pendingPrompt: MoriPendingPrompt | null;
}

export interface MoriPendingPrompt {
  prompt: string;
  selection?: { path: string; text: string } | null;
}

export const MORI_WELCOME_MESSAGE: MoriChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm Mori. I can help you edit your CV using natural language. You can also select any part of the CV on the left to focus our conversation.",
  timestamp: 0,
};

function initialState(): MoriChatSession {
  return {
    messages: [MORI_WELCOME_MESSAGE],
    chatId: null,
    chatHistory: [],
    limitExhausted: false,
    pendingPrompt: null,
  };
}

let state: MoriChatSession = initialState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): MoriChatSession {
  return state;
}

/** The store's snapshot is module-level, so the server render uses a fresh one. */
function getServerSnapshot(): MoriChatSession {
  return state;
}

type Updater<T> = T | ((previous: T) => T);

function resolve<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === 'function' ? (updater as (value: T) => T)(previous) : updater;
}

export const moriChatStore = {
  getState: getSnapshot,

  /**
   * Write one slice. Messages are the hot path here; the other fields are
   * bookkeeping that must survive a surface switch.
   */
  set<K extends keyof MoriChatSession>(key: K, value: Updater<MoriChatSession[K]>) {
    const next = resolve(value, state[key]);
    if (next === state[key]) return;
    state = { ...state, [key]: next };
    emit();
  },

  setMessages(updater: Updater<MoriChatMessage[]>) {
    this.set('messages', updater);
  },

  setChatId(chatId: string | null) {
    this.set('chatId', chatId);
  },

  setChatHistory(updater: Updater<MoriChatHistoryItem[]>) {
    this.set('chatHistory', updater);
  },

  setLimitExhausted(limitExhausted: boolean) {
    this.set('limitExhausted', limitExhausted);
  },

  /** Hand a prompt to whichever chat surface mounts next. */
  queuePrompt(pendingPrompt: MoriPendingPrompt) {
    this.set('pendingPrompt', pendingPrompt);
  },

  /** Consume the queued prompt exactly once. */
  takePrompt(): MoriPendingPrompt | null {
    const pending = state.pendingPrompt;
    if (pending) this.set('pendingPrompt', null);
    return pending;
  },

  /** New chat, sign-out hand-off, or after the server session is discarded. */
  reset() {
    state = initialState();
    emit();
  },
};

/** Subscribe a component to the shared conversation. */
export function useMoriChatSession(): MoriChatSession {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Non-hook subscription, for hosts that are not React components (and for the
 * verification script that pins the store's contract).
 */
export function subscribeToMoriChat(listener: () => void): () => void {
  return subscribe(listener);
}
