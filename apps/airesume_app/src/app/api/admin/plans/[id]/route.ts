import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';
import { invalidatePricingCache } from '@/lib/services/pricingCache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PUT /api/admin/plans/[id] — update editable fields of a pricing plan.
 *
 * Only whitelisted commercial fields are writable (see EDITABLE_FIELDS). The
 * update invalidates the public pricing cache so the landing page and paywall
 * show the new values immediately.
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin(request);
    const { id } = await params;

    const { getConnection } = await import('@/lib/database');
    await getConnection();
    const { PricingPlan } = await import('@/models');

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
    }

    const updated = await PricingPlan.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Public pricing route caches responses — drop them so the edit is live.
    invalidatePricingCache();

    console.log(`[Admin Plans] ${(session.user as any)?.email} updated plan ${updated.key} (${Object.keys(updates).join(', ')})`);
    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin Plans PUT] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
