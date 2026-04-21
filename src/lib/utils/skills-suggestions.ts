export type SkillCategorySuggestion = { category: string; skills: string[] };

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function unique(skills: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const key = normalize(s);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.trim());
  }
  return out;
}

export function mergeSuggestedSkills(
  existing: Array<{ category?: string; name?: string; skills?: string[]; keywords?: string[] }>,
  selected: SkillCategorySuggestion[],
  defaultCategory = 'Suggested Skills'
) {
  const safeExisting = Array.isArray(existing) ? existing.map(s => ({ ...s })) : [];

  const categoryIndex = new Map<string, number>();
  for (let i = 0; i < safeExisting.length; i++) {
    const cat = (safeExisting[i].category || safeExisting[i].name || '').trim();
    if (cat) categoryIndex.set(normalize(cat), i);
  }

  const allExistingSkills = new Set<string>();
  for (const group of safeExisting) {
    const list = Array.isArray(group.skills) ? group.skills : Array.isArray(group.keywords) ? group.keywords : [];
    for (const s of list) {
      const key = normalize(s);
      if (key) allExistingSkills.add(key);
    }
  }

  for (const suggestionGroup of selected || []) {
    const catRaw = (suggestionGroup?.category || '').trim();
    const catKey = normalize(catRaw);
    const targetKey = catKey || normalize(defaultCategory);

    const idx = categoryIndex.get(targetKey);
    const targetIndex = typeof idx === 'number' ? idx : -1;

    const filteredSkills = unique(Array.isArray(suggestionGroup?.skills) ? suggestionGroup.skills : []).filter(s => {
      const key = normalize(s);
      return key && !allExistingSkills.has(key);
    });

    if (filteredSkills.length === 0) continue;

    if (targetIndex >= 0) {
      const current = safeExisting[targetIndex];
      const currentSkills = Array.isArray(current.skills)
        ? current.skills
        : Array.isArray(current.keywords)
          ? current.keywords
          : [];
      const merged = unique([...currentSkills, ...filteredSkills]);
      safeExisting[targetIndex] = {
        ...current,
        category: current.category || current.name || catRaw || defaultCategory,
        skills: merged,
      };
    } else {
      const newCategoryName = catRaw || defaultCategory;
      safeExisting.push({ category: newCategoryName, skills: filteredSkills });
      categoryIndex.set(normalize(newCategoryName), safeExisting.length - 1);
    }

    for (const s of filteredSkills) {
      const key = normalize(s);
      if (key) allExistingSkills.add(key);
    }
  }

  return safeExisting;
}

