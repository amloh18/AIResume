// @ts-nocheck
/**
 * Polar Plan Mapping Diagnostic Endpoint
 * GET /api/debug/polar-plan-mapping
 * 
 * Checks whether all Polar products/prices are correctly mapped to PricingPlan documents.
 * This is the first thing to run when subscriptions aren't being detected.
 * 
 * ⚠️ Protected: Only accessible to admin users.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getPolar } from '@/lib/payment/polar';
import { getAdminPricingPlan } from '@/models/admin-models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const { User } = await import('@/models');
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const polar = getPolar();
    if (!polar) {
      return NextResponse.json({ error: 'Polar not configured (POLAR_ACCESS_TOKEN missing)' }, { status: 503 });
    }

    // --- 1. Fetch all Polar products and prices ---
    const polarProducts: any[] = [];
    try {
      const paginator = await polar.products.list({ limit: 100 });
      if (paginator && typeof paginator[Symbol.asyncIterator] === 'function') {
        for await (const page of paginator) {
          const items = page?.result?.items || page?.items || (Array.isArray(page) ? page : []);
          polarProducts.push(...items);
        }
      } else {
        const items = (paginator as any)?.items || (paginator as any)?.result?.items || [];
        polarProducts.push(...items);
      }
    } catch (err) {
      return NextResponse.json({ error: `Failed to fetch Polar products: ${err}` }, { status: 500 });
    }

    // --- 2. Fetch all PricingPlan documents ---
    const PricingPlan = await getAdminPricingPlan();
    const plans = await PricingPlan.find({}).lean();

    // Build lookup maps from plans
    const productIdMap = new Map<string, any>();
    const priceIdMap = new Map<string, any>();
    for (const plan of plans) {
      const p = plan as any;
      if (p.polarProductId_monthly) productIdMap.set(p.polarProductId_monthly, plan);
      if (p.polarProductId_yearly) productIdMap.set(p.polarProductId_yearly, plan);
      if (p.polarProductId_quarterly) productIdMap.set(p.polarProductId_quarterly, plan);
      if (p.polarProductId_one_time) productIdMap.set(p.polarProductId_one_time, plan);
      if (p.polarPriceId_monthly) priceIdMap.set(p.polarPriceId_monthly, plan);
      if (p.polarPriceId_yearly) priceIdMap.set(p.polarPriceId_yearly, plan);
      if (p.polarPriceId_quarterly) priceIdMap.set(p.polarPriceId_quarterly, plan);
      if (p.polarPriceId_one_time) priceIdMap.set(p.polarPriceId_one_time, plan);
      for (const rp of (p.regionalPricing || [])) {
        if (rp.polarProductId) productIdMap.set(rp.polarProductId, plan);
        if (rp.polarPriceId) priceIdMap.set(rp.polarPriceId, plan);
      }
    }

    // --- 3. For each Polar product, check mapping ---
    const results = polarProducts.map((product: any) => {
      const productMapped = productIdMap.has(product.id);
      const prices = product.prices || [];
      const priceResults = prices.map((price: any) => ({
        priceId: price.id,
        amount: price.priceAmount,
        currency: price.priceCurrency,
        recurringInterval: price.recurringInterval,
        mapped: priceIdMap.has(price.id),
        mappedPlanKey: priceIdMap.get(price.id)?.key || null,
      }));

      return {
        productId: product.id,
        productName: product.name,
        isArchived: product.isArchived,
        productMapped,
        mappedPlanKey: productIdMap.get(product.id)?.key || null,
        prices: priceResults,
        anyPriceMapped: priceResults.some(p => p.mapped),
      };
    });

    const unmapped = results.filter(r => !r.productMapped && !r.anyPriceMapped && !r.isArchived);

    // --- 4. Show PricingPlan documents and their configured IDs ---
    const planSummary = plans.map((p: any) => ({
      key: p.key,
      name: p.name,
      polarProductId_monthly: p.polarProductId_monthly || null,
      polarProductId_yearly: p.polarProductId_yearly || null,
      polarProductId_quarterly: p.polarProductId_quarterly || null,
      polarPriceId_monthly: p.polarPriceId_monthly || null,
      polarPriceId_yearly: p.polarPriceId_yearly || null,
      polarPriceId_quarterly: p.polarPriceId_quarterly || null,
      regionalPricingCount: (p.regionalPricing || []).length,
    }));

    return NextResponse.json({
      summary: {
        totalPolarProducts: polarProducts.length,
        totalPricingPlans: plans.length,
        unmappedProducts: unmapped.length,
        status: unmapped.length === 0 ? '✅ All products mapped' : `⚠️ ${unmapped.length} UNMAPPED Polar product(s) found`,
      },
      polarProducts: results,
      pricingPlanIds: planSummary,
      unmappedProducts: unmapped,
      instructions: unmapped.length > 0
        ? 'Fix by setting the polarProductId_* or polarPriceId_* fields on the corresponding PricingPlan documents in MongoDB. The unmapped product IDs are shown above.'
        : 'All mappings look correct.'
    });
  } catch (error: any) {
    console.error('[POLAR DEBUG] Plan mapping check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
