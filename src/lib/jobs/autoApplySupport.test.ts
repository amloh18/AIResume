import { describe, expect, it } from 'vitest';
import { isAutoApplySupported, AUTO_APPLY_SUPPORTED_ATS } from './autoApplySupport';

describe('AUTO_APPLY_SUPPORTED_ATS', () => {
  it('covers the ATS adapters that automate submission', () => {
    expect(AUTO_APPLY_SUPPORTED_ATS).toEqual(['greenhouse', 'lever', 'ashby', 'workable', 'naukri', 'indeed']);
  });
});

describe('isAutoApplySupported', () => {
  it('accepts supported ATS types case-insensitively', () => {
    expect(isAutoApplySupported('greenhouse')).toBe(true);
    expect(isAutoApplySupported('Lever')).toBe(true);
    expect(isAutoApplySupported('workable')).toBe(true);
    expect(isAutoApplySupported('naukri')).toBe(true);
  });

  it('rejects unsupported ATS types and junk', () => {
    expect(isAutoApplySupported('adzuna')).toBe(false);
    expect(isAutoApplySupported('workday')).toBe(false);
    expect(isAutoApplySupported('unknown')).toBe(false);
    expect(isAutoApplySupported('discovery')).toBe(false);
  });

  it('rejects empty values', () => {
    expect(isAutoApplySupported('')).toBe(false);
    expect(isAutoApplySupported(undefined)).toBe(false);
    expect(isAutoApplySupported(null)).toBe(false);
  });
});