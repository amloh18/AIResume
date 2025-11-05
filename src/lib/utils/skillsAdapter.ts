/**
 * Skills Data Adapter
 * Handles conversion between different skill data formats for template compatibility
 */

export interface CategorySkill {
  category: string;
  skills: string[];
}

export interface LegacySkill {
  name: string;
  level?: string;
  keywords: string[];
}

/**
 * Consolidate all skills from category-based format into a flat array
 * Useful for templates that display skills as chips or comma-separated text
 */
export function consolidateSkills(skills: (CategorySkill | LegacySkill)[]): string[] {
  if (!Array.isArray(skills)) return [];
  
  const allSkills: string[] = [];
  
  skills.forEach(skill => {
    // Handle category-based format (new)
    if ('category' in skill && skill.skills && Array.isArray(skill.skills)) {
      allSkills.push(...skill.skills);
    }
    // Handle legacy format
    else if ('keywords' in skill && Array.isArray(skill.keywords)) {
      allSkills.push(...skill.keywords);
    }
    // Handle name-only format
    else if ('name' in skill && skill.name) {
      allSkills.push(skill.name);
    }
  });
  
  // Remove duplicates and empty strings
  const uniqueSkills = new Set(allSkills.filter(s => s && s.trim()));
  return Array.from(uniqueSkills);
}

/**
 * Get skills organized by category
 * Useful for templates that can display categorized skills
 */
export function getCategorizedSkills(skills: (CategorySkill | LegacySkill)[]): CategorySkill[] {
  if (!Array.isArray(skills)) return [];
  
  const categorized: CategorySkill[] = [];
  
  skills.forEach(skill => {
    // Already in category format
    if ('category' in skill && skill.skills && Array.isArray(skill.skills)) {
      if (skill.category && skill.skills.length > 0) {
        categorized.push({
          category: skill.category,
          skills: skill.skills
        });
      }
    }
    // Convert legacy format to category
    else if ('keywords' in skill && Array.isArray(skill.keywords)) {
      const category = skill.name || 'Skills';
      if (skill.keywords.length > 0) {
        categorized.push({
          category,
          skills: skill.keywords
        });
      }
    }
  });
  
  return categorized;
}

/**
 * Check if template supports categorized skills
 */
export function templateSupportsCategorizedSkills(templateId: string): boolean {
  const categorySupportingTemplates = [
    'executive-professional',
    'data-driven-pro',
    'elegant-timeline'
  ];
  
  return categorySupportingTemplates.some(id => 
    templateId.toLowerCase().includes(id.toLowerCase())
  );
}

/**
 * Adapt skills data for a specific template
 */
export function adaptSkillsForTemplate(
  skills: (CategorySkill | LegacySkill)[],
  templateId: string
): CategorySkill[] | string[] {
  if (templateSupportsCategorizedSkills(templateId)) {
    return getCategorizedSkills(skills);
  }
  return consolidateSkills(skills);
}