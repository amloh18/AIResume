import { describe, it, expect } from 'vitest';
import {
  parseNaukriSalary,
  NaukriDiscoveryService,
  type NaukriRawJob,
} from '@/lib/services/naukriDiscoveryService';

describe('NaukriDiscoveryService salary parsing', () => {
  it('parses Lacs / LPA ranges accurately', () => {
    const res1 = parseNaukriSalary('12-18 Lacs PA');
    expect(res1.salaryMin).toBe(1200000);
    expect(res1.salaryMax).toBe(1800000);
    expect(res1.salaryCurrency).toBe('INR');

    const res2 = parseNaukriSalary('5.5 - 8.5 LPA');
    expect(res2.salaryMin).toBe(550000);
    expect(res2.salaryMax).toBe(850000);
    expect(res2.salaryCurrency).toBe('INR');
  });

  it('parses single Lacs values', () => {
    const res = parseNaukriSalary('15 Lacs PA');
    expect(res.salaryMin).toBe(1500000);
    expect(res.salaryMax).toBe(1500000);
  });

  it('handles "Not Disclosed" or undefined gracefully', () => {
    const res = parseNaukriSalary('Not Disclosed');
    expect(res.salaryMin).toBeUndefined();
    expect(res.salaryMax).toBeUndefined();
    expect(res.salaryCurrency).toBe('INR');
  });
});

describe('NaukriDiscoveryService normalization', () => {
  it('normalizes a raw Naukri job into DiscoveredJob format', () => {
    const raw: NaukriRawJob = {
      jobId: '123456',
      title: 'Senior Full Stack Developer',
      companyName: 'Infosys',
      placeholders: [
        { type: 'location', label: 'Bangalore / Bengaluru' },
        { type: 'salary', label: '18-25 Lacs PA' },
      ],
      jobDescription: '<p>Looking for a <strong>React & Node.js</strong> developer.</p>',
      tagsAndSkills: ['React', 'Node.js', 'MongoDB'],
      staticUrl: '/job-listings-senior-full-stack-developer-infosys-123456',
      createdDate: 1718000000000,
    };

    const normalized = NaukriDiscoveryService.normalizeNaukriJob(raw);

    expect(normalized.externalId).toBe('naukri_123456');
    expect(normalized.title).toBe('Senior Full Stack Developer');
    expect(normalized.company).toBe('Infosys');
    expect(normalized.location).toBe('Bangalore / Bengaluru');
    expect(normalized.country).toBe('India');
    expect(normalized.salaryMin).toBe(1800000);
    expect(normalized.salaryMax).toBe(2500000);
    expect(normalized.salaryCurrency).toBe('INR');
    expect(normalized.description).toBe('Looking for a React & Node.js developer.');
    expect(normalized.applyUrl).toBe('https://www.naukri.com/job-listings-senior-full-stack-developer-infosys-123456');
    expect(normalized.source).toBe('naukri');
    expect(normalized.atsType).toBe('naukri');
    expect(normalized.keywords).toEqual(['React', 'Node.js', 'MongoDB']);
  });
});
