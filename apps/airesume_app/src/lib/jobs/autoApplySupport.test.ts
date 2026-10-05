import { describe, expect, it } from 'vitest';
import {
  isAutoApplySupported,
  isPlaywrightAutomatable,
  resolveApplyUrl,
  AUTO_APPLY_SUPPORTED_ATS,
} from './autoApplySupport';

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

  /*
    SB-20. `discover/route.ts` calls this as `isAutoApplySupported(job.atsType || job.source || '')`,
    and for the 42,338 `feashliaa` jobs `atsType` is null while `source` is an object. Before this
    guard the object reached `.trim()` and threw a TypeError out of the request.
  */
  it('never throws on the object-shaped `source` the ingestion service writes', () => {
    expect(isAutoApplySupported({ primary: 'feashliaa', applicationUrl: 'https://x.myworkdayjobs.com/y' })).toBe(false);
    expect(isAutoApplySupported({ primary: 'greenhouse' })).toBe(true);
    expect(isAutoApplySupported({})).toBe(false);
    expect(isAutoApplySupported({ primary: 42 })).toBe(false);
    expect(isAutoApplySupported(42)).toBe(false);
    expect(isAutoApplySupported([])).toBe(false);
  });
});

describe('resolveApplyUrl', () => {
  /*
    The two fields that can carry the form URL. `applyUrl` is set by the in-app ingestion sources;
    `source.applicationUrl` is where the `feashliaa` sync (86.7% of the corpus) puts it. Measured
    2026-09-27: 42,338 of 42,338 feashliaa jobs have the latter and 0 have the former.
  */
  it('prefers applyUrl when present', () => {
    expect(
      resolveApplyUrl({ applyUrl: 'https://boards.greenhouse.io/acme', source: { applicationUrl: 'https://other' } })
    ).toBe('https://boards.greenhouse.io/acme');
  });

  it('falls back to source.applicationUrl — the case that parked 42,338 jobs', () => {
    expect(resolveApplyUrl({ applyUrl: '', source: { applicationUrl: 'https://acme.wd3.myworkdayjobs.com/x' } })).toBe(
      'https://acme.wd3.myworkdayjobs.com/x'
    );
    expect(resolveApplyUrl({ source: { applicationUrl: 'https://acme.bamboohr.com/careers/1' } })).toBe(
      'https://acme.bamboohr.com/careers/1'
    );
  });

  it('treats a whitespace-only applyUrl as absent', () => {
    expect(resolveApplyUrl({ applyUrl: '   ', source: { applicationUrl: 'https://acme.bamboohr.com/careers/1' } })).toBe(
      'https://acme.bamboohr.com/careers/1'
    );
  });

  it('returns an empty string rather than undefined when nothing carries a URL', () => {
    expect(resolveApplyUrl(null)).toBe('');
    expect(resolveApplyUrl(undefined)).toBe('');
    expect(resolveApplyUrl({})).toBe('');
    expect(resolveApplyUrl({ applyUrl: null, source: null })).toBe('');
    // `source` is a plain string on some rows — it is not a URL carrier.
    expect(resolveApplyUrl({ source: 'greenhouse' })).toBe('');
    expect(resolveApplyUrl({ applyUrl: 42 })).toBe('');
  });
});

describe('isPlaywrightAutomatable', () => {
  it('stays narrower than the auto-apply list and never throws on object input', () => {
    expect(isPlaywrightAutomatable('greenhouse')).toBe(true);
    expect(isPlaywrightAutomatable('workday')).toBe(false);
    expect(isPlaywrightAutomatable('naukri')).toBe(false);
    expect(isPlaywrightAutomatable({ primary: 'greenhouse' })).toBe(true);
    expect(isPlaywrightAutomatable({ primary: 'workday' })).toBe(false);
    expect(isPlaywrightAutomatable(null)).toBe(false);
  });
});