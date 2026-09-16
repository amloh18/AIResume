import { describe, expect, it } from 'vitest';
import {
  buildCoverLetterTailoringPrompt,
  buildCvTailoringPrompt,
  extractAtsKeywords,
  parseCvTailoringMode,
  applyDeterministicAtsPass,
} from './tailoringMode';

describe('parseCvTailoringMode', () => {
  it('accepts canonical values', () => {
    expect(parseCvTailoringMode('standard')).toBe('standard');
    expect(parseCvTailoringMode('standout')).toBe('standout');
  });

  it('maps legacy aliases', () => {
    expect(parseCvTailoringMode('normal')).toBe('standard');
    expect(parseCvTailoringMode('aggressive')).toBe('standout');
    expect(parseCvTailoringMode('better')).toBe('standout');
  });

  it('defaults unknown values to standard', () => {
    expect(parseCvTailoringMode(undefined)).toBe('standard');
    expect(parseCvTailoringMode('wild')).toBe('standard');
  });
});

describe('extractAtsKeywords', () => {
  it('finds known phrases and repeated tokens from a JD', () => {
    const keywords = extractAtsKeywords(
      'We need a React engineer with TypeScript, GraphQL, and strong React component experience. TypeScript is required.'
    );
    expect(keywords).toContain('react');
    expect(keywords).toContain('graphql');
    expect(keywords).toContain('typescript');
  });

  it('returns empty for blank input', () => {
    expect(extractAtsKeywords('')).toEqual([]);
  });

  it('ranks a frequently repeated JD term above a one-off known phrase', () => {
    const jd = [
      'Kubernetes Kubernetes Kubernetes Kubernetes Kubernetes Kubernetes',
      'Kubernetes Kubernetes Kubernetes Kubernetes Kubernetes Kubernetes',
      'salesforce',
    ].join(' ');

    const keywords = extractAtsKeywords(jd);

    expect(keywords.indexOf('kubernetes')).toBeLessThan(keywords.indexOf('salesforce'));
  });

  it('is deterministic for equal scores', () => {
    const jd = 'Terraform Ansible';
    expect(extractAtsKeywords(jd)).toEqual(extractAtsKeywords(jd));
  });

  it('respects the limit', () => {
    const jd = Array.from({ length: 60 }, (_, i) => `capability${i}`).join(' ');
    expect(extractAtsKeywords(jd, 10)).toHaveLength(10);
  });
});

describe('tailoring prompts', () => {
  it('marks ATS Match as conservative', () => {
    const prompt = buildCvTailoringPrompt({
      mode: 'standard',
      cvData: { basics: { name: 'Ada' } },
      jobTitle: 'Engineer',
      company: 'Acme',
      jobDescription: 'Build React apps',
      atsKeywords: ['react'],
    });
    expect(prompt).toContain('NORMAL MODE RULES');
    expect(prompt).toContain('Do not change job titles except spelling');
    expect(prompt).toContain('react');
  });

  it('marks Standout as role-retitling and gap-filling', () => {
    const prompt = buildCvTailoringPrompt({
      mode: 'standout',
      cvData: { basics: { name: 'Ada' } },
      jobTitle: 'Customer Success Manager',
      company: 'Acme',
      jobDescription: 'Own enterprise accounts',
      atsKeywords: ['salesforce'],
    });
    expect(prompt).toContain('STANDOUT RULES');
    expect(prompt).toContain('retitle roles');
  });

  it('omits the refinement seed block when there is no seed', () => {
    const prompt = buildCvTailoringPrompt({
      mode: 'standard',
      cvData: { basics: { name: 'Ada' } },
      jobTitle: 'Engineer',
      company: 'Acme',
      jobDescription: 'Build React apps',
      atsKeywords: ['react'],
    });
    expect(prompt).not.toContain('REFINEMENT SEED');
  });

  it('adds a refinement seed block as a target list, not as copyable text', () => {
    const prompt = buildCvTailoringPrompt({
      mode: 'standard',
      cvData: { basics: { name: 'Ada' } },
      jobTitle: 'Engineer',
      company: 'Acme',
      jobDescription: 'Build React apps',
      atsKeywords: ['react', 'graphql'],
      refinementSeed: {
        seedCVTitle: 'Acme_Frontend | CV',
        confidence: 0.72,
        alreadyEvidencedKeywords: ['react'],
        stillMissingKeywords: ['graphql'],
        notes: ['Role titles differ substantially; re-anchor the headline.'],
      },
    });

    expect(prompt).toContain('REFINEMENT SEED');
    expect(prompt).toContain('TARGET LIST');
    expect(prompt).toContain('Do NOT copy sentences');
    expect(prompt).toContain('react');
    expect(prompt).toContain('graphql');
    expect(prompt).toContain('re-anchor the headline');
  });

  it('includes mode in cover letter prompt', () => {
    const standout = buildCoverLetterTailoringPrompt({
      mode: 'standout',
      jobTitle: 'PM',
      company: 'Acme',
      experience: 'Led a squad',
      jobDescription: 'Ship products',
      atsKeywords: ['roadmap'],
    });
    expect(standout).toContain('STANDOUT');
    expect(standout).toContain('roadmap');
  });
});

describe('applyDeterministicAtsPass', () => {
  const run = (
    cvData: unknown,
    jobTitle: string,
    atsKeywords: string[],
    mode: 'standard' | 'standout' = 'standard'
  ) => applyDeterministicAtsPass(cvData, { mode, jobTitle, atsKeywords });

  it('adds evidenced JD keywords to skills and prefixes the job title in the summary', () => {
    const { cvData, pinnedKeywords } = run(
      {
        basics: { summary: 'Engineer who ships products.' },
        skills: [{ category: 'Core', skills: ['TypeScript'] }],
        work: [{ highlights: ['Built GraphQL APIs in React'] }],
      },
      'Frontend Engineer',
      ['graphql', 'react', 'kubernetes']
    );

    const result = cvData as {
      basics: { summary: string };
      skills: Array<{ skills: string[] }>;
    };

    expect(result.basics.summary.startsWith('Frontend Engineer')).toBe(true);
    const skills = result.skills[0].skills.map((s) => s.toLowerCase());
    expect(skills).toContain('graphql');
    expect(skills).toContain('react');
    expect(skills).not.toContain('kubernetes');
    expect(pinnedKeywords.sort()).toEqual(['graphql', 'react']);
  });

  it('does NOT treat the skills list as evidence for itself', () => {
    // 'kubernetes' is already listed as a skill, but no work/project proves it.
    // The old implementation stringified the whole document, so the skills entry
    // counted as its own evidence — a self-certifying loop.
    const { cvData, skippedKeywords } = run(
      {
        basics: { summary: 'Engineer.' },
        skills: [{ category: 'Core', skills: ['Kubernetes'] }],
        work: [{ highlights: ['Built REST services'] }],
      },
      'Platform Engineer',
      ['kubernetes']
    );

    const result = cvData as { skills: Array<{ skills: string[] }> };
    // Not duplicated into the pinned list, and reported as unevidenced.
    expect(result.skills[0].skills.filter((s) => s.toLowerCase() === 'kubernetes')).toHaveLength(1);
    expect(skippedKeywords).toContain('kubernetes');
  });

  it('does NOT treat the summary as evidence', () => {
    // The summary is written by the same generation pass, so allowing it to
    // self-certify would make the pass meaningless.
    const { cvData, skippedKeywords } = run(
      {
        basics: { summary: 'Expert in Kubernetes and Terraform.' },
        skills: [{ category: 'Core', skills: ['TypeScript'] }],
        work: [{ highlights: ['Built REST services'] }],
      },
      'Platform Engineer',
      ['kubernetes', 'terraform']
    );

    const result = cvData as { skills: Array<{ skills: string[] }> };
    const skills = result.skills[0].skills.map((s) => s.toLowerCase());
    expect(skills).not.toContain('terraform');
    expect(skippedKeywords).toEqual(expect.arrayContaining(['kubernetes', 'terraform']));
  });

  it('respects word boundaries for single-token keywords', () => {
    const { skippedKeywords } = run(
      {
        basics: { summary: 'Engineer.' },
        skills: [{ category: 'Core', skills: [] }],
        // 'JavaScript' must not satisfy the 'Java' keyword.
        work: [{ highlights: ['Wrote modern JavaScript'] }],
      },
      'Backend Engineer',
      ['java']
    );

    expect(skippedKeywords).toContain('java');
  });

  it('matches multi-word keywords as phrases', () => {
    const { pinnedKeywords } = run(
      {
        basics: { summary: 'Engineer.' },
        skills: [{ category: 'Core', skills: [] }],
        work: [{ highlights: ['Led machine learning platform work'] }],
      },
      'ML Engineer',
      ['machine learning']
    );

    expect(pinnedKeywords).toContain('machine learning');
  });

  it('never invents a keyword when there is no evidence at all', () => {
    const { cvData, pinnedKeywords, skippedKeywords } = run(
      {
        basics: { summary: 'Engineer.' },
        skills: [{ category: 'Core', skills: [] }],
        work: [{ highlights: ['Managed a support desk'] }],
      },
      'Data Engineer',
      ['spark', 'airflow', 'kafka']
    );

    const result = cvData as { skills: Array<{ skills: string[] }> };
    expect(pinnedKeywords).toEqual([]);
    expect(result.skills[0].skills).toEqual([]);
    expect(skippedKeywords).toEqual(['spark', 'airflow', 'kafka']);
  });

  it('returns the input untouched for non-objects', () => {
    expect(run(null, 'Engineer', ['react']).cvData).toBeNull();
    expect(run(undefined, 'Engineer', ['react']).pinnedKeywords).toEqual([]);
  });

  it('creates a skills section when the CV has none', () => {
    const { cvData } = run(
      {
        basics: { summary: 'Engineer.' },
        work: [{ highlights: ['Shipped React and GraphQL services'] }],
      },
      'Frontend Engineer',
      ['react']
    );

    const result = cvData as { skills: Array<{ category: string; skills: string[] }> };
    expect(result.skills[0].category).toBe('Core skills');
    expect(result.skills[0].skills.map((s) => s.toLowerCase())).toContain('react');
  });

  it('pins fewer keywords in standard mode than in standout mode', () => {
    const keywords = Array.from({ length: 20 }, (_, i) => `capability${i}`);
    const evidence = keywords.map((k) => `Used ${k} in production`).join('. ');

    const base = {
      basics: { summary: 'Engineer.' },
      skills: [{ category: 'Core', skills: [] as string[] }],
      work: [{ highlights: [evidence] }],
    };

    const standard = run(base, 'Engineer', keywords, 'standard');
    const standout = run(base, 'Engineer', keywords, 'standout');

    expect(standard.pinnedKeywords.length).toBe(8);
    expect(standout.pinnedKeywords.length).toBe(14);
  });
});
