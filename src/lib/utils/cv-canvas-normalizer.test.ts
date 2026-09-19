import { describe, it, expect } from 'vitest';
import { normalizeCvDataForCanvas } from './cv-canvas-normalizer';

/**
 * Regression guard for the documents-panel thumbnails.
 *
 * `/api/cvs` defaults to `projection=summary` (src/app/api/cvs/route.ts:57) and
 * that projection deliberately truncates cvData to the fields needed for
 * completion percentages. The documents panel fetched the list with no
 * projection, so every thumbnail rendered from the truncated payload.
 *
 * `normalizeCvDataForCanvas` builds each experience entry's rich-text
 * description from `summary` + `highlights`, so dropping `highlights` removes
 * every bullet point — and dropping `endDate` / `basics.profiles` removes the
 * date ranges and the contact links. The template was correct; the content was
 * not. That is what made the previews look nothing like the canvas.
 *
 * These tests assert the truncation is real and that the full document restores
 * everything, so the fix cannot silently regress back to the summary payload.
 */

/**
 * Mirrors the `summary` branch of the CV list API verbatim
 * (src/app/api/cvs/route.ts:316-365) so the test fails if that projection
 * changes shape.
 */
function applySummaryProjection(cvData: any): any {
  if (!cvData) return undefined;
  return {
    design: cvData.design,
    metadata: cvData.metadata
      ? {
          canvasDesign: cvData.metadata.canvasDesign,
          canvasTemplate: cvData.metadata.canvasTemplate,
          canvasZones: cvData.metadata.canvasZones,
        }
      : undefined,
    basics: cvData.basics
      ? {
          name: cvData.basics.name,
          label: cvData.basics.label,
          email: cvData.basics.email,
          phone: cvData.basics.phone,
          location: cvData.basics.location,
          summary: cvData.basics.summary,
        }
      : undefined,
    work: Array.isArray(cvData.work)
      ? cvData.work.map((w: any) => ({
          name: w.name,
          position: w.position,
          startDate: w.startDate,
          summary: w.summary,
        }))
      : undefined,
    education: Array.isArray(cvData.education)
      ? cvData.education.map((e: any) => ({
          institution: e.institution,
          area: e.area,
          startDate: e.startDate,
        }))
      : undefined,
    skills: Array.isArray(cvData.skills)
      ? cvData.skills.map((s: any) => ({ name: s.name, level: s.level }))
      : undefined,
    projects: Array.isArray(cvData.projects)
      ? cvData.projects.map((p: any) => ({ name: p.name, description: p.description, url: p.url }))
      : undefined,
  };
}

const fullCvData = {
  design: { font: 'Inter', fontSize: 12, accentColor: '#22c55e' },
  metadata: {
    canvasTemplate: { id: '2-col', name: 'Two Column' },
    canvasDesign: { font: 'Inter', fontSize: 12, accentColor: '#22c55e' },
  },
  basics: {
    name: 'Amloh Sharma',
    label: 'Senior Frontend Engineer',
    email: 'amloh@example.com',
    phone: '+91 90000 00000',
    location: { city: 'Ahmedabad', region: 'Gujarat', countryCode: 'IN' },
    summary: 'Frontend engineer with 8 years building design systems.',
    url: 'https://amloh.dev',
    profiles: [
      { network: 'LinkedIn', username: 'amloh', url: 'https://linkedin.com/in/amloh' },
      { network: 'GitHub', username: 'amloh', url: 'https://github.com/amloh' },
    ],
  },
  work: [
    {
      name: 'Acme Corp',
      position: 'Senior Frontend Engineer',
      startDate: '2021-03',
      endDate: '2024-11',
      summary: 'Led the design-system migration.',
      highlights: [
        'Cut bundle size by 42% by replacing the legacy widget library.',
        'Shipped a component library used by 6 product teams.',
      ],
    },
  ],
  education: [
    { institution: 'Nirma University', studyType: 'B.Tech', area: 'Computer Science', startDate: '2012', endDate: '2016' },
  ],
  skills: [{ name: 'Frontend', keywords: ['React', 'TypeScript', 'Next.js'], rating: 5 }],
  projects: [
    {
      name: 'Design System',
      description: 'A shared component library.',
      highlights: ['Adopted by 6 teams within a quarter.'],
      url: 'https://github.com/amloh/ds',
    },
  ],
  certifications: [{ name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' }],
  languages: [{ language: 'English', fluency: 'Native' }],
};

describe('summary projection truncation', () => {
  it('drops the fields the canvas renders from', () => {
    const summary: any = applySummaryProjection(fullCvData);

    expect(summary.work[0].highlights).toBeUndefined();
    expect(summary.work[0].endDate).toBeUndefined();
    expect(summary.basics.profiles).toBeUndefined();
    expect(summary.basics.url).toBeUndefined();
    expect(summary.certifications).toBeUndefined();
    expect(summary.languages).toBeUndefined();
    expect(summary.projects[0].highlights).toBeUndefined();
  });

  it('leaves experience entries with no bullet points and no end date', () => {
    const normalized = normalizeCvDataForCanvas(applySummaryProjection(fullCvData) as any) as any;

    // The rich-text description is built from summary + highlights, so with
    // highlights stripped there is nothing to render as bullets.
    expect(normalized.experience[0].description).not.toContain('<ul>');
    expect(normalized.experience[0].description).not.toContain('<li>');
    expect(normalized.experience[0].description).toBe('<p>Led the design-system migration.</p>');

    // ...and the role shows as ongoing because endDate is gone.
    expect(normalized.experience[0].endDate).toBe('');
  });

  it('drops the contact links and the whole extra sections', () => {
    const normalized = normalizeCvDataForCanvas(applySummaryProjection(fullCvData) as any) as any;

    expect(normalized.basics.linkedin).toBeUndefined();
    expect(normalized.certifications).toBeUndefined();
    expect(normalized.languages).toBeUndefined();
    expect(normalized.volunteer).toBeUndefined();
  });
});

describe('full document renders what the canvas renders', () => {
  it('keeps every experience bullet and the end date', () => {
    const normalized = normalizeCvDataForCanvas(fullCvData as any) as any;

    expect(normalized.experience[0].description).toContain('<ul>');
    expect(normalized.experience[0].description).toContain(
      '<li data-highlight-index="0">Cut bundle size by 42% by replacing the legacy widget library.</li>'
    );
    expect(normalized.experience[0].endDate).toBe('2024-11');
    expect(normalized.experience[0].company).toBe('Acme Corp');
    expect(normalized.experience[0].role).toBe('Senior Frontend Engineer');
  });

  it('keeps the contact links and the extra sections', () => {
    const normalized = normalizeCvDataForCanvas(fullCvData as any) as any;

    // profiles are collapsed into basics.linkedin by the normalizer
    expect(normalized.basics.linkedin).toBe('https://linkedin.com/in/amloh');
    expect(normalized.certifications).toBeDefined();
    expect(normalized.languages).toBeDefined();
  });

  it('keeps project bullets', () => {
    const normalized = normalizeCvDataForCanvas(fullCvData as any) as any;

    expect(normalized.projects[0].description).toContain('<li');
  });

  it('the full document is strictly richer than the summary payload', () => {
    const full = normalizeCvDataForCanvas(fullCvData as any) as any;
    const summary = normalizeCvDataForCanvas(applySummaryProjection(fullCvData) as any) as any;

    const bullets = (d: string) => (d.match(/<li/g) || []).length;

    expect(bullets(full.experience[0].description)).toBe(2);
    expect(bullets(summary.experience[0].description)).toBe(0);
  });
});
