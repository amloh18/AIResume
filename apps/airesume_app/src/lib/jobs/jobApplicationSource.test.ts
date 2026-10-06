import { describe, expect, it } from 'vitest';
import { sanitizeJobApplicationSource } from './jobApplicationSource';

describe('sanitizeJobApplicationSource', () => {
  it('keeps canonical sources including discovery', () => {
    expect(sanitizeJobApplicationSource('discovery')).toBe('discovery');
    expect(sanitizeJobApplicationSource('greenhouse')).toBe('greenhouse');
    expect(sanitizeJobApplicationSource('naukri')).toBe('naukri');
  });

  it('maps aliases', () => {
    expect(sanitizeJobApplicationSource('discover')).toBe('discovery');
    expect(sanitizeJobApplicationSource('web')).toBe('manual');
  });

  it('falls back to other', () => {
    expect(sanitizeJobApplicationSource('not-a-source')).toBe('other');
    expect(sanitizeJobApplicationSource(undefined)).toBe('other');
  });
});
