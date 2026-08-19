export const FLUENCY_LEVELS = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Basic' },
  { value: 3, label: 'Intermediate' },
  { value: 4, label: 'Fluent' },
  { value: 5, label: 'Native' },
] as const;

export type FluencyLabel = (typeof FLUENCY_LEVELS)[number]['label'];

export function clampLevel(value: any, fallback = 3): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

export function fluencyToLevel(fluency: any, fallback = 3): number {
  if (typeof fluency === 'number') return clampLevel(fluency, fallback);
  const str = String(fluency || '').toLowerCase().trim();
  if (!str) return fallback;
  if (/^[1-5]$/.test(str)) return Number(str);
  if (str.includes('native') || str.includes('bilingual')) return 5;
  if (str.includes('fluent') || str.includes('advanced') || str.includes('proficient') || str.includes('c2') || str.includes('c1')) return 4;
  if (str.includes('intermediate') || str.includes('conversational') || str.includes('b1') || str.includes('b2')) return 3;
  if (str.includes('basic') || str.includes('elementary') || str.includes('a2')) return 2;
  if (str.includes('beginner') || str.includes('a1')) return 1;
  return fallback;
}

export function levelToFluency(level: number): FluencyLabel {
  return FLUENCY_LEVELS[clampLevel(level) - 1].label;
}

export function levelToPercent(level: number): number {
  return clampLevel(level) * 20;
}

export interface NormalizedLanguage {
  language: string;
  fluency: string;
  level: number;
  pathLanguage: string;
  pathFluency: string;
  pathLevel: string;
}

export function normalizeLanguages(raw: any): NormalizedLanguage[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item: any, index: number) => {
        if (typeof item === 'string') {
          const language = item.replace(/\(.*\)/, '').trim();
          const paren = item.match(/\(([^)]+)\)/);
          const fluency = (paren?.[1] || '').trim();
          return {
            language,
            fluency: fluency || '',
            level: fluencyToLevel(fluency),
            pathLanguage: `languages.${index}.language`,
            pathFluency: `languages.${index}.fluency`,
            pathLevel: `languages.${index}.level`,
          };
        }

        const language = String(item?.language || item?.name || '').trim();
        const fluency = String(item?.fluency || '').trim();
        const level = typeof item?.level === 'number'
          ? clampLevel(item.level)
          : fluencyToLevel(fluency || item?.level);
        return {
          language,
          fluency: fluency || levelToFluency(level),
          level,
          pathLanguage: `languages.${index}.language`,
          pathFluency: `languages.${index}.fluency`,
          pathLevel: `languages.${index}.level`,
        };
      })
      .filter((item) => item.language);
  }

  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((part, index) => {
        const language = part.replace(/\(.*\)/, '').trim();
        const paren = part.match(/\(([^)]+)\)/);
        const fluency = (paren?.[1] || '').trim();
        return {
          language,
          fluency,
          level: fluencyToLevel(fluency),
          pathLanguage: `languages.${index}.language`,
          pathFluency: `languages.${index}.fluency`,
          pathLevel: `languages.${index}.level`,
        };
      })
      .filter((item) => item.language);
  }

  return [];
}

export function serializeLanguagesForStorage(raw: any): Array<{ language: string; fluency: string; level: number }> {
  return normalizeLanguages(raw).map(({ language, fluency, level }) => ({
    language,
    fluency: fluency || levelToFluency(level),
    level,
  }));
}

const LEGACY_SKILL_GROUP_LABELS: Record<string, string> = {
  languages: 'Core Languages',
  frameworks: 'Frameworks',
  tools: 'Tools & Tech',
  databases: 'Databases',
  soft: 'Soft Skills',
};

function splitSkillsText(value: any): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item: any) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') return String(item.name || item.skill || item.label || '').trim();
        return '';
      })
      .filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

export function coerceLanguagesForEdit(raw: any): Array<{ id?: string; language: string; fluency: string; level: number }> {
  if (Array.isArray(raw)) {
    return raw.map((item: any, index: number) => {
      if (typeof item === 'string') {
        const language = item.replace(/\(.*\)/, '').trim();
        const paren = item.match(/\(([^)]+)\)/);
        const fluency = (paren?.[1] || '').trim();
        return { id: `lang-${index}`, language, fluency, level: fluencyToLevel(fluency) };
      }
      return {
        id: item?.id || `lang-${index}`,
        language: String(item?.language || item?.name || ''),
        fluency: String(item?.fluency || ''),
        level: typeof item?.level === 'number' ? clampLevel(item.level) : fluencyToLevel(item?.fluency || item?.level),
      };
    });
  }
  return serializeLanguagesForStorage(raw).map((item, index) => ({ id: `lang-${index}`, ...item }));
}

export function coerceInterestsForEdit(raw: any): Array<{ id?: string; name: string; keywords: string[] }> {
  if (Array.isArray(raw)) {
    return raw.map((item: any, index: number) => (
      typeof item === 'string'
        ? { id: `int-${index}`, name: item, keywords: [] }
        : { id: item?.id || `int-${index}`, name: String(item?.name || ''), keywords: Array.isArray(item?.keywords) ? item.keywords : [] }
    ));
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((name, index) => ({ id: `int-${index}`, name: name.trim(), keywords: [] })).filter((item) => item.name);
  }
  return [];
}

export function coerceSkillsForEdit(raw: any): Array<{ id?: string; category: string; skills: string[]; skillsText: string; levels: number[] }> {
  if (Array.isArray(raw)) {
    return raw.map((group: any, index: number) => {
      if (typeof group === 'string') {
        const skills = splitSkillsText(group);
        return { id: `skill-${index}`, category: 'Skills', skills, skillsText: group, levels: skills.map(() => 3) };
      }
      const skills = splitSkillsText(group?.skillsText || group?.skills || group?.keywords || []);
      const levels = Array.isArray(group?.levels)
        ? group.levels.map((level: any) => clampLevel(level, 3))
        : skills.map((_skill: string, skillIndex: number) => clampLevel(group?.rating, 3 + (skillIndex % 2)));
      return {
        id: group?.id || `skill-${index}`,
        category: group?.category || group?.name || `Skills ${index + 1}`,
        skills,
        skillsText: typeof group?.skillsText === 'string' ? group.skillsText : skills.join(', '),
        levels,
      };
    });
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, value]) => typeof value === 'string' && String(value).trim())
      .map(([key, value], index) => {
        const skills = splitSkillsText(value);
        return {
          id: `skill-${index}`,
          category: LEGACY_SKILL_GROUP_LABELS[key] || key,
          skills,
          skillsText: String(value),
          levels: skills.map(() => 3),
        };
      });
  }

  if (typeof raw === 'string' && raw.trim()) {
    const skills = splitSkillsText(raw);
    return [{ id: 'skill-0', category: 'Skills', skills, skillsText: raw, levels: skills.map(() => 3) }];
  }

  return [];
}

export function appendSkillRecord(raw: any): Array<{ id?: string; category: string; skills: string[]; skillsText: string; levels: number[] }> {
  const groups = coerceSkillsForEdit(raw);
  if (groups.length === 0) {
    return [{ id: 'skill-0', category: 'Skills', skills: ['New Skill'], skillsText: 'New Skill', levels: [3] }];
  }
  const next = groups.map((group) => ({ ...group, skills: [...group.skills], levels: [...(group.levels || [])] }));
  const last = next[next.length - 1];
  last.skills.push('New Skill');
  last.levels.push(3);
  last.skillsText = last.skills.join(', ');
  return next;
}

/** Convert string/object list fields so nested canvas paths (languages.0.language) can edit. */
export function ensureCanvasListShapes(data: any) {
  if (!data || typeof data !== 'object') return data;
  const next = { ...data };
  if (typeof next.languages === 'string') next.languages = coerceLanguagesForEdit(next.languages);
  if (typeof next.interests === 'string') next.interests = coerceInterestsForEdit(next.interests);
  if (next.skills && !Array.isArray(next.skills)) next.skills = coerceSkillsForEdit(next.skills);
  return next;
}

export function normalizeInterestsList(raw: any): Array<{ name: string; path: string }> {
  if (Array.isArray(raw)) {
    return raw
      .map((item: any, index: number) => {
        const name = typeof item === 'string' ? item.trim() : String(item?.name || '').trim();
        return { name, path: `interests.${index}.name` };
      })
      .filter((item) => item.name);
  }

  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((name, index) => ({ name: name.trim(), path: `interests.${index}.name` }))
      .filter((item) => item.name);
  }

  return [];
}

export function deriveCareerStats(data: any): { years: string; projects: string; industries: string } {
  const saved = data?.stats || data?.basics?.stats || {};
  const experience = Array.isArray(data?.experience) ? data.experience : Array.isArray(data?.work) ? data.work : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];

  let years = saved.years;
  if (!years) {
    const startYears = experience
      .map((item: any) => parseInt(String(item?.startDate || '').slice(0, 4), 10))
      .filter((year: number) => Number.isFinite(year) && year > 1970);
    if (startYears.length > 0) {
      const span = Math.max(1, new Date().getFullYear() - Math.min(...startYears));
      years = `${span}+`;
    } else {
      years = '1+';
    }
  }

  return {
    years: String(years),
    projects: String(saved.projects || (projects.length > 0 ? `${projects.length}+` : '0')),
    industries: String(saved.industries || Math.max(1, new Set(experience.map((item: any) => item.company || item.name).filter(Boolean)).size)),
  };
}

export const SNIPPET_CATEGORY_JSON_PATH: Record<string, string> = {
  Header: 'basics',
  Summary: 'basics.summary',
  Experience: 'experience',
  Education: 'education',
  Projects: 'projects',
  Certifications: 'certifications',
  Awards: 'awards',
  Publications: 'publications',
  Volunteer: 'volunteer',
  References: 'references',
  Skills: 'skills',
  Languages: 'languages',
  Interests: 'interests',
  Sidebar: 'basics',
  Contact: 'basics',
};
