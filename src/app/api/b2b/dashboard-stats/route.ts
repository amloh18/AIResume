import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import Job from '@/models/Job';

export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden. B2B access required.' }, { status: 403 });
    }

    const tenantId = user.b2b.tenantId;
    await getConnection();

    // 1. Basic Counts
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalCandidates,
      screenedToday,
      shortlistedTotal,
      hiresTotal,
      allCandidates,
      allJobs
    ] = await Promise.all([
      B2BCandidate.countDocuments({ tenantId }),
      B2BCandidate.countDocuments({ tenantId, createdAt: { $gte: startOfToday } }),
      B2BCandidate.countDocuments({ tenantId, status: 'shortlisted' }),
      B2BCandidate.countDocuments({ tenantId, status: 'hired' }),
      B2BCandidate.find({ tenantId }).sort({ createdAt: -1 }).lean(),
      Job.find({ tenantId }).lean() // active jobs
    ]);

    // 2. Pipeline Overview
    const pipeline = {
      uploaded: totalCandidates,
      screening: allCandidates.filter(c => c.status === 'reviewed' || c.status === 'new').length,
      shortlisted: shortlistedTotal,
      interview: allCandidates.filter(c => c.metadata?.interviewGuide).length, // approximate if we don't have an interview status
      hired: hiresTotal
    };

    // 3. AI Score Distribution
    const scores = {
      excellent: 0, // 80-100
      good: 0, // 60-79
      average: 0, // 40-59
      poor: 0 // 0-39
    };

    let totalScoreShortlisted = 0;

    allCandidates.forEach(c => {
      const s = c.score || 0;
      if (s >= 80) scores.excellent++;
      else if (s >= 60) scores.good++;
      else if (s >= 40) scores.average++;
      else scores.poor++;

      if (c.status === 'shortlisted') {
        totalScoreShortlisted += s;
      }
    });

    const averageScoreShortlisted = shortlistedTotal > 0 ? Math.round(totalScoreShortlisted / shortlistedTotal) : 0;

    // 4. Skills Aggregation
    const skillCounts: Record<string, number> = {};
    allCandidates.forEach(c => {
      if (c.cvData?.skills && Array.isArray(c.cvData.skills)) {
        c.cvData.skills.forEach((group: any) => {
          if (group.keywords && Array.isArray(group.keywords)) {
            group.keywords.forEach((keyword: string) => {
              const k = keyword.trim().toLowerCase();
              skillCounts[k] = (skillCounts[k] || 0) + 1;
            });
          }
        });
      }
    });

    // Sort and get top skills
    const topSkillsArray = Object.entries(skillCounts)
      .map(([name, count]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        count, 
        percentage: totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const mostInDemandSkill = topSkillsArray.length > 0 ? topSkillsArray[0].name : 'N/A';

    // 5. Top Jobs Aggregation
    // Count candidates per job
    const jobStatsMap: Record<string, { total: number, shortlisted: number }> = {};
    allCandidates.forEach(c => {
      const jobTitle = c.metadata?.jobTitle || 'General Application';
      if (!jobStatsMap[jobTitle]) {
        jobStatsMap[jobTitle] = { total: 0, shortlisted: 0 };
      }
      jobStatsMap[jobTitle].total++;
      if (c.status === 'shortlisted') {
        jobStatsMap[jobTitle].shortlisted++;
      }
    });

    const topJobs = Object.entries(jobStatsMap)
      .map(([title, stats]) => ({
        title,
        candidateCount: stats.total,
        shortlistedCount: stats.shortlisted
      }))
      .sort((a, b) => b.candidateCount - a.candidateCount)
      .slice(0, 5);

    // 6. Recent Candidates
    const recentCandidates = allCandidates.slice(0, 5).map(c => ({
      _id: c._id,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
      email: c.email,
      jobApplied: c.metadata?.jobTitle || 'General',
      score: c.score || 0,
      match: c.score || 0, // Using score as match for now
      status: c.status,
      createdAt: c.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalCandidates,
          screenedToday,
          shortlistedTotal,
          hiresTotal
        },
        pipeline,
        scores,
        topSkills: topSkillsArray,
        topJobs,
        recentCandidates,
        insights: {
          averageScoreShortlisted,
          mostInDemandSkill
        }
      }
    });
  } catch (error: any) {
    console.error('Dashboard Stats Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
