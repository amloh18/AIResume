import { describe, it, expect } from 'vitest';
import { parseIndeedSalary, IndeedDiscoveryService } from '@/lib/services/indeedDiscoveryService';

describe('IndeedDiscoveryService salary parsing', () => {
  it('parses US dollar annual salaries', () => {
    const res = parseIndeedSalary('$120,000 - $160,000 a year');
    expect(res.salaryMin).toBe(120000);
    expect(res.salaryMax).toBe(160000);
    expect(res.salaryCurrency).toBe('USD');
  });

  it('parses UK pound annual salaries', () => {
    const res = parseIndeedSalary('£55,000 - £75,000 a year');
    expect(res.salaryMin).toBe(55000);
    expect(res.salaryMax).toBe(75000);
    expect(res.salaryCurrency).toBe('GBP');
  });

  it('converts hourly rates to annual equivalents', () => {
    const res = parseIndeedSalary('$50 - $75 an hour');
    expect(res.salaryMin).toBe(50 * 2080);
    expect(res.salaryMax).toBe(75 * 2080);
    expect(res.salaryCurrency).toBe('USD');
  });
});

describe('IndeedDiscoveryService normalization', () => {
  it('normalizes Indeed RSS items into DiscoveredJob schema', () => {
    const item = {
      title: 'Senior Software Engineer - Stripe - London',
      link: 'https://uk.indeed.com/viewjob?jk=abc123xyz',
      description: 'We are looking for a Senior Software Engineer with £90,000 - £120,000 a year salary.',
      pubDate: 'Mon, 20 Aug 2026 12:00:00 GMT',
    };

    const normalized = IndeedDiscoveryService.normalizeIndeedItem(item, 'UK');

    expect(normalized.title).toBe('Senior Software Engineer');
    expect(normalized.company).toBe('Stripe');
    expect(normalized.location).toBe('London');
    expect(normalized.country).toBe('UK');
    expect(normalized.salaryMin).toBe(90000);
    expect(normalized.salaryMax).toBe(120000);
    expect(normalized.salaryCurrency).toBe('GBP');
    expect(normalized.source).toBe('indeed');
  });
});
