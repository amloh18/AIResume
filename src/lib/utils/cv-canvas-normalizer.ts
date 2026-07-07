import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

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

  const clone = (source: any) => {
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(source);
      } catch {
        return JSON.parse(JSON.stringify(source));
      }
    }
    return JSON.parse(JSON.stringify(source));
  };

  const translated = clone(cvData);

  if (translated.basics) {
    if (typeof translated.basics.location === 'object' && translated.basics.location !== null) {
      const loc = translated.basics.location;
      translated.basics.location = {
        city: typeof loc.city === 'string' ? loc.city : '',
        region: typeof loc.region === 'string' ? loc.region : '',
        countryCode: typeof loc.countryCode === 'string' ? loc.countryCode : '',
        address: typeof loc.address === 'string' ? loc.address : '',
        postalCode: typeof loc.postalCode === 'string' ? loc.postalCode : ''
      };
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
      url: w.url || '',
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
      url: e.url || '',
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
        };
      }

      return {
        ...skillGrp,
        id: skillGrp.id || `skill-${index}`,
        category: skillGrp.category || skillGrp.name || `Skills ${index + 1}`,
        skillsText: normalizeSkillsText(skillGrp.skills || skillGrp.keywords || []),
      };
    });
  }

  if (Array.isArray(cvData.languages)) {
    translated.languages = cvData.languages.map((l: any) => l.language || l);
  }

  if (Array.isArray(cvData.interests)) {
    translated.interests = cvData.interests.map((i: any) => i.name || i);
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
