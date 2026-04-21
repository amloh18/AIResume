import { describe, it, expect } from 'vitest';
import { mergeSuggestedSkills } from './skills-suggestions';

describe('mergeSuggestedSkills', () => {
  it('adds selected skills into existing matching category without duplicates', () => {
    const existing = [{ category: 'Technical Skills', skills: ['React', 'TypeScript'] }];
    const selected = [{ category: 'Technical Skills', skills: ['TypeScript', 'Node.js'] }];
    const merged = mergeSuggestedSkills(existing, selected);
    expect(merged).toHaveLength(1);
    expect(merged[0].category).toBe('Technical Skills');
    expect(merged[0].skills).toEqual(['React', 'TypeScript', 'Node.js']);
  });

  it('creates a default category when no matching category exists', () => {
    const existing: any[] = [];
    const selected = [{ category: '', skills: ['Communication'] }];
    const merged = mergeSuggestedSkills(existing, selected);
    expect(merged).toHaveLength(1);
    expect(merged[0].category).toBe('Suggested Skills');
    expect(merged[0].skills).toEqual(['Communication']);
  });

  it('prevents duplicates across categories', () => {
    const existing = [
      { category: 'Core', skills: ['Communication'] },
      { category: 'Tools', skills: ['Figma'] }
    ];
    const selected = [{ category: 'Soft Skills', skills: ['communication', 'Leadership'] }];
    const merged = mergeSuggestedSkills(existing, selected);
    expect(merged).toHaveLength(3);
    expect(merged[2].category).toBe('Soft Skills');
    expect(merged[2].skills).toEqual(['Leadership']);
  });
});

