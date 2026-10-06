import { describe, expect, it } from 'vitest';
import { CentralScoreManager, type TemplateAtsContext } from './CentralScoreManager';
import { ATS_SAFETY_CAPS } from '@/lib/templates/template-utils';

/**
 * Invariants for the template-aware ATS score.
 *
 * The point of these tests is that a template's layout is an INPUT to the score,
 * not decoration: a sidebar CV with identical content must not be able to
 * out-score a single-column CV, and must never exceed the template's ceiling.
 */

const cvFixture: any = {
  basics: {
    name: 'Ada Lovelace',
    label: 'Senior Software Engineer',
    email: 'ada@example.com',
    phone: '+44 20 7946 0958',
    url: 'https://ada.example.com',
    summary:
      'Senior software engineer with eight years building distributed systems, ' +
      'leading platform teams, and shipping reliable services at scale.',
    profiles: [{ network: 'LinkedIn', url: 'https://linkedin.com/in/ada' }],
  },
  work: [
    {
      name: 'Analytical Engines Ltd',
      position: 'Senior Software Engineer',
      startDate: '2021-03',
      endDate: 'Present',
      summary: 'Own the platform reliability roadmap for a payments product.',
      highlights: [
        'Reduced API response time by 38% by introducing a read-through cache layer.',
        'Led a team of five engineers through a zero-downtime database migration.',
        'Built observability tooling that cut mean time to detection by 45%.',
      ],
    },
    {
      name: 'Difference Machines',
      position: 'Software Engineer',
      startDate: '2018-01',
      endDate: '2021-02',
      summary: 'Built internal services and reporting pipelines.',
      highlights: [
        'Shipped a reporting service handling 2M requests per day.',
        'Introduced automated regression tests, reducing escaped defects by 60%.',
      ],
    },
  ],
  education: [
    {
      institution: 'University of London',
      area: 'Computer Science',
      studyType: 'BSc',
      startDate: '2013-09',
      endDate: '2016-06',
    },
  ],
  skills: [
    { category: 'Languages', skills: ['TypeScript', 'Python', 'Go'] },
    { category: 'Platform', skills: ['Kubernetes', 'PostgreSQL', 'Redis'] },
  ],
  projects: [
    {
      name: 'Open telemetry bridge',
      description: 'A small open-source bridge that normalises trace exports.',
      highlights: ['Adopted by 400 repositories'],
    },
  ],
  certificates: [{ name: 'Certified Kubernetes Administrator' }],
};

const keywordAnalysis: any = {
  matchScore: 82,
  gaps: [{ keyword: 'rust' }],
  matchedKeywords: ['typescript', 'kubernetes', 'postgresql'],
  stats: { totalJDKeywords: 12, matchedCount: 10, missingCount: 2 },
};

const safeContext: TemplateAtsContext = {
  layoutType: 'single-column',
  safety: 'safe',
  cap: ATS_SAFETY_CAPS.safe,
};

const cautionContext: TemplateAtsContext = {
  layoutType: 'unknown',
  safety: 'caution',
  cap: ATS_SAFETY_CAPS.caution,
};

const riskyContext: TemplateAtsContext = {
  layoutType: 'sidebar-left',
  safety: 'risky',
  cap: ATS_SAFETY_CAPS.risky,
};

function score(context: TemplateAtsContext, cap?: number) {
  return CentralScoreManager.getInstance().calculateATSScore(
    cvFixture,
    keywordAnalysis,
    cap ?? context.cap,
    context
  );
}

describe('CentralScoreManager template-aware ATS scoring', () => {
  it('scores a single-column CV at least as high as a sidebar CV', () => {
    const safe = score(safeContext);
    const risky = score(riskyContext);
    expect(safe.total).toBeGreaterThanOrEqual(risky.total);
  });

  it('never lets a risky template exceed its ceiling', () => {
    const risky = score(riskyContext);
    expect(risky.total).toBeLessThanOrEqual(ATS_SAFETY_CAPS.risky);
    expect(risky.atsScoreCap).toBe(ATS_SAFETY_CAPS.risky);
  });

  it('never lets a caution template exceed its ceiling', () => {
    const caution = score(cautionContext);
    expect(caution.total).toBeLessThanOrEqual(ATS_SAFETY_CAPS.caution);
  });

  it('applies a lower parsability multiplier for a multi-column layout', () => {
    const safe = score(safeContext);
    const risky = score(riskyContext);
    expect(risky.parsabilityMultiplier).toBeLessThan(safe.parsabilityMultiplier);
  });

  it('applies a formatting penalty for a multi-column layout', () => {
    const safe = score(safeContext);
    const risky = score(riskyContext);
    expect(risky.formatting).toBeLessThan(safe.formatting);
    expect(risky.templatePenalty).toBeGreaterThan(0);
  });

  it('honours the tighter of the caller cap and the template cap', () => {
    const withLowerCallerCap = score(riskyContext, 50);
    expect(withLowerCallerCap.atsScoreCap).toBe(50);
    expect(withLowerCallerCap.total).toBeLessThanOrEqual(50);
  });

  it('exposes the template context on the breakdown for auditability', () => {
    const risky = score(riskyContext);
    expect(risky.templateSafety).toBe('risky');
    expect(risky.templateLayout).toBe('sidebar-left');
  });

  it('a full score is achievable on a safe template with a perfect keyword match', () => {
    const perfect = CentralScoreManager.getInstance().calculateATSScore(
      cvFixture,
      { ...keywordAnalysis, stats: { totalJDKeywords: 12, matchedCount: 12, missingCount: 0 } },
      ATS_SAFETY_CAPS.safe,
      safeContext
    );
    // Sanity check: the ceiling is a cap, not a floor — a strong CV still scores well.
    expect(perfect.total).toBeGreaterThan(70);
    expect(perfect.total).toBeLessThanOrEqual(100);
  });

  it('is deterministic for identical inputs', () => {
    const a = score(safeContext);
    const b = score(safeContext);
    expect(a.total).toBe(b.total);
    expect(a.rawTotal).toBe(b.rawTotal);
  });

  it('treats a missing template context as single-column without a penalty', () => {
    const noContext = CentralScoreManager.getInstance().calculateATSScore(
      cvFixture,
      keywordAnalysis,
      100
    );
    const safe = score(safeContext);
    expect(noContext.total).toBe(safe.total);
  });
});
