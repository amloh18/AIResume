import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { getAllCountryPricing } from '@/lib/services/countryPricingService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing-regions
 *
 * Returns the list of country codes that have regional pricing configured,
 * for the admin campaign region filter.
 *
 * The caller (`CampaignFilters`) previously hit this path, which did not exist,
 * and so always fell back to a hardcoded `['US','GB','IN','CA','AU','EU','SG']`
 * list — a stale duplicate of configuration that actually lives in the DB, and
 * one that includes 'EU' (a bloc, not a country). Reads go through
 * `getAllCountryPricing()` so there is a single source of truth.
 */
export const GET = withAdminAuth(async () => {
  try {
    await getConnection();

    const countries = await getAllCountryPricing();

    const regions = Array.from(
      new Set(
        (countries || [])
          .map((c) => c?.countryCode)
          .filter((code): code is string => typeof code === 'string' && code.length > 0)
      )
    ).sort();

    if (regions.length === 0) {
      // Nothing configured yet. Report failure rather than `success: true` with
      // an empty array — the caller treats a present `regions` array as
      // authoritative (an empty array is truthy) and would render a region
      // filter with no options. `success: false` keeps its built-in fallback.
      return NextResponse.json({
        success: false,
        error: 'No regional pricing configured',
      });
    }

    return NextResponse.json({ success: true, regions });
  } catch (error: any) {
    console.error('Error fetching pricing regions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing regions' },
      { status: 500 }
    );
  }
});
