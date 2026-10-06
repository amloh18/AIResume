import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// The collapsed dock is what a signed-in user sees while the chat is down.
// Everything heavy is stubbed — this test only covers the collapsed bar's
// affordances (bring-up chevron), not the conversation UI.
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1' } }, status: 'authenticated' }),
}));
vi.mock('@/contexts/ResumeEnhancerContext', () => ({
  useResumeEnhancer: () => ({ state: { cvData: {} }, updateCVData: vi.fn() }),
}));
vi.mock('@/lib/stores/authModalStore', () => ({
  useAuthModalStore: () => ({ openModal: vi.fn() }),
}));
vi.mock('@/components/mori', () => ({
  MoriMessageBubble: () => null,
  MoriLoadingIndicator: () => null,
  MoriSuggestionChips: () => null,
}));
vi.mock('@/components/payment/MoriChatLimitPanel', () => ({ default: () => null }));

import MoriChatInterface from './MoriChatInterface';

beforeEach(() => {
  // The component loads chat history on mount when authenticated. Stub it with a
  // promise that never settles: hermetic (jsdom has no origin for a relative URL)
  // and no post-assertion state update to warn about.
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MoriChatInterface collapsed dock', () => {
  it('shows a chevron-up control that brings the chat up', () => {
    const onRequestExpand = vi.fn();
    render(
      <MoriChatInterface
        dock={{ collapsed: true, onRequestExpand, onRequestCollapse: vi.fn() }}
      />
    );

    const bringUp = screen.getByRole('button', { name: /bring up mori chat/i });
    expect(bringUp.querySelector('.lucide-chevron-up')).toBeTruthy();

    fireEvent.click(bringUp);
    expect(onRequestExpand).toHaveBeenCalledTimes(1);
  });

  it('does not render the chevron while the chat is expanded', () => {
    render(
      <MoriChatInterface
        dock={{ collapsed: false, onRequestExpand: vi.fn(), onRequestCollapse: vi.fn() }}
      />
    );

    expect(screen.queryByRole('button', { name: /bring up mori chat/i })).toBeNull();
  });
});
