/**
 * withPlanGate.ts
 * Higher-order function that wraps a Next.js API route handler with plan-based access control.
 *
 * Usage:
 *   export const POST = withPlanGate('coverLetterAI', async (req, { user, planAccess }) => {
 *     // user is already loaded, planAccess.can('coverLetterAI') is guaranteed true
 *     ...
 *   });
 *
 * Or for multiple features (user must have ALL):
 *   export const POST = withPlanGate(['interviewCoach', 'jobTracker'], handler);
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getPlanAccess, PlanAccessResult, FeatureKey } from '@/lib/utils/plan-access';

export interface PlanGateContext {
  user: any;
  planAccess: PlanAccessResult;
  session: any;
}

type GatedHandler = (
  request: NextRequest,
  context: PlanGateContext,
  routeContext?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with auth + plan-gate checks.
 * @param features - Feature or array of features required to access this route.
 * @param handler  - The actual route handler to call if access is granted.
 */
export function withPlanGate(
  features: FeatureKey | FeatureKey[],
  handler: GatedHandler
) {
  const requiredFeatures = Array.isArray(features) ? features : [features];

  return async function gatedRoute(
    request: NextRequest,
    routeContext?: any
  ): Promise<NextResponse> {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Load user
    await connectToDatabase();
    const user = await User.findById(session.user.id)
      .select('currentPlanKey subscription credits usage')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // 3. Plan access
    const planAccess = getPlanAccess(user);

    // 4. Gate each required feature
    for (const feature of requiredFeatures) {
      const denied = planAccess.gate(feature);
      if (denied) return denied;
    }

    // 5. Call the actual handler
    return handler(request, { user, planAccess, session }, routeContext);
  };
}

/**
 * Lightweight auth-only wrapper (no plan gate). Useful for routes that
 * just need auth + user object without a specific feature check.
 */
export function withAuth(handler: GatedHandler) {
  return async function authedRoute(
    request: NextRequest,
    routeContext?: any
  ): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id)
      .select('currentPlanKey subscription credits usage')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const planAccess = getPlanAccess(user);
    return handler(request, { user, planAccess, session }, routeContext);
  };
}
