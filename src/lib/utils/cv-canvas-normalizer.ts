import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { clampLevel, serializeLanguagesForStorage } from '@/lib/utils/cv-snippet-data';

const buildRichTextDescription = (summary?: string, highlights?: string[]) => {
  const parts: string[] = [];
  const trimmedSummary = typeof summary === 'string' ? summary.trim() : '';
  const normalizedHighlights = Array.isArray(highlights)
    ? highlights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];

  if (trimmedSummary) {
    parts.push(`<p>${trimmedSummary}</p>`);
  }

  if (normalizedHighlights.length > 0) {
    parts.push(`<ul>${normalizedHighlights.map((item, index) => `<li data-highlight-index="${index}">${item}</li>`).join('')}</ul>`);
  }

  return parts.join('');
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

  if (Array.isArray(cvData.work)) {
    translated.experience = cvData.work.map((w: any, index: number) => ({
      id: w.id || `exp-${index}`,
      role: w.position,
      company: w.name,
      startDate: w.startDate || '',
      endDate: w.endDate || '',
      description: buildRichTextDescription(w.summary, w.highlights),
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
    translated.education = cvData.education.map((e: any, index: number) => ({
      id: e.id || `edu-${index}`,
      degree: e.studyType ? `${e.studyType} in ${e.area}` : e.area,
      institution: e.institution,
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      description: [e.score ? `Score: ${e.score}` : '', e.description || ''].filter(Boolean).join('\n'),
    }));
  }

  if (Array.isArray(cvData.projects)) {
    translated.projects = cvData.projects.map((p: any, index: number) => ({
      ...p,
      id: p.id || `proj-${index}`,
      description: buildRichTextDescription(p.description, p.highlights),
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

      const skills = Array.isArray(skillGrp.skills)
        ? skillGrp.skills.map((item: any) => (typeof item === 'string' ? item : item?.name || item?.skill || '')).filter(Boolean)
        : [];
      const levels = Array.isArray(skillGrp.levels)
        ? skillGrp.levels.map((level: any) => clampLevel(level, skillGrp.rating || 3))
        : skills.map((_skill: string, skillIndex: number) => clampLevel(skillGrp.rating, 5 - (skillIndex % 3)));

      return {
        ...skillGrp,
        id: skillGrp.id || `skill-${index}`,
        category: skillGrp.category || skillGrp.name || `Skills ${index + 1}`,
        skills,
        skillsText: normalizeSkillsText(skillGrp.skillsText || skills || skillGrp.keywords || []),
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
