import { describe, it, expect } from 'vitest';
import {
  matchesRegion,
  remoteQualifier,
  parseSalary,
} from '@/lib/services/jobDiscoveryService';

describe('jobDiscoveryService region filtering', () => {
  it('removes qualifier text after "remote"', () => {
    expect(remoteQualifier('Remote')).toBe('');
    expect(remoteQualifier('Remote - US')).toBe('us');
    expect(remoteQualifier('Remote, Canada')).toBe('canada');
    expect(remoteQualifier('London or Remote (UK)')).toBe('(uk)');
    expect(remoteQualifier('Cardiff, London or Remote (UK)')).toBe('(uk)');
    expect(remoteQualifier('Remote - United States')).toBe('united states');
    expect(remoteQualifier('Remote - Worldwide')).toBe('worldwide');
  });

  it('keeps UK in-market and generic/global remote roles for UK region', () => {
    expect(matchesRegion('London', 'UK')).toBe(true);
    expect(matchesRegion('Manchester, UK', 'UK')).toBe(true);
    expect(matchesRegion('Cardiff, London or Remote (UK)', 'UK')).toBe(true);
    expect(matchesRegion('Remote', 'UK')).toBe(true);
    expect(matchesRegion('Remote - Worldwide', 'UK')).toBe(true);
    expect(matchesRegion('Remote (EMEA)', 'UK')).toBe(true);
    expect(matchesRegion('Remote - Europe', 'UK')).toBe(true);
  });

  it('excludes foreign-restricted remote roles for UK region', () => {
    expect(matchesRegion('Remote - US', 'UK')).toBe(false);
    expect(matchesRegion('Remote, United States', 'UK')).toBe(false);
    expect(matchesRegion('Remote - Canada', 'UK')).toBe(false);
    expect(matchesRegion('San Francisco, CA, US; Remote, US', 'UK')).toBe(false);
    expect(matchesRegion('Remote - India', 'UK')).toBe(false);
    expect(matchesRegion('Remote - Bengaluru', 'UK')).toBe(false);
    expect(matchesRegion('Remote - Colombia', 'UK')).toBe(false);
    expect(matchesRegion('Remote - Singapore', 'UK')).toBe(false);
  });

  it('excludes foreign-restricted remote roles for India region', () => {
    expect(matchesRegion('Remote - US', 'India')).toBe(false);
    expect(matchesRegion('Remote - London', 'India')).toBe(false);
    expect(matchesRegion('Remote - Canada', 'India')).toBe(false);
  });

  it('keeps India in-market and generic remote roles for India region', () => {
    expect(matchesRegion('Bengaluru, India', 'India')).toBe(true);
    expect(matchesRegion('Gurugram', 'India')).toBe(true);
    expect(matchesRegion('Remote - India', 'India')).toBe(true);
    expect(matchesRegion('Remote', 'India')).toBe(true);
    expect(matchesRegion('Remote - Bengaluru', 'India')).toBe(true);
    expect(matchesRegion('Hyderabad, Telangana, India', 'India')).toBe(true);
  });

  it('excludes non-remote foreign physical locations', () => {
    expect(matchesRegion('Barcelona', 'UK')).toBe(false);
    expect(matchesRegion('Mexico City', 'India')).toBe(false);
    expect(matchesRegion('New York, NY', 'UK')).toBe(false);
    expect(matchesRegion('Dublin, Ireland', 'India')).toBe(false);
  });
});

describe('jobDiscoveryService salary parsing', () => {
  it('parses GBP metadata ranges', () => {
    const result = parseSalary([
      { name: 'Salary', value: '£70,000 – £90,000' },
    ]);
    expect(result.salaryMin).toBe(70000);
    expect(result.salaryMax).toBe(90000);
    expect(result.salaryCurrency).toBe('GBP');
  });

  it('parses USD metadata ranges', () => {
    const result = parseSalary([
      { name: 'Compensation', value: '$110k - $140k' },
    ]);
    expect(result.salaryMin).toBe(110000);
    expect(result.salaryMax).toBe(140000);
    expect(result.salaryCurrency).toBe('USD');
  });

  it('returns empty when no salary metadata present', () => {
    expect(parseSalary([])).toEqual({});
    expect(parseSalary([{ name: 'Level', value: 'Senior' }])).toEqual({});
  });
});