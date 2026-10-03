import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import stateRecoveryService from '@/lib/services/stateRecoveryService';

/**
 * State Recovery Cron Route
 *
 * This route should be called periodically (e.g., daily) to check and repair
 * inconsistent state in the database.
 *
 * Authentication: `Authorization: Bearer <CRON_SECRET>` (or `CRON_API_KEY`), checked by the shared
 * fail-closed, constant-time guard. The hand-rolled `token !== expectedSecret` compare this used to
 * do was both timing-sensitive and inconsistent with every other cron route.
 *
 * Usage:
 *   GET /api/cron/state-recovery
 *   Authorization: Bearer ${CRON_SECRET}
 */

export async function GET(request: NextRequest) {
  // Overlap guard: recovery must not run two repairs against the same document concurrently.
  return runCron('state-recovery', request, async () => {
    try {
      log.info('🔄 Starting state recovery check...');

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
        log.error(`⚠️ Found ${criticalIssues.length} critical issues requiring immediate attention`);
        criticalIssues.forEach(issue => {
          log.error(`  - ${issue.description}`);
        });
      }

      // Log high severity issues
      const highIssues = result.issues.filter(i => i.severity === 'high');
      if (highIssues.length > 0) {
        log.warn(`⚠️ Found ${highIssues.length} high severity issues`);
      }

      log.info(`✅ State recovery completed: ${result.issuesFound} issues found, ${result.issuesFixed} fixed`);

      return NextResponse.json(response, { status: 200 });

    } catch (error: any) {
      log.error('❌ State recovery error:', error);
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
  });
}

/**
 * POST endpoint for manual trigger (same as GET)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

