import { Db } from 'mongodb';

export interface CompanyHiringVelocity {
  companyName: string;
  normalizedName: string;
  activeOpenings: number;
  newOpeningsPast7Days: number;
  topRoles: string[];
  hiringMomentum: 'accelerating' | 'stable' | 'slow';
}

export async function getCompanyHiringVelocity(
  db: Db,
  companyName: string
): Promise<CompanyHiringVelocity> {
  const jobsColl = db.collection('jobs');
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeJobs = await jobsColl
    .find({
      status: 'active',
      'company.name': { $regex: companyName, $options: 'i' },
    })
    .toArray();

  const newJobs = activeJobs.filter((j) => j.createdAt >= sevenDaysAgo);

  const roleCounts: Record<string, number> = {};
  for (const job of activeJobs) {
    const title = job.title || 'Other';
    roleCounts[title] = (roleCounts[title] || 0) + 1;
  }

  const sortedRoles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title]) => title);

  const momentum =
    newJobs.length >= 5 ? 'accelerating' : activeJobs.length >= 2 ? 'stable' : 'slow';

  return {
    companyName,
    normalizedName: companyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
    activeOpenings: activeJobs.length,
    newOpeningsPast7Days: newJobs.length,
    topRoles: sortedRoles,
    hiringMomentum: momentum,
  };
}
