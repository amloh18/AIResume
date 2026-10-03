import { describe, it, expect } from 'vitest';
import { AdzunaDiscoveryService, type AdzunaRawJob } from '@/lib/services/adzunaDiscoveryService';

describe('AdzunaDiscoveryService normalization', () => {
  it('normalizes raw Adzuna job objects into DiscoveredJob schema', () => {
    const raw: AdzunaRawJob = {
      id: 'adz_98765',
      title: '<strong>Full Stack Engineer</strong>',
      company: { display_name: 'Revolut' },
      location: { display_name: 'London, UK' },
      description: 'Join Revolut as a Full Stack Engineer working on React and Node.js microservices.',
      salary_min: 75000,
      salary_max: 95000,
      redirect_url: 'https://www.adzuna.co.uk/land/ad/98765',
      created: '2026-08-20T10:00:00Z',
    };

    const normalized = AdzunaDiscoveryService.normalizeJob(raw, 'UK', 'GBP');

    expect(normalized.externalId).toBe('adzuna_adz_98765');
    expect(normalized.title).toBe('Full Stack Engineer');
    expect(normalized.company).toBe('Revolut');
    expect(normalized.location).toBe('London, UK');
    expect(normalized.country).toBe('UK');
    expect(normalized.salaryMin).toBe(75000);
    expect(normalized.salaryMax).toBe(95000);
    expect(normalized.salaryCurrency).toBe('GBP');
    expect(normalized.applyUrl).toBe('https://www.adzuna.co.uk/land/ad/98765');
    expect(normalized.source).toBe('adzuna');
    expect(normalized.atsType).toBe('adzuna');
  });

  it('detects remote flags from title or location', () => {
    const raw: AdzunaRawJob = {
      id: 'adz_remote_1',
      title: 'Remote React Developer',
      company: { display_name: 'Monzo' },
      location: { display_name: 'United Kingdom' },
      description: '100% remote developer role.',
      redirect_url: 'https://www.adzuna.co.uk/land/ad/remote1',
    };

    const normalized = AdzunaDiscoveryService.normalizeJob(raw, 'UK', 'GBP');
    expect(normalized.remote).toBe(true);
  });
});
