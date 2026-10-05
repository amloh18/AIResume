import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import React from 'react';

const authenticatedFetch = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));
vi.mock('@/lib/utils/apiUtils', () => ({ authenticatedFetch: (...args: any[]) => authenticatedFetch(...args) }));
vi.mock('@/components/ui/CompanyLogo', () => ({ default: () => null }));

import NeedsAttentionWidget from './NeedsAttentionWidget';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const attentionJob = {
  _id: 'job-1',
  jobTitle: 'Senior Designer',
  company: 'Acme',
  internalStatus: 'review_required',
  reviewReason: 'Needs approval before submit',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('NeedsAttentionWidget', () => {
  it('renders nothing when no items need attention', async () => {
    authenticatedFetch.mockResolvedValue({ ok: true, json: async () => ({ jobs: [] }) });
    const { container } = render(<NeedsAttentionWidget limit={3} />);
    await act(async () => {});
    // Empty list renders nothing at all — no empty card, no loading skeleton.
    expect(container.querySelector('section')).toBeNull();
    expect(screen.queryByText('Needs Attention')).toBeNull();
  });

  it('uses the shared dashboard card chrome instead of the amber gradient', async () => {
    authenticatedFetch.mockResolvedValue({ ok: true, json: async () => ({ jobs: [attentionJob] }) });
    render(<NeedsAttentionWidget limit={3} />);

    const section = (await screen.findByText('Needs Attention')).closest('section') as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.className).toContain('bg-[var(--bg-secondary)]');
    expect(section.className).toContain('border-[var(--border-primary)]');
    expect(section.className).toContain('rounded-xl');
    // No more amber gradient container.
    expect(section.className).not.toContain('bg-gradient-to-br');

    const header = section.querySelector('header') as HTMLElement;
    expect(header.className).toContain('border-[var(--border-primary)]');
    expect(header.querySelector('h2.dashboard-panel-title')).toBeTruthy();

    // Items sit on the neutral card surface; colour lives in the type icon.
    const item = screen.getByText('Senior Designer').closest('div[class*="rounded-lg"]') as HTMLElement;
    expect(item.className).toContain('bg-[var(--bg-tertiary)]');
    expect(item.className).toContain('border-[var(--border-primary)]');
  });
});
