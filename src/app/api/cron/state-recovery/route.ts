import { NextRequest, NextResponse } from 'next/server';
import stateRecoveryService from '@/lib/services/stateRecoveryService';

/**
 * State Recovery Cron Route
 * 
 * This route should be called periodically (e.g., daily) to check and repair
 * inconsistent state in the database.
 * 
 * Authentication: Requires CRON_SECRET in Authorization header
 * 
 * Usage:
 *   GET /api/cron/state-recovery
 *   Authorization: Bearer ${CRON_SECRET}
 */

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Starting state recovery check...');

    // Run state recovery
    const result = await stateRecoveryService.runRecovery();

    // Prepare response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        checked: result.checked,
        issuesFound: result.issuesFound,
        issuesFixed: result.issuesFixed,
        issuesRequiringManualIntervention: result.issuesRequiringManualIntervention,
        summary: result.summary,
        issues: result.issues.map(issue => ({
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          userId: issue.userId,
          resourceId: issue.resourceId,
          fixable: issue.fixable,
        })),
      },
    };

    // Log critical issues
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.error(`⚠️ Found ${criticalIssues.length} critical issues requiring immediate attention`);
      criticalIssues.forEach(issue => {
        console.error(`  - ${issue.description}`);
      });
    }

    // Log high severity issues
    const highIssues = result.issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      console.warn(`⚠️ Found ${highIssues.length} high severity issues`);
    }

    console.log(`✅ State recovery completed: ${result.issuesFound} issues found, ${result.issuesFixed} fixed`);

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('❌ State recovery error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run state recovery',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger (same as GET)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

