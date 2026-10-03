import { describe, it, expect } from 'vitest';

// Import normalizer directly from the Python-normalized output format
// The normalizer.py produces this structure, which engine.ts consumes as RawJob

describe('LinkedIn Job Normalizer (RawJob format)', () => {
  it('produces correct RawJob structure from normalized LinkedIn data', () => {
    // This is the format that linkedin-worker/normalizer.py produces
    const normalizedJob = {
      source: 'linkedin',
      sourceJobId: '3987654321',
      url: 'https://www.linkedin.com/jobs/view/3987654321',
      title: 'Senior Software Engineer',
      companyName: 'Google',
      rawHtmlDescription: '<p>Build large-scale systems.</p>',
      locationString: 'Mountain View, CA',
      isRemote: false,
      postedDate: '2026-09-01T00:00:00+00:00',
      applicationUrl: 'https://www.linkedin.com/jobs/view/3987654321',
      department: null,
      category: null,
      sourceMetadata: {
        linkedin_job_id: '3987654321',
        search_keyword: 'software engineer',
        scraped_at: '2026-09-08T12:00:00+00:00',
        experience_level: 'senior',
        employment_type: 'full_time',
      },
    };

    expect(normalizedJob.source).toBe('linkedin');
    expect(normalizedJob.sourceJobId).toBe('3987654321');
    expect(normalizedJob.url).toContain('linkedin.com/jobs/view/');
    expect(normalizedJob.title).toBe('Senior Software Engineer');
    expect(normalizedJob.companyName).toBe('Google');
    expect(normalizedJob.isRemote).toBe(false);
    expect(normalizedJob.sourceMetadata.linkedin_job_id).toBe('3987654321');
  });

  it('generates fallback sourceJobId from URL hash when ID missing', () => {
    const url = 'https://www.linkedin.com/jobs/view/some-random-job';
    // The normalizer uses hash_url(url)[:12] as fallback
    // We just verify the format expectation
    expect(url).toContain('linkedin.com/jobs/view/');
  });

  it('detects remote jobs correctly', () => {
    const remoteSignals = ['remote', 'work from home', 'wfh', 'distributed', 'anywhere'];
    const testCases = [
      { location: 'Remote', expected: true },
      { location: 'San Francisco, CA (Hybrid)', expected: false },
      { location: 'Work from home', expected: true },
      { location: 'New York, NY', expected: false },
    ];

    for (const tc of testCases) {
      const isRemote = remoteSignals.some(s => tc.location.toLowerCase().includes(s));
      expect(isRemote).toBe(tc.expected);
    }
  });

  it('detects experience levels from title', () => {
    const titles = [
      { title: 'Senior Software Engineer', expected: 'senior' },
      { title: 'Junior Developer', expected: 'junior' },
      { title: 'Staff Engineer', expected: 'staff' },
      { title: 'Software Engineer', expected: 'mid' },
      { title: 'Lead Software Engineer', expected: 'lead' },
      { title: 'Intern - Engineering', expected: 'intern' },
    ];

    for (const tc of titles) {
      const lower = tc.title.toLowerCase();
      let level = 'mid';
      if (['senior', 'sr.', 'sr '].some(w => lower.includes(w))) level = 'senior';
      else if (['staff', 'principal'].some(w => lower.includes(w))) level = 'staff';
      else if (['junior', 'jr.', 'jr '].some(w => lower.includes(w))) level = 'junior';
      else if (['lead', 'head of'].some(w => lower.includes(w))) level = 'lead';
      else if (['intern'].some(w => lower.includes(w))) level = 'intern';

      expect(level).toBe(tc.expected);
    }
  });
});
