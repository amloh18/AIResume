import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { clampLevel, serializeLanguagesForStorage } from '@/lib/utils/cv-snippet-data';

const buildRichTextDescription = (summary?: string, highlights?: string[]) => {
  const parts: string[] = [];
  const trimmedSummary = typeof summary === 'string' ? summary.trim() : '';
  const normalizedHighlights = Array.isArray(highlights)
    ? highlights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];

  if (trimmedSummary) {
    // Summaries are plain text whose line breaks were reverse-mapped to '\n'
    // (see extractSummaryFromHtml). Inside <p>, HTML collapses '\n' to a
    // space — carry the breaks as <br> so saved line breaks survive the
    // canvas → Unified → canvas round trip instead of merging into one line.
    parts.push(`<p>${trimmedSummary.replace(/\r\n?|\n/g, '<br>')}</p>`);
  }

  if (normalizedHighlights.length > 0) {
    parts.push(`<ul>${normalizedHighlights.map((item, index) => `<li data-highlight-index="${index}">${item}</li>`).join('')}</ul>`);
  }

  return parts.join('');
};

/**
 * Detects whether a description value is already rich HTML.
 *
 * Plain text can legitimately contain `<` (e.g. "GPA < 3.5 and >= 3.0"), so a
 * naive `includes('<')` check misclassifies it as HTML — the old education
 * branch then took the "keep as-is" path, dropped `courses` and leaked raw
 * markup into the renderer. Only a real structural/inline tag counts.
 */
const richTextTagPattern = /<\/?(?:p|div|ul|ol|li|br|strong|em|b|i|u|s|strike|small|sub|sup|span|h[1-6]|a|mark|font|label|blockquote|code|pre)(?:\s|\/|>|:)/i;
const looksLikeRichText = (value: string): boolean => richTextTagPattern.test(value);

/**
 * Extract highlights (bullet points) from HTML description — the reverse of
 * what `buildRichTextDescription` produces. Preserves inline formatting
 * (<strong>, <em>, <a>, <u>) within each highlight.
 *
 * Lives next to the forward builders so the canvas → Unified reverse map
 * (CVBuilderProAdapter) and the normalizer can never drift apart.
 */
export const extractHighlightsFromHtml = (html: string): string[] => {
  const liMatches = html.match(/<li[^>]*>[\s\S]*?<\/li>/g);
  if (!liMatches) return [];
  return liMatches.map((li: string) =>
    li.replace(/<li[^>]*>/, '').replace(/<\/li>/, '').trim()
  ).filter(Boolean);
};

/**
 * Extract summary (plain text with line breaks) from HTML description — the
 * reverse of `buildRichTextDescription`.
 *
 * Block boundaries become newlines so multi-line entries survive the round
 * trip: contentEditable Enter produces <div> lines, which the previous
 * implementation either dropped entirely (when a <p> existed — it only
 * returned the <p> blocks) or concatenated with no separator (fallback
 * branch). Lists are stripped here because they are extracted separately as
 * highlights, and inline formatting (<strong>, <em>, <a>, <u>) is preserved.
 */
export const extractSummaryFromHtml = (html: string): string => {
  if (!html) return '';
  return html
    // Lists belong to the highlights (bullets) — keep them out of the summary.
    .replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, '')
    .replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, '')
    // Carry block line breaks into the plain-text summary.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/(?:div|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<\/?li[^>]*>/gi, '\n')
    // Drop remaining structural wrappers; inline formatting tags stay.
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/?(?:div|span|font|label|section|article|header|footer|nav|main|aside|h[1-6]|blockquote)[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
};

export const normalizeSkillsText = (value: any): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (!Array.isArray(value)) {
    return '';
  }

  return value
    .map((item: any) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return item.name || item.skill || item.label || '';
      }
      return '';
    })
    .filter(Boolean)
    .join(', ');
};

export function normalizeCvDataForCanvas(cvData: UnifiedCVDataStructure | null | undefined) {
  if (!cvData) {
    return null;
  }

  const translated = JSON.parse(JSON.stringify(cvData));

  if (translated.basics) {
    if (typeof translated.basics.location === 'object' && translated.basics.location !== null) {
      const loc = translated.basics.location;
      translated.basics.location = [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ');
    }
    if (!translated.basics.title && translated.basics.label) {
      translated.basics.title = translated.basics.label;
    }
    if (!translated.basics.website && translated.basics.url) {
      translated.basics.website = translated.basics.url;
    }
    if (Array.isArray(translated.basics.profiles)) {
      const linkedin = translated.basics.profiles.find((p: any) => p.network?.toLowerCase() === 'linkedin');
      if (linkedin) {
        translated.basics.linkedin = linkedin.url || linkedin.username || '';
        translated.basics.profiles = translated.basics.profiles.filter((p: any) => p.network?.toLowerCase() !== 'linkedin');
      }
    }
  }

  // Support both `work` (Unified format) and `experience` (canvas/legacy format)
  if (Array.isArray(cvData.work) && cvData.work.length > 0) {
    translated.experience = cvData.work.map((w: any, index: number) => ({
      id: w.id || `exp-${index}`,
      role: w.position,
      company: w.name,
      startDate: w.startDate || '',
      endDate: w.endDate || '',
      description: buildRichTextDescription(w.summary, w.highlights),
    }));
  } else if (Array.isArray((cvData as any).experience) && (cvData as any).experience.length > 0) {
    // Already in canvas format or legacy format — normalize field names
    translated.experience = (cvData as any).experience.map((exp: any, index: number) => ({
      id: exp.id || `exp-${index}`,
      role: exp.role || exp.position || '',
      company: exp.company || exp.name || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: exp.description || buildRichTextDescription(exp.summary, exp.highlights),
    }));
  }

  if (Array.isArray(cvData.volunteer)) {
    translated.volunteer = cvData.volunteer.map((v: any, index: number) => ({
      ...v,
      id: v.id || `vol-${index}`,
      description: buildRichTextDescription(v.summary, v.highlights),
    }));
  }

  if (Array.isArray(cvData.education)) {
    translated.education = cvData.education.map((e: any, index: number) => {
      // Support both Unified format ({studyType, area}) and canvas format ({degree})
      let degree = e.degree || '';
      if (!degree && (e.studyType || e.area)) {
        degree = e.studyType ? `${e.studyType} in ${e.area || ''}`.trim() : (e.area || '');
      }

      /*
        Education renders `description` as HTML (CoreUI assigns it to
        innerHTML, same as work/projects) and carries structured coursework in
        `courses`. Every path must keep both:

        - rich HTML descriptions are kept as-is and get their coursework
          appended as a real <ul> when the bullets are not already inline —
          the old HTML branch returned early and dropped `courses`, so the
          first edit permanently lost the education bullet points;
        - plain-text descriptions (including ones that merely contain `<`,
          like "GPA < 3.5") go through the shared rich-text builder so
          coursework becomes real <li> bullets instead of vanishing.
      */
      const courses: string[] = Array.isArray(e.courses)
        ? e.courses.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
        : [];
      const rawDescription = typeof e.description === 'string' ? e.description : '';

      let descriptionBody: string;
      if (looksLikeRichText(rawDescription)) {
        const richDescription = rawDescription.trim();
        const hasInlineBullets = /<li(?=[\s>])/i.test(richDescription);
        descriptionBody = !hasInlineBullets && courses.length > 0
          ? `${richDescription}<ul>${courses.map((course, courseIndex) => `<li data-highlight-index="${courseIndex}">${course.trim()}</li>`).join('')}</ul>`
          : richDescription;
      } else {
        descriptionBody = buildRichTextDescription(rawDescription, courses);
      }

      return {
        id: e.id || `edu-${index}`,
        degree,
        institution: e.institution || '',
        startDate: e.startDate || '',
        endDate: e.endDate || '',
        description: [
          e.score ? `<p>Score: ${e.score}</p>` : '',
          descriptionBody,
        ].filter(Boolean).join(''),
      };
    });
  }

  if (Array.isArray(cvData.projects)) {
    translated.projects = cvData.projects.map((p: any, index: number) => ({
      ...p,
      id: p.id || `proj-${index}`,
      // Support both plain text description and rich HTML with highlights
      description: p.description && p.description.includes('<')
        ? (p.description || '')
        : buildRichTextDescription(p.description, p.highlights),
    }));
  }

  if (Array.isArray(cvData.skills)) {
    translated.skills = cvData.skills.map((skillGrp: any, index: number) => {
      if (typeof skillGrp === 'string') {
        return {
          id: `skill-${index}`,
          category: 'Skills',
          skillsText: skillGrp,
          skills: skillGrp.split(/[,\n]/).map((item: string) => item.trim()).filter(Boolean),
          levels: [],
        };
      }

      // Handle old format: {name, keywords[]} → {category, skills[]}
      const sourceSkills = skillGrp.skills || skillGrp.keywords || [];
      const skills = Array.isArray(sourceSkills)
        ? sourceSkills.map((item: any) => (typeof item === 'string' ? item : item?.name || item?.skill || '')).filter(Boolean)
        : [];
      const levels = Array.isArray(skillGrp.levels)
        ? skillGrp.levels.map((level: any) => clampLevel(level, skillGrp.rating || 3))
        : skills.map((_skill: string, skillIndex: number) => clampLevel(skillGrp.rating, 5 - (skillIndex % 3)));

      // Category: support both {category} and {name} formats
      const category = skillGrp.category || skillGrp.name || `Skills ${index + 1}`;

      // SkillsText: support skillsText, skills array, or keywords array
      const skillsText = normalizeSkillsText(skillGrp.skillsText || skills || skillGrp.keywords || []);

      return {
        id: skillGrp.id || `skill-${index}`,
        category,
        skills,
        skillsText,
        levels,
        rating: typeof skillGrp.rating === 'number' ? clampLevel(skillGrp.rating) : undefined,
      };
    });
  }

  if (Array.isArray(cvData.languages) || typeof (cvData as any).languages === 'string') {
    translated.languages = serializeLanguagesForStorage(cvData.languages);
  }

  if (Array.isArray(cvData.certificates) || Array.isArray((cvData as any).certifications)) {
    const source = Array.isArray((cvData as any).certifications) && (cvData as any).certifications.length > 0
      ? (cvData as any).certifications
      : cvData.certificates || [];
    translated.certifications = source.map((cert: any, index: number) => ({
      ...cert,
      id: cert.id || `cert-${index}`,
      name: cert.name || '',
      issuer: cert.issuer || '',
      startDate: cert.startDate || cert.date || '',
      endDate: cert.endDate || '',
      date: cert.date || cert.startDate || '',
      url: cert.url || '',
      description: cert.description || '',
    }));
  }

  if (Array.isArray(cvData.awards)) {
    translated.awards = cvData.awards.map((award: any, index: number) => ({
      ...award,
      id: award.id || `award-${index}`,
      name: award.name || award.title || '',
      title: award.title || award.name || '',
      issuer: award.issuer || award.awarder || '',
      awarder: award.awarder || award.issuer || '',
      startDate: award.startDate || award.date || '',
      endDate: award.endDate || '',
      date: award.date || award.startDate || '',
      summary: award.summary || '',
    }));
  }

  if (Array.isArray(cvData.publications)) {
    translated.publications = cvData.publications.map((pub: any, index: number) => ({
      ...pub,
      id: pub.id || `pub-${index}`,
      title: pub.title || pub.name || '',
      name: pub.name || pub.title || '',
      publisher: pub.publisher || '',
      startDate: pub.startDate || pub.releaseDate || '',
      endDate: pub.endDate || '',
      releaseDate: pub.releaseDate || pub.startDate || '',
      description: pub.description || pub.summary || '',
      summary: pub.summary || pub.description || '',
    }));
  }

  if (Array.isArray(cvData.references)) {
    translated.references = cvData.references.map((ref: any, index: number) => ({
      ...ref,
      id: ref.id || `ref-${index}`,
      name: ref.name || '',
      role: ref.role || ref.reference || '',
      contact: ref.contact || ref.url || '',
      reference: ref.reference || ref.role || '',
    }));
  }

  if (Array.isArray(cvData.interests)) {
    translated.interests = cvData.interests.map((item: any, index: number) => (
      typeof item === 'string'
        ? { name: item, keywords: [] }
        : { ...item, id: item.id || `int-${index}`, name: item.name || '', keywords: item.keywords || [] }
    ));
  }

  if (cvData.stats) {
    translated.stats = cvData.stats;
  }

  translated.sectionTitles = translated.sectionTitles || {
    summary: 'Professional Summary',
    experience: 'Professional Experience',
    education: 'Education',
    projects: 'Projects',
    certifications: 'Certifications',
    awards: 'Awards',
    publications: 'Publications',
    volunteer: 'Volunteer Experience',
    references: 'References',
    skills: 'Skills',
    languages: 'Languages',
    interests: 'Interests',
    contact: 'Contact'
  };

  return translated;
}
