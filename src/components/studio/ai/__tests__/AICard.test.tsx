import React from 'react';
import { render, screen } from '@testing-library/react';
import AICard from '../AICard';
import { Target } from 'lucide-react';

// Mock the mock layout components
jest.mock('../MockLayouts', () => ({
  ATSMockLayout: () => <div data-testid="ats-mock">ATS Mock Layout</div>,
  ContentOptimizerMockLayout: () => <div data-testid="content-optimizer-mock">Content Optimizer Mock</div>,
  QuantificationMockLayout: () => <div data-testid="quantification-mock">Quantification Mock</div>,
  SkillsMapperMockLayout: () => <div data-testid="skills-mapper-mock">Skills Mapper Mock</div>,
  GapAnalyzerMockLayout: () => <div data-testid="gap-analyzer-mock">Gap Analyzer Mock</div>,
  AchievementGeneratorMockLayout: () => <div data-testid="achievement-generator-mock">Achievement Generator Mock</div>,
  ConsistencyCheckerMockLayout: () => <div data-testid="consistency-checker-mock">Consistency Checker Mock</div>,
  SummaryBuilderMockLayout: () => <div data-testid="summary-builder-mock">Summary Builder Mock</div>,
  CoverLetterMockLayout: () => <div data-testid="cover-letter-mock">Cover Letter Mock</div>,
}));

describe('AICard', () => {
  const defaultProps = {
    sectionId: 'content-optimizer',
    title: 'Content Optimizer',
    description: 'AI-powered content optimization',
    icon: Target,
    onGenerate: jest.fn(),
  };

  it('renders skeleton layout when loading', () => {
    render(
      <AICard
        {...defaultProps}
        isLoading={true}
        hasData={false}
        hasJob={false}
      />
    );

    expect(screen.getByTestId('skeleton-layout')).toBeInTheDocument();
  });

  it('renders mock layout when no job and requires job', () => {
    render(
      <AICard
        {...defaultProps}
        isLoading={false}
        hasData={false}
        hasJob={false}
        requiresJob={true}
      />
    );

    expect(screen.getByTestId('content-optimizer-mock')).toBeInTheDocument();
    expect(screen.getByText('Requires Job')).toBeInTheDocument();
  });

  it('renders real data when has data and job', () => {
    render(
      <AICard
        {...defaultProps}
        isLoading={false}
        hasData={true}
        hasJob={true}
        requiresJob={true}
      >
        <div data-testid="real-content">Real AI Suggestions</div>
      </AICard>
    );

    expect(screen.getByTestId('real-content')).toBeInTheDocument();
    expect(screen.queryByTestId('content-optimizer-mock')).not.toBeInTheDocument();
  });

  it('renders empty state when no data and no job required', () => {
    render(
      <AICard
        {...defaultProps}
        isLoading={false}
        hasData={false}
        hasJob={false}
        requiresJob={false}
      />
    );

    expect(screen.getByText('Click Generate to get AI suggestions')).toBeInTheDocument();
  });

  it('shows disabled generate button when mock state', () => {
    render(
      <AICard
        {...defaultProps}
        isLoading={false}
        hasData={false}
        hasJob={false}
        requiresJob={true}
      />
    );

    const generateButton = screen.getByText('Generate');
    expect(generateButton).toBeDisabled();
    expect(generateButton).toHaveAttribute('title', 'Select a job to generate tailored suggestions');
  });

  it('shows enabled generate button when empty state', () => {
    render(
      <AICard
        {...defaultProps}
        isLoading={false}
        hasData={false}
        hasJob={false}
        requiresJob={false}
      />
    );

    const generateButton = screen.getByText('Generate');
    expect(generateButton).not.toBeDisabled();
  });

  it('shows refresh button when has real data', () => {
    render(
      <AICard
        {...defaultProps}
        isLoading={false}
        hasData={true}
        hasJob={true}
        requiresJob={true}
      >
        <div>Real content</div>
      </AICard>
    );

    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('renders ATS mock layout for ats-score section', () => {
    render(
      <AICard
        {...defaultProps}
        sectionId="ats-score"
        isLoading={false}
        hasData={false}
        hasJob={false}
        requiresJob={false}
        atsScore={75}
        atsKeywords={['JavaScript', 'React']}
      />
    );

    expect(screen.getByTestId('ats-mock')).toBeInTheDocument();
  });
});
