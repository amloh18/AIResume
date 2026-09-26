// @ts-nocheck pre-existing type escape — this suite only exercises rendering
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import React from 'react';
import RecentAppliedJobsHeader from './RecentAppliedJobsHeader';
import { DashboardDataContext } from '@/contexts/DashboardDataContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/components/ui/CompanyLogo', () => ({
  __esModule: true,
  default: ({ company }: { company: string }) => <div data-testid="company-logo">{company}</div>,
}));

const STORAGE_KEY = 'cvcircle_recent_applied_jobs_v1';

const renderWithJobs = (jobs: unknown[]) =>
  render(
    <DashboardDataContext.Provider value={{ jobs } as any}>
      <RecentAppliedJobsHeader />
    </DashboardDataContext.Provider>
  );

describe('RecentAppliedJobsHeader', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when there are no applied jobs', () => {
    const { container } = renderWithJobs([{ _id: 'j1', status: 'created', company: 'Acme' }]);
    expect(container.firstChild).toBeNull();
  });

  it('seeds icons from applied jobs in the dashboard context', async () => {
    renderWithJobs([
      { _id: 'j1', status: 'applied', company: 'Stripe', jobTitle: 'SWE' },
      { _id: 'j2', currentStage: 'applied', company: 'Databricks', jobTitle: 'MLE' },
      { _id: 'j3', status: 'created', company: 'IgnoredCorp' },
    ]);

    expect(await screen.findByLabelText('Applied to Stripe')).toBeTruthy();
    expect(screen.getByLabelText('Applied to Databricks')).toBeTruthy();
    // Non-applied rows must not appear.
    expect(screen.queryByLabelText('Applied to IgnoredCorp')).toBeNull();

    // Seeded icons are persisted so the next page load restores them.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored).toHaveLength(2);
  });

  it('restores fresh icons from localStorage without waiting on the context', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'x-1', jobId: 'x', company: 'Figma', jobTitle: 'Designer', appliedAt: Date.now() },
      ])
    );
    renderWithJobs([]); // context still empty — storage path must still show
    expect(await screen.findByLabelText('Applied to Figma')).toBeTruthy();
  });

  it('drops icons older than 10 minutes instead of showing stale ones', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'x-1',
          jobId: 'x',
          company: 'Figma',
          jobTitle: 'Designer',
          appliedAt: Date.now() - 11 * 60 * 1000,
        },
      ])
    );
    const { container } = renderWithJobs([]);
    expect(container.firstChild).toBeNull();
  });
});
