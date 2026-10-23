import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { invalidatePricingCache } from '@/lib/services/pricingCache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin pricing plan management.
 *
 * Plans live in the PricingPlan collection and are read by the public
 * GET /api/pricing-plans. Edits made here invalidate that route's cache so
 * the landing page and paywall reflect changes immediately.
 *
 * GET    /api/admin/plans          → all plans (incl. inactive), raw DB docs
 * PUT    /api/admin/plans/[id]     → update editable plan fields
 * POST   /api/admin/plans          → create a plan
 */

async function loadModels() {
  const { getConnection } = await import('@/lib/database');
  await getConnection();
  const { PricingPlan } = await import('@/models');
  return PricingPlan;
}

/**
 * Editable fields. Provider price IDs (stripePriceId_*, cashfreePlanId_*, etc.)
 * are intentionally NOT editable here — they are created by the payment
 * provider sync, and letting the admin panel write them invites drift between
 * the panel and the gateway.
 */
const EDITABLE_FIELDS = [
  'name',
  'description',
  'billingCycle',
  'price_monthly',
  'price_quarterly',
  'price_yearly',
  'price_one_time',
  'promotionalPrice_monthly',
  'promotionalPrice_quarterly',
  'promotionalPrice_yearly',
  'promotionalPrice_one_time',
  'promotionValidFrom',
  'promotionValidUntil',
  'promotionDescription',
  'credits',
  'storageLimit',
  'features',
  'notIncludedFeatures',
  'status',
  'isPopular',
  'isBestValue',
  'sortOrder',
  'displayOnLanding',
  'targetAudience',
  'dayPassDuration',
  'durationInDays',
  'durationType',
] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const PricingPlan = await loadModels();

    const plans = await PricingPlan.find({}).sort({ sortOrder: 1 }).lean();
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Plans GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    const PricingPlan = await loadModels();

    const body = await request.json();
    if (!body?.key || !body?.name) {
      return NextResponse.json({ error: 'key and name are required' }, { status: 400 });
    }

    const existing = await PricingPlan.findOne({ key: body.key }).lean();
    if (existing) {
      return NextResponse.json({ error: `A plan with key "${body.key}" already exists` }, { status: 409 });
    }

    const doc: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) doc[field] = body[field];
    }
    doc.key = body.key;

    const created = await PricingPlan.create(doc);
    invalidatePricingCache();

    console.log(`[Admin Plans] ${(session.user as any)?.email} created plan ${body.key}`);
    return NextResponse.json({ success: true, plan: created }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Plans POST] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
