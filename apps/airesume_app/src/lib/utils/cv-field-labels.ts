/**
 * Placeholder labels for EMPTY fields on the CV canvas.
 *
 * An empty inline field used to announce itself as "Type here...", which tells
 * the writer nothing about what belongs in the slot — the one moment the label
 * could be useful is the one moment it was generic. The label is derived from
 * the field's path instead, so the dashed slot reads as a named blank:
 *
 *   experience.2.company   → "Company/Organisation"
 *   education.0.degree     → "Degree"
 *   projects.1.description → "Project summary or achievements"
 *   experience.0.endDate   → "End"
 *
 * Paths arrive in two shapes because the canvas and the Unified CV disagree on
 * names: the canvas writes `experience.2.company`, the Unified document writes
 * `work.2.name`. Both are normalised here (SECTION_ALIASES) so one rule covers
 * every snippet, template and Mori edit that touches the same fact.
 *
 * Deliberate: this function NEVER returns "Type here..." / "No text". The last
 * resort is a prettified version of the last path segment, so an unlisted field
 * still names itself ("End date", "Study type", …).
 *
 * Pure and dependency-free on purpose — `tests/verify-field-placeholders.ts`
 * exercises it directly.
 */

/** Section names that mean the same collection. Canvas name → one canonical. */
const SECTION_ALIASES: Record<string, string> = {
  experience: 'work',
  employment: 'work',
  work: 'work',
  certificates: 'certifications',
  certifications: 'certifications',
  courses: 'education',
  education: 'education',
  projects: 'projects',
  project: 'projects',
  awards: 'awards',
  publications: 'publications',
  volunteer: 'volunteer',
  references: 'references',
  skills: 'skills',
  languages: 'languages',
  interests: 'interests',
  basics: 'basics',
  profile: 'basics',
  custom: 'custom',
};

/** Date-ish fields get the shortest true label — a slot needs the pair back. */
const START_FIELD = /^(start|startdate|datefrom|from|begindate|commencedate)$/;
const END_FIELD = /^(end|enddate|dateto|to|completiondate|endYear)$/;

type LabelRule = {
  /** Canonical section(s) the rule is limited to. Omitted ⇒ any section. */
  section?: string | string[];
  field: RegExp;
  label: string;
};

/**
 * Ordered rules — the first match wins, so section-specific rules come before
 * the section-agnostic ones and before the prettified fallback.
 */
const LABELS: LabelRule[] = [
  // ── Header / contact ────────────────────────────────────────────────────
  { section: 'basics', field: /^name$/, label: 'Full name' },
  { section: 'basics', field: /^(title|label|headline)$/, label: 'Professional title' },
  { section: 'basics', field: /^email/, label: 'Email' },
  { section: 'basics', field: /^phone/, label: 'Phone' },
  { section: 'basics', field: /^(location|address|city|country|region)$/, label: 'Location' },
  { section: 'basics', field: /^(website|url|link|portfolio)$/, label: 'Website / Link' },
  { section: 'basics', field: /^linkedin$/, label: 'LinkedIn' },
  { section: 'basics', field: /^(github|gitlab)$/, label: 'GitHub' },
  { section: 'basics', field: /^(summary|about|profile)$/, label: 'Professional summary' },
  { section: 'basics', field: /^picture$/, label: 'Photo' },

  // ── Named profiles (basics.profiles.N.*) ────────────────────────────────
  { field: /^(username|handle)$/, label: 'Username' },
  { field: /^network$/, label: 'Platform' },
  { field: /^(url|link)$/, label: 'Profile link' },

  // ── Work experience ─────────────────────────────────────────────────────
  { section: 'work', field: /^(role|position|jobtitle|title)$/, label: 'Role/Designation' },
  { section: 'work', field: /^(company|name|employer|organization|organisation|workplace)$/, label: 'Company/Organisation' },
  { section: 'work', field: /^(description|summary)$/, label: 'Work summary or achievements' },
  { section: 'work', field: /^(highlights|achievements)$/, label: 'Achievement' },
  { section: 'work', field: /^(location|city|country)$/, label: 'Location' },
  { section: 'work', field: /^(employmenttype|type)$/, label: 'Employment type' },

  // ── Education ───────────────────────────────────────────────────────────
  { section: 'education', field: /^(degree|studytype|qualification|programme|program)$/, label: 'Degree' },
  { section: 'education', field: /^(institution|school|university|organization|organisation|name)$/, label: 'Institution' },
  { section: 'education', field: /^(area|field|major|subject)$/, label: 'Field of study' },
  { section: 'education', field: /^(description|summary|modules|subjects)$/, label: 'Modules summary or achievements' },
  { section: 'education', field: /^(score|gpa|grade|result)$/, label: 'Grade / GPA' },
  { section: 'education', field: /^(courses|course)$/, label: 'Module' },

  // ── Projects ───────────────────────────────────────────────────────────
  { section: 'projects', field: /^(name|title|project)$/, label: 'Project name' },
  { section: 'projects', field: /^(role|position)$/, label: 'Role' },
  { section: 'projects', field: /^(description|summary)$/, label: 'Project summary or achievements' },
  { section: 'projects', field: /^(tech|techstack|technologies|keywords|stack)$/, label: 'Technologies' },
  { section: 'projects', field: /^(url|link|repository|repo)$/, label: 'Project link' },

  // ── Certifications ─────────────────────────────────────────────────────
  { section: 'certifications', field: /^(name|title|certificate)$/, label: 'Certification name' },
  { section: 'certifications', field: /^(issuer|authority|organization|organisation|provider)$/, label: 'Issuer' },
  { section: 'certifications', field: /^(description|summary)$/, label: 'Details' },
  { section: 'certifications', field: /^(url|link|credential)$/, label: 'Credential link' },

  // ── Awards ─────────────────────────────────────────────────────────────
  { section: 'awards', field: /^(name|title|award)$/, label: 'Award name' },
  { section: 'awards', field: /^(awarder|issuer|organization|organisation)$/, label: 'Awarding organisation' },
  { section: 'awards', field: /^(description|summary)$/, label: 'Details' },

  // ── Publications ───────────────────────────────────────────────────────
  { section: 'publications', field: /^(name|title|publication)$/, label: 'Publication title' },
  { section: 'publications', field: /^(publisher|journal|venue)$/, label: 'Publisher' },
  { section: 'publications', field: /^(description|summary)$/, label: 'Details' },
  { section: 'publications', field: /^(url|link|doi)$/, label: 'Link' },

  // ── Volunteer ──────────────────────────────────────────────────────────
  { section: 'volunteer', field: /^(role|position)$/, label: 'Role/Designation' },
  { section: 'volunteer', field: /^(organization|organisation|company|name)$/, label: 'Organisation' },
  { section: 'volunteer', field: /^(description|summary)$/, label: 'Volunteer summary or achievements' },

  // ── References ─────────────────────────────────────────────────────────
  { section: 'references', field: /^name$/, label: 'Reference name' },
  { section: 'references', field: /^(reference|role|position|title)$/, label: 'Role / job title' },
  { section: 'references', field: /^(contact|email|phone)$/, label: 'Email or phone' },
  { section: 'references', field: /^(description|summary|note)$/, label: 'Note' },

  // ── Skills / languages / interests ─────────────────────────────────────
  { section: 'skills', field: /^(keywords|skillstext|name|category|skills)$/, label: 'Add a skill' },
  { section: 'skills', field: /^(description|summary)$/, label: 'Detail' },
  { section: 'languages', field: /^(language|name)$/, label: 'Language' },
  { section: 'languages', field: /^(fluency|level)$/, label: 'Fluency level' },
  { section: 'interests', field: /^(name|title|keywords|interest)$/, label: 'Interest' },

  // ── Section titles (renameable headings) ───────────────────────────────
  { section: 'sectionTitles', field: /.*/, label: 'Section name' },

  // ── Section-agnostic fallbacks ─────────────────────────────────────────
  { field: /^(description|summary|details)$/, label: 'Add details' },
  { field: /^(date|issueddate|releasedate|year)$/, label: 'Date' },
  { field: /^(label|heading|title)$/, label: 'Title' },
  { field: /^(name)$/, label: 'Name' },
  { field: /^(url|link)$/, label: 'Link' },
];

/** "endDate" → "End date"; used only when no rule above matched. */
function prettifyFieldName(field: string): string {
  const spaced = field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\btext\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spaced) return 'Add text';
  const sentence = spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  return sentence.length > 1 ? sentence : 'Add text';
}

/**
 * Placeholder text for an empty field, from its data path.
 *
 * @param path           Data path, e.g. `experience.2.company` or `work.2.name`.
 * @param profileNetwork Optional network name (LinkedIn/GitHub/…) for
 *                       `profiles.N.url`, so the slot names the right profile.
 */
export function resolveEmptyFieldPlaceholder(path: string, profileNetwork?: string): string {
  const segments = String(path || '')
    .split('.')
    .filter((segment) => Boolean(segment) && !/^\d+$/.test(segment));

  if (segments.length === 0) return 'Add text';

  const field = segments[segments.length - 1];
  const rawSection = segments.length > 1 ? segments[segments.length - 2] : '';
  const section = SECTION_ALIASES[rawSection] || rawSection;
  const lowerField = field.toLowerCase();

  // Dates first: the same slot in every section wants the same two words.
  if (START_FIELD.test(lowerField)) return 'Start';
  if (END_FIELD.test(lowerField)) return 'End';

  // A named-profile URL should name the profile it belongs to.
  if (section === 'profiles' && /^(url|link)$/.test(lowerField) && profileNetwork) {
    const network = profileNetwork.toLowerCase();
    if (network.includes('linkedin')) return 'LinkedIn';
    if (network.includes('github')) return 'GitHub';
    if (network.includes('twitter') || network.includes('x')) return 'Twitter';
    return `${profileNetwork} link`;
  }

  for (const rule of LABELS) {
    if (rule.section !== undefined) {
      const allowed = Array.isArray(rule.section) ? rule.section : [rule.section];
      if (!allowed.includes(section)) continue;
    }
    if (rule.field.test(lowerField)) return rule.label;
  }

  return prettifyFieldName(field);
}
