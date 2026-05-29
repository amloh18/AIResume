import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, CV, CoverLetter, JobApplication, ApplicationJourney, ActivityLog, SupportNote } from '@/models';
import { requireAdmin } from '@/lib/middleware/admin-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    await requireAdmin(request);

    const { id } = await params;
    await getConnection();

    // Find user
    const user = await User.findById(id).lean() as any;
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();

    // 1. Basic Metrics & LTV
    const Invoice = (await import('@/models/Invoice')).default;
    const [cvs, coverLetters, jobs, journeys, supportNotes, totalLogs, invoices] = await Promise.all([
      CV.find({ userId: user._id }).sort({ updatedAt: -1 }).lean(),
      CoverLetter.find({ userId: user._id }).sort({ updatedAt: -1 }).lean(),
      JobApplication.countDocuments({ userId: user._id }),
      ApplicationJourney.find({ userId }).lean(),
      SupportNote.find({ userId: user._id }).sort({ timestamp: -1 }).lean(),
      ActivityLog.countDocuments({ userId: user._id }),
      Invoice.find({ userId: user._id, status: 'paid' }).lean()
    ]);

    const lifetimeValue = invoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

    const masterCV = cvs.find(cv => cv.metadata?.isMaster);
    const tailoredCVsCount = cvs.length - (masterCV ? 1 : 0);

    // 2. Journey Pipeline Overview
    const pipeline = {
      applied: journeys.filter(j => j.status === 'applied').length,
      screening: journeys.filter(j => j.status === 'screening').length,
      interview: journeys.filter(j => j.status === 'interview').length,
      offers: journeys.filter(j => j.status === 'offer').length,
      rejected: journeys.filter(j => j.status === 'rejected').length,
      total: journeys.length
    };

    // 3. AI Usage & Time in App
    const logs = await ActivityLog.find({ userId: user._id }).sort({ timestamp: 1 }).lean();
    const aiActionsCount = logs.filter(l => l.logType === 'ai').length;
    
    let estimatedSessionTime = 0;
    if (logs.length > 0) {
      let currentSessionStart = new Date(logs[0].timestamp).getTime();
      let lastLogTime = currentSessionStart;
      const SESSION_TIMEOUT = 30 * 60 * 1000;

      for (let i = 1; i < logs.length; i++) {
        const currentLogTime = new Date(logs[i].timestamp).getTime();
        const timeDiff = currentLogTime - lastLogTime;
        if (timeDiff > SESSION_TIMEOUT) {
          estimatedSessionTime += Math.max(lastLogTime - currentSessionStart, 60000);
          currentSessionStart = currentLogTime;
        }
        lastLogTime = currentLogTime;
      }
      estimatedSessionTime += Math.max(lastLogTime - currentSessionStart, 60000);
      estimatedSessionTime = Math.round(estimatedSessionTime / (1000 * 60));
    }

    // 4. Feature Usage (Activity Distribution)
    const featureUsage = {
      cvEditor: logs.filter(l => l.resource?.type === 'cv' && l.action === 'updated').length,
      atsScan: logs.filter(l => l.action === 'ats_check').length,
      coverLetters: logs.filter(l => l.resource?.type === 'cover_letter').length,
      interviewCoach: logs.filter(l => l.endpoint?.includes('interview')).length,
      autoApply: logs.filter(l => l.endpoint?.includes('auto-apply')).length
    };
    
    // Normalize to 0-100% based on max usage
    const maxUsage = Math.max(...Object.values(featureUsage), 1);
    const featureUsagePercent = Object.fromEntries(
      Object.entries(featureUsage).map(([k, v]) => [k, Math.round((v / maxUsage) * 100)])
    );

    // 5. Recent Activity Feed
    const recentActivity = logs.slice(-10).reverse().map(l => ({
      action: l.action,
      resourceType: l.resource?.type,
      resourceName: l.resource?.name,
      timestamp: l.timestamp,
      ip: l.ipAddress
    }));

    // Get latest IP from logs
    const latestLogWithIp = [...logs].reverse().find(l => l.ipAddress);
    const ipAddress = latestLogWithIp?.ipAddress || 'unknown';

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          registrationDate: user.createdAt,
          lastActive: user.lastLogin || user.updatedAt,
          ipAddress: ipAddress
        },
        metrics: {
          healthScore: masterCV?.metadata?.analysisSnapshot?.healthIndex || 68,
          analysisSnapshot: masterCV?.metadata?.analysisSnapshot,
          masterCV: {
            exists: !!masterCV,
            atsScore: masterCV?.metadata?.atsScore || 0,
            lastUpdated: masterCV?.updatedAt
          },
          cvs: {
            total: cvs.length,
            master: masterCV ? 1 : 0,
            tailored: tailoredCVsCount
          },
          coverLetters: {
            total: coverLetters.length,
            lastCreated: coverLetters[0]?.createdAt
          },
          jobs: {
            total: jobs,
            active: journeys.filter(j => !['rejected', 'offer', 'ghosted'].includes(j.status)).length
          },
          documents: {
            total: cvs.length + coverLetters.length + jobs,
            storageUsed: user.subscription?.storageUsed || 0
          },
          journeys: journeys.length,
          timeInApp: estimatedSessionTime,
          aiApplications: aiActionsCount,
          autoApplyEnabled: user.onboarding?.dashboard_layout_type === 'auto_apply',
          subscription: user.subscription,
          lifetimeValue: lifetimeValue
        },
        pipeline,
        featureUsage: featureUsagePercent,
        recentActivity,
        supportNotes
      }
    });

  } catch (error: any) {
    console.error('❌ Get user activity error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to get user activity' }, { status: 500 });
  }
}
