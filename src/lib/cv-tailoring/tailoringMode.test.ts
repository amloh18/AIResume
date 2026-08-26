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
  it('adds evidenced JD keywords to skills and prefixes the job title in the summary', () => {
    const result = applyDeterministicAtsPass(
      {
        basics: { summary: 'Engineer who ships products.' },
        skills: [{ category: 'Core', skills: ['TypeScript'] }],
        work: [{ highlights: ['Built GraphQL APIs in React'] }],
      },
      {
        mode: 'standard',
        jobTitle: 'Frontend Engineer',
        atsKeywords: ['graphql', 'react', 'kubernetes'],
      }
    ) as { basics: { summary: string }; skills: Array<{ skills: string[] }> };

    expect(result.basics.summary.startsWith('Frontend Engineer')).toBe(true);
    const skills = result.skills[0].skills.map((s) => s.toLowerCase());
    expect(skills).toContain('graphql');
    expect(skills).toContain('react');
    expect(skills).not.toContain('kubernetes');
  });
});
