export interface PathMapping {
  source: string;
  target: string;
}

export const EXPERIENCE_TO_WORK_MAPPINGS: Record<string, string> = {
  'experience': 'work',
  'experience.0': 'work.0',
  'experience.0.role': 'work.0.position',
  'experience.0.company': 'work.0.name',
  'experience.0.date': 'work.0.startDate',
  'experience.0.description': 'work.0.summary',
};

export const WORK_TO_EXPERIENCE_MAPPINGS: Record<string, string> = {
  'work': 'experience',
  'work.0': 'experience.0',
  'work.0.position': 'experience.0.role',
  'work.0.name': 'experience.0.company',
  'work.0.startDate': 'experience.0.date',
  'work.0.summary': 'experience.0.description',
};

export function translatePath(
  path: string,
  direction: 'cvcircleToCanvas' | 'canvasToCvcircle'
): string {
  const mappings = direction === 'cvcircleToCanvas' 
    ? EXPERIENCE_TO_WORK_MAPPINGS 
    : WORK_TO_EXPERIENCE_MAPPINGS;
  
  if (mappings[path]) {
    return mappings[path];
  }
  
  const arrayMatch = path.match(/^experience\.(\d+)\.(.+)$/);
  if (arrayMatch && direction === 'cvcircleToCanvas') {
    const index = arrayMatch[1];
    const field = arrayMatch[2];
    const fieldMapping: Record<string, string> = {
      role: 'position',
      company: 'name',
      date: 'startDate',
      description: 'summary',
    };
    const mappedField = fieldMapping[field] || field;
    return `work.${index}.${mappedField}`;
  }
  
  const workMatch = path.match(/^work\.(\d+)\.(.+)$/);
  if (workMatch && direction === 'canvasToCvcircle') {
    const index = workMatch[1];
    const field = workMatch[2];
    const fieldMapping: Record<string, string> = {
      position: 'role',
      name: 'company',
      startDate: 'date',
      summary: 'description',
    };
    const mappedField = fieldMapping[field] || field;
    return `experience.${index}.${mappedField}`;
  }
  
  return path;
}

export function translatePathWithArray(
  path: string,
  direction: 'cvcircleToCanvas' | 'canvasToCvcircle'
): string {
  const workSectionMatch = path.match(/^(work|experience)\[(\d+)\]/);
  if (workSectionMatch) {
    const [, , index] = workSectionMatch;
    const remainingPath = path.replace(workSectionMatch[0], '').replace(/^\./, '');
    
    if (direction === 'cvcircleToCanvas') {
      const fieldMapping: Record<string, string> = {
        role: 'position',
        company: 'name',
        date: 'startDate',
        description: 'summary',
      };
      const mappedField = fieldMapping[remainingPath] || remainingPath;
      return `work[${index}].${mappedField}`;
    } else {
      const fieldMapping: Record<string, string> = {
        position: 'role',
        name: 'company',
        startDate: 'date',
        summary: 'description',
      };
      const mappedField = fieldMapping[remainingPath] || remainingPath;
      return `experience[${index}].${mappedField}`;
    }
  }
  
  return translatePath(path, direction);
}

export function isExperiencePath(path: string): boolean {
  return path.startsWith('experience') || path.startsWith('work');
}

export function normalizePath(path: string): string {
  return path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '');
}