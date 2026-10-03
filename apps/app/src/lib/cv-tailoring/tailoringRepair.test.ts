import { describe, it, expect } from 'vitest';
import { repairTailoredCv } from './tailoringRepair';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * Regression guard for the "generated CV is missing information" bug.
 *
 * `tailorCVContent` used to accept the model's JSON wholesale. Anything the
 * model omitted — a section, an entry, an entry's bullets — vanished from the
 * document the user was about to submit, with no error and no trace. The most
 * visible symptom was education entries arriving with no bullet points at all.
 *
 * These tests assert the Master CV is the source of truth by construction:
 * `repairTailoredCv` must restore every omission, and must respect the
 * Normal / Standout distinction while doing it.
 */

const masterCv = {
  templateId: 'classic',
  structure: {
    sections: [
      { id: 'uuid-1', type: 'personal_header', visible: true },
      { id: 'uuid-2', type: 'work_experience', visible: true },
      { id: 'uuid-3', type: 'education', visible: true },
    ],
  },
  basics: {
    name: 'Amloh Shah',
    label: 'Frontend Engineer',
    image: '',
    email: 'amloh@example.com',
    phone: '+91 90000 00000',
    url: 'https://amloh.dev',
    summary: 'Frontend engineer with 6 years building design systems.',
    location: { address: '', postalCode: '', city: 'Ahmedabad', countryCode: 'IN', region: 'Gujarat' },
    profiles: [{ network: 'LinkedIn', username: 'amloh', url: 'https://linkedin.com/in/amloh' }],
  },
  work: [
    {
      name: 'Nexus Labs',
      position: 'Senior Frontend Engineer',
      url: '',
      startDate: '2022-03',
      endDate: 'Present',
      summary: 'Owns the shared component library.',
      highlights: [
        'Cut bundle size by 42% by replacing the legacy widget library.',
        'Shipped a component library used by 6 product teams.',
      ],
    },
    {
      name: 'Orbit Systems',
      position: 'Frontend Engineer',
      url: '',
      startDate: '2019-01',
      endDate: '2022-02',
      summary: 'Built customer-facing dashboards.',
      highlights: ['Migrated 40 screens to a typed design system.'],
    },
    {
      name: 'Byte Craft',
      position: 'Junior Developer',
      url: '',
      startDate: '2018-06',
      endDate: '2018-12',
      summary: 'Maintained internal tooling.',
      highlights: ['Automated release notes, saving 3 hours a week.'],
    },
  ],
  volunteer: [],
  education: [
    {
      institution: 'Nirma University',
      url: '',
      area: 'Computer Science',
      studyType: 'B.Tech',
      startDate: '2012',
      endDate: '2016',
      score: '8.4 CGPA',
      courses: ['Distributed Systems', 'Compiler Design', 'Human-Computer Interaction'],
      description: 'Graduated with distinction; final year project on incremental compilers.',
    },
  ],
  awards: [{ title: 'Engineer of the Year', date: '2023', awarder: 'Nexus Labs', summary: '' }],
  certificates: [
    { name: 'AWS Solutions Architect', date: '2021', issuer: 'Amazon', url: '', description: 'Associate level.' },
  ],
  publications: [],
  skills: [
    { category: 'Core skills', skills: ['React', 'TypeScript', 'Next.js'] },
    { category: 'Tooling', skills: ['Vite', 'Playwright'] },
  ],
  languages: [{ language: 'English', fluency: 'Native' }],
  interests: [{ name: 'Cycling', keywords: [] }],
  references: [],
  projects: [
    {
      name: 'Design System',
      startDate: '2022',
      endDate: '2023',
      description: 'A shared component library.',
      highlights: ['Adopted by 6 teams within a quarter.'],
      keywords: ['React', 'TypeScript'],
      url: '',
    },
  ],
} as unknown as UnifiedCVDataStructure;

/** The model returns only what it felt like returning. */
function aiOutputMissingThings() {
  return {
    basics: {
      name: 'Amloh Shah',
      label: 'Senior Frontend Engineer',
      image: '',
      // The model rewrote the contact email. It must not be allowed to.
      email: 'amloh.shah@wrong-domain.com',
      phone: '',
      url: '',
      summary: 'Senior Frontend Engineer targeting the Staff role.',
      location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
      profiles: [],
    },
    work: [
      {
        name: 'Nexus Labs',
        position: 'Senior Frontend Engineer',
        url: '',
        startDate: '2022-03',
        endDate: 'Present',
        summary: 'Owns the shared component library, now React 19 native.',
        highlights: ['Cut bundle size by 42% by replacing the legacy widget library.'],
      },
      // Orbit Systems (the middle role) dropped entirely — this is the prune
      // that opens a three-year gap and must be caught.
      {
        name: 'Byte Craft',
        position: 'Junior Developer',
        url: '',
        startDate: '2018-06',
        endDate: '2018-12',
        summary: 'Maintained internal tooling.',
        highlights: ['Automated release notes, saving 3 hours a week.'],
      },
    ],
    // `structure` dropped entirely.
    // `education`, `certificates`, `languages`, `awards`, `projects` dropped entirely.
    skills: [{ category: 'Core skills', skills: ['React', 'TypeScript'] }],
  } as any;
}

describe('repairTailoredCv — Normal mode keeps everything', () => {
  const result = repairTailoredCv(aiOutputMissingThings(), masterCv, 'standard');
  const cv = result.cvData as any;

  it('restores sections the model omitted entirely', () => {
    expect(result.restoredSections).toEqual(
      expect.arrayContaining(['education', 'certificates', 'languages', 'awards', 'projects'])
    );
    expect(cv.education).toHaveLength(1);
    expect(cv.certificates).toHaveLength(1);
    expect(cv.languages).toHaveLength(1);
  });

  it('restores the document shape so the canvas can still lay out', () => {
    expect(result.restoredShapeKeys).toContain('structure');
    expect(result.restoredShapeKeys).toContain('templateId');
    expect(cv.structure?.sections).toHaveLength(3);
    expect(cv.templateId).toBe('classic');
  });

  it('restores a work entry the model dropped', () => {
    expect(cv.work).toHaveLength(3);
    const orbit = cv.work.find((w: any) => w.name === 'Orbit Systems');
    expect(orbit).toBeTruthy();
    expect(orbit.highlights).toEqual(['Migrated 40 screens to a typed design system.']);
  });

  it('keeps every bullet on an entry the model shortened', () => {
    const nexus = cv.work.find((w: any) => w.name === 'Nexus Labs');
    expect(nexus.highlights).toHaveLength(2);
    expect(nexus.highlights).toContain('Shipped a component library used by 6 product teams.');
    // The model's own wording still wins where it produced any.
    expect(nexus.summary).toBe('Owns the shared component library, now React 19 native.');
  });

  it('restores education coursework as bullet content', () => {
    const edu = cv.education[0];
    expect(edu.courses).toEqual([
      'Distributed Systems',
      'Compiler Design',
      'Human-Computer Interaction',
    ]);
    expect(edu.description).toContain('incremental compilers');
    expect(edu.score).toBe('8.4 CGPA');
  });

  it('refuses to let the model rewrite contact facts', () => {
    expect(cv.basics.email).toBe('amloh@example.com');
    expect(cv.basics.phone).toBe('+91 90000 00000');
    expect(cv.basics.location.city).toBe('Ahmedabad');
    expect(cv.basics.profiles).toHaveLength(1);
    // …but keeps the model's tailoring of the summary and label.
    expect(cv.basics.label).toBe('Senior Frontend Engineer');
    expect(cv.basics.summary).toContain('Staff role');
  });

  it('restores a skill group whose skills all disappeared', () => {
    const core = cv.skills.find((s: any) => s.category === 'Core skills');
    expect(core.skills).toContain('Next.js');
    expect(cv.skills.find((s: any) => s.category === 'Tooling')).toBeTruthy();
  });

  it('does not duplicate a skill group that survived', () => {
    expect(cv.skills.filter((s: any) => s.category === 'Core skills')).toHaveLength(1);
  });
});

describe('repairTailoredCv — Standout mode may prune, but not blindly', () => {
  const result = repairTailoredCv(aiOutputMissingThings(), masterCv, 'standout');
  const cv = result.cvData as any;

  it('still restores credentials in full', () => {
    expect(cv.education).toHaveLength(1);
    expect(cv.education[0].courses).toHaveLength(3);
    expect(cv.certificates).toHaveLength(1);
    expect(cv.languages).toHaveLength(1);
  });

  it('still restores the document shape', () => {
    expect(result.restoredShapeKeys).toContain('structure');
    expect(cv.structure?.sections).toHaveLength(3);
  });

  it('still refuses contact-detail rewrites', () => {
    expect(cv.basics.email).toBe('amloh@example.com');
  });

  it('allows a shortened bullet list to stand', () => {
    const nexus = cv.work.find((w: any) => w.name === 'Nexus Labs');
    expect(nexus.highlights).toHaveLength(1);
  });

  it('re-closes an employment gap that pruning opened', () => {
    // Dropping Orbit Systems (ends 2022-02) leaves a gap back to Byte Craft
    // (ends 2018-12) of over three years, so Orbit must come back. Byte Craft
    // overlaps that same window and is restored too.
    const names = cv.work.map((w: any) => w.name);
    expect(names).toContain('Orbit Systems');
  });

  it('lets a skill group be pruned', () => {
    expect(cv.skills.find((s: any) => s.category === 'Tooling')).toBeUndefined();
  });
});

describe('repairTailoredCv — defensive', () => {
  it('never leaves an entry with an emptied highlights array', () => {
    const ai = aiOutputMissingThings();
    ai.work[0].highlights = [];
    const cv = repairTailoredCv(ai, masterCv, 'standout').cvData as any;
    expect(cv.work.find((w: any) => w.name === 'Nexus Labs').highlights.length).toBeGreaterThan(0);
  });

  it('treats an emptied section as a defect, not as pruning', () => {
    const ai = aiOutputMissingThings();
    ai.work = [];
    const cv = repairTailoredCv(ai, masterCv, 'standout').cvData as any;
    expect(cv.work).toHaveLength(3);
  });

  it('passes through unchanged when the model returned nothing', () => {
    const result = repairTailoredCv(null, masterCv, 'standard');
    expect(result.cvData).toBe(masterCv);
    expect(result.restoredEntries).toBe(0);
  });

  it('is additive only — it does not touch entries the model invented', () => {
    const ai = aiOutputMissingThings();
    ai.work.push({
      name: 'Invented Corp',
      position: 'Staff Engineer',
      highlights: ['Did something with no master counterpart.'],
    });
    const cv = repairTailoredCv(ai, masterCv, 'standard').cvData as any;
    const invented = cv.work.find((w: any) => w.name === 'Invented Corp');
    expect(invented.highlights).toEqual(['Did something with no master counterpart.']);
  });
});
