import { describe, it, expect } from 'vitest';
import {
  normalizeCvDataForCanvas,
  extractHighlightsFromHtml,
  extractSummaryFromHtml,
} from './cv-canvas-normalizer';

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

  /*
    Regression guard for "education is missing the bullet points" in generated
    CVs. Education entries carry structured coursework in `courses`, and the
    normalizer used to join score + description with a literal '\n' — which
    dropped `courses` entirely and produced a string the canvas collapses onto
    one line. It now uses the same rich-text builder as work/projects.
  */
  it('renders education coursework as real bullets', () => {
    const withCourses = {
      ...fullCvData,
      education: [
        {
          institution: 'Nirma University',
          studyType: 'B.Tech',
          area: 'Computer Science',
          startDate: '2012',
          endDate: '2016',
          score: '8.4 CGPA',
          description: 'Graduated with distinction.',
          courses: ['Distributed Systems', 'Compiler Design'],
        },
      ],
    };
    const normalized = normalizeCvDataForCanvas(withCourses as any) as any;
    const description = normalized.education[0].description;

    expect(description).toContain('<li');
    expect(description).toContain('Distributed Systems');
    expect(description).toContain('Compiler Design');
    expect(description).toContain('Score: 8.4 CGPA');
    expect(description).toContain('Graduated with distinction.');
    expect(description).not.toContain('\\n');
  });

  it('leaves an education entry with no coursework free of an empty list', () => {
    const normalized = normalizeCvDataForCanvas(fullCvData as any) as any;

    expect(normalized.education[0].description).not.toContain('<ul>');
  });

  it('the full document is strictly richer than the summary payload', () => {
    const full = normalizeCvDataForCanvas(fullCvData as any) as any;
    const summary = normalizeCvDataForCanvas(applySummaryProjection(fullCvData) as any) as any;

    const bullets = (d: string) => (d.match(/<li/g) || []).length;

    expect(bullets(full.experience[0].description)).toBe(2);
    expect(bullets(summary.experience[0].description)).toBe(0);
  });
});

/*
  Regression guards for the education edit round trip (fix: "education bullet
  points are messed up or not linked properly"). Three defects broke it:

  A. the adapter's canvas → Unified reverse map never wrote `courses` back, so
     the first edit permanently dropped the coursework bullets;
  B. the normalizer classified any description containing `<` as HTML, so
     plain text like "GPA < 3.5" skipped the rich-text builder and lost
     `courses`;
  C. the canvas display effect stripped <div> line breaks on every
     non-editing render, concatenating Enter-created lines (CoreUI — covered
     by reasoning, this file only exercises the pure string layer).
*/
describe('education description round trip', () => {
  const educationCv = (education: Record<string, unknown>) => ({
    ...fullCvData,
    education: [education],
  });

  it('appends coursework bullets when the description is already HTML', () => {
    const normalized = normalizeCvDataForCanvas(educationCv({
      institution: 'Nirma University',
      studyType: 'B.Tech',
      area: 'Computer Science',
      description: '<p>Graduated with distinction.</p>',
      courses: ['Distributed Systems', 'Compiler Design'],
    }) as any) as any;
    const description = normalized.education[0].description;

    // The HTML branch used to return early and drop `courses` entirely.
    expect(description).toContain('<p>Graduated with distinction.</p>');
    expect(description).toContain('<li');
    expect(description).toContain('Distributed Systems');
    expect(description).toContain('Compiler Design');
  });

  it('treats plain text containing "<" as plain text and keeps coursework', () => {
    const normalized = normalizeCvDataForCanvas(educationCv({
      institution: 'Nirma University',
      studyType: 'B.Tech',
      area: 'Computer Science',
      description: 'Graduated with GPA < 3.5 and >= 3.0.',
      courses: ['Compiler Design'],
    }) as any) as any;
    const description = normalized.education[0].description;

    expect(description).toContain('GPA < 3.5 and >= 3.0.');
    expect(description).toContain('<li');
    expect(description).toContain('Compiler Design');
  });

  it('does not duplicate coursework when the HTML already has bullets', () => {
    const normalized = normalizeCvDataForCanvas(educationCv({
      institution: 'Nirma University',
      studyType: 'B.Tech',
      area: 'Computer Science',
      description: '<p>Coursework:</p><ul><li>Distributed Systems</li></ul>',
      courses: ['Distributed Systems', 'Compiler Design'],
    }) as any) as any;
    const description = normalized.education[0].description;

    expect((description.match(/<ul/g) || []).length).toBe(1);
  });

  it('round-trips through the adapter save algorithm without drift or loss', () => {
    const source = {
      institution: 'Nirma University',
      studyType: 'B.Tech',
      area: 'Computer Science',
      score: '8.4 CGPA',
      description: 'Graduated with distinction.',
      courses: ['Distributed Systems'],
    };
    const first = normalizeCvDataForCanvas(educationCv(source) as any) as any;
    const rendered = first.education[0].description;

    // On save the adapter (CVBuilderProAdapter) rebuilds the Unified entry
    // from the rendered HTML: courses come from the <li> bullets, and the
    // score line is split back out of the summary. Mirror that algorithm
    // here — if either side drifts, the second render differs.
    const courses = extractHighlightsFromHtml(rendered);
    expect(courses).toEqual(['Distributed Systems']);

    const lines = extractSummaryFromHtml(rendered)
      .split(/\n+/)
      .map((line: string) => line.trim())
      .filter(Boolean);
    const scoreLine = lines.find((line: string) => /^score:/i.test(line)) || '';
    const remaining = lines.filter((line: string) => line !== scoreLine).join('\n');

    const second = normalizeCvDataForCanvas(educationCv({
      ...source,
      score: scoreLine.replace(/^score:\s*/i, '').trim(),
      description: remaining,
      courses,
    }) as any) as any;

    expect(second.education[0].description).toBe(rendered);
  });

  it('keeps line breaks of a multi-line description through the builder', () => {
    const normalized = normalizeCvDataForCanvas(educationCv({
      institution: 'Nirma University',
      studyType: 'B.Tech',
      area: 'Computer Science',
      description: 'First line\nSecond line',
      courses: [],
    }) as any) as any;

    expect(normalized.education[0].description).toContain('First line<br>Second line');
  });
});

describe('extractSummaryFromHtml / extractHighlightsFromHtml', () => {
  it('returns paragraphs joined by a blank line, without list content', () => {
    const summary = extractSummaryFromHtml('<p>First.</p><p>Second.</p><ul><li>Bullet</li></ul>');

    expect(summary).toBe('First.\n\nSecond.');
  });

  it('converts <div> lines to newlines instead of dropping or merging them', () => {
    // The old version dropped <div> content whenever a <p> existed, and
    // concatenated it with no separator on the fallback path.
    expect(extractSummaryFromHtml('<div>line one</div><div>line two</div>')).toBe('line one\nline two');
    expect(extractSummaryFromHtml('<p>para</p><div>line one</div>')).toBe('para\n\nline one');
  });

  it('preserves inline formatting inside paragraphs', () => {
    expect(extractSummaryFromHtml('<p>Led the <strong>design-system</strong> migration.</p>'))
      .toBe('Led the <strong>design-system</strong> migration.');
  });

  it('extracts coursework bullets from an education description', () => {
    expect(extractHighlightsFromHtml('<p>Coursework:</p><ul><li>Distributed Systems</li><li>Compiler Design</li></ul>'))
      .toEqual(['Distributed Systems', 'Compiler Design']);
  });

  it('handles empty input', () => {
    expect(extractSummaryFromHtml('')).toBe('');
    expect(extractHighlightsFromHtml('')).toEqual([]);
  });
});
