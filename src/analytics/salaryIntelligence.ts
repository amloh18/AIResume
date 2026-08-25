import { Db } from 'mongodb';

export interface SalaryBenchmark {
  role: string;
  country: string;
  currency: string;
  p25: number;
  median: number;
  p75: number;
  sampleCount: number;
}

export async function computeSalaryBenchmark(
  db: Db,
  role: string,
  country = 'United Kingdom'
): Promise<SalaryBenchmark> {
  const jobsColl = db.collection('jobs');

  const jobs = await jobsColl
    .find({
      status: 'active',
      normalizedTitle: { $regex: role.toLowerCase(), $options: 'i' },
      'salary.max': { $exists: true, $ne: null, $gt: 10000 },
    })
    .project({ salary: 1 })
    .toArray();

  const salaries = jobs
    .map((j) => j.salary?.max || j.salary?.min)
    .filter((s) => typeof s === 'number' && s > 0)
    .sort((a, b) => a - b);

  if (salaries.length === 0) {
    return {
      role,
      country,
      currency: country === 'United Kingdom' ? 'GBP' : 'USD',
      p25: 65000,
      median: 85000,
      p75: 110000,
      sampleCount: 0,
    };
  }

  const p25 = salaries[Math.floor(salaries.length * 0.25)];
  const median = salaries[Math.floor(salaries.length * 0.5)];
  const p75 = salaries[Math.floor(salaries.length * 0.75)];

  return {
    role,
    country,
    currency: jobs[0]?.salary?.currency || (country === 'United Kingdom' ? 'GBP' : 'USD'),
    p25,
    median,
    p75,
    sampleCount: salaries.length,
  };
}
