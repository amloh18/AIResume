import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * Starter content for a CV created "from blank".
 *
 * Choosing *Create from scratch* used to produce a structurally valid but
 * completely EMPTY document: every section rendered as a bare heading over
 * nothing. That is a bad first impression and a worse editor — the user cannot
 * tell what a snippet will look like, whether a section fits the template, or
 * where their text is supposed to go, because there is no text.
 *
 * So a blank CV is seeded with ONE representative entry per section. They are
 * clearly placeholder copy (generic job titles, "Company Name", a summary that
 * describes what belongs there), and they are ordinary editable/deletable
 * entries — nothing is hidden and nothing is inferred about the candidate.
 * `basics.name`/`email`/`phone` are deliberately NOT filled: they are the
 * candidate's identity, and inventing those would be worse than an empty field.
 *
 * The merge is additive-only: any array that already has content is left exactly
 * as it is, so this can never overwrite real data.
 */

const now = new Date();
const year = now.getFullYear();

const monthYear = (month: number, y: number) =>
  `${String(month).padStart(2, '0')}/${y}`;

const summaryPlaceholder =
  'Two or three lines about who you are professionally: your role, the years of experience behind it, and the kind of work you want next. Replace this with your own words.';

const STARTER = {
  work: [
    {
      id: 'starter-work-1',
      position: 'Job Title',
      name: 'Company Name',
      startDate: monthYear(1, year - 2),
      endDate: 'Present',
      summary:
        'Describe the scope of the role and what you were responsible for.',
      highlights: [
        'A result you delivered, with a number where you have one.',
        'A problem you solved and how you solved it.',
        'A collaboration or leadership example.',
      ],
    },
  ],
  education: [
    {
      id: 'starter-education-1',
      studyType: 'Degree',
      area: 'Field of study',
      institution: 'Institution Name',
      startDate: monthYear(9, year - 4),
      endDate: monthYear(6, year - 1),
      score: '',
      description: 'Relevant modules, thesis, or achievements.',
      courses: [],
    },
  ],
  projects: [
    {
      id: 'starter-project-1',
      name: 'Project Name',
      role: 'Your role',
      startDate: monthYear(3, year - 1),
      endDate: monthYear(8, year - 1),
      description:
        'What the project was, the part you owned, and the outcome. Link it if it is public.',
      highlights: [],
    },
  ],
  skills: [
    {
      category: 'Core Skills',
      skills: ['Add your first skill', 'Add another'],
      skillsText: 'Add your first skill, Add another',
      levels: [4, 3],
    },
  ],
  languages: [
    { language: 'Language', fluency: 'Fluent', level: 4 },
  ],
  interests: [{ name: 'Interest', keywords: [] }],
  certificates: [
    {
      id: 'starter-cert-1',
      name: 'Certification Name',
      issuer: 'Issuer',
      date: monthYear(5, year - 1),
      url: '',
      description: '',
    },
  ],
  awards: [
    {
      id: 'starter-award-1',
      title: 'Award Name',
      awarder: 'Awarding body',
      date: monthYear(11, year - 2),
      summary: '',
    },
  ],
  publications: [
    {
      id: 'starter-pub-1',
      name: 'Publication Title',
      publisher: 'Publisher',
      releaseDate: monthYear(4, year - 1),
      url: '',
      summary: 'One line on what it covers.',
    },
  ],
  volunteer: [
    {
      id: 'starter-volunteer-1',
      position: 'Volunteer Role',
      organization: 'Organisation',
      startDate: monthYear(2, year - 2),
      endDate: monthYear(9, year - 2),
      summary: 'What you did and who it helped.',
      highlights: [],
    },
  ],
  references: [
    {
      id: 'starter-reference-1',
      name: 'Reference Name',
      reference: 'Role at Company',
      url: '',
    },
  ],
} as const;

const isEmptyArray = (value: unknown): boolean => !Array.isArray(value) || value.length === 0;

/**
 * Fill every EMPTY section with one starter entry. Existing content is preserved
 * untouched, as are the candidate's identity fields.
 */
export function withStarterContent(
  data: UnifiedCVDataStructure | any
): UnifiedCVDataStructure {
  if (!data || typeof data !== 'object') return data;

  const next: any = JSON.parse(JSON.stringify(data));

  if (!next.basics) next.basics = {};
  if (typeof next.basics.summary !== 'string' || next.basics.summary.trim() === '') {
    next.basics.summary = summaryPlaceholder;
  }

  Object.entries(STARTER).forEach(([key, value]) => {
    if (isEmptyArray(next[key])) {
      next[key] = JSON.parse(JSON.stringify(value));
    }
  });

  return next as UnifiedCVDataStructure;
}
