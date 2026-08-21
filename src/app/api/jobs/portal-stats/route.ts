import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

interface PortalStat {
  portal: string;
  jobsDiscovered: number;
  applications: number;
}

/**
 * GET /api/jobs/portal-stats
 * Returns real per-portal counts for Jobs Discovered and Applications.
 * Groups the `jobs` collection by atsType and matches against `job_applications`
 * by company+title to count applications per portal.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const userId = auth?.userId;

    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    // Count jobs per atsType (all discovered jobs, not user-specific)
    const jobsCollection = db.collection('jobs');
    const jobsByAtsType = await jobsCollection.aggregate([
      { $group: { _id: '$atsType', count: { $sum: 1 } } },
    ]).toArray();

    const jobsCountMap = new Map<string, number>();
    for (const row of jobsByAtsType) {
      jobsCountMap.set(row._id || 'unknown', row.count);
    }

    // Count applications per portal by joining with jobs on company+title
    const appsCollection = db.collection('job_applications');
    const appsCountMap = new Map<string, number>();

    if (userId) {
      // Get all applications for this user
      const apps = await appsCollection
        .find({ userId: new ObjectId(userId) }, { projection: { company: 1, jobTitle: 1 } })
        .toArray();

      if (apps.length > 0) {
        // Get all jobs to build a company+title -> atsType lookup
        const allJobs = await jobsCollection
          .find({}, { projection: { company: 1, title: 1, atsType: 1 } })
          .toArray();

        const jobAtsMap = new Map<string, string>();
        for (const job of allJobs) {
          const key = `${(job.company || '').toLowerCase()}|${(job.title || '').toLowerCase()}`;
          jobAtsMap.set(key, job.atsType || 'unknown');
        }

        for (const app of apps) {
          const key = `${(app.company || '').toLowerCase()}|${(app.jobTitle || '').toLowerCase()}`;
          const atsType = jobAtsMap.get(key) || 'unknown';
          appsCountMap.set(atsType, (appsCountMap.get(atsType) || 0) + 1);
        }
      }
    }

    // Build response for all known portals
    const portals = ['greenhouse', 'naukri', 'indeed', 'adzuna', 'lever', 'ashby', 'workable'];
    const stats: PortalStat[] = portals.map((portal) => ({
      portal,
      jobsDiscovered: jobsCountMap.get(portal) || 0,
      applications: appsCountMap.get(portal) || 0,
    }));

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('[API] GET /api/jobs/portal-stats error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to fetch portal stats' } },
      { status: 500 }
    );
  }
}
