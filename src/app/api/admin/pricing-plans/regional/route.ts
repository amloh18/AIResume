import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';

/**
 * PUT /api/admin/pricing-plans/regional
 * Update regional pricing for a specific plan
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const PricingPlan = await getAdminPricingPlan();

    const body = await request.json();
    const { planId, regionalPricing } = body;

    if (!planId || !regionalPricing) {
      return NextResponse.json(
        { error: 'Plan ID and regional pricing are required' },
        { status: 400 }
      );
    }

    // Validate regional pricing structure
    if (!Array.isArray(regionalPricing)) {
      return NextResponse.json(
        { error: 'Regional pricing must be an array' },
        { status: 400 }
      );
    }

    // Update the plan with regional pricing
    const updatedPlan = await PricingPlan.findByIdAndUpdate(
      planId,
      { 
        $set: { 
            regionalPricing: regionalPricing.map((rp: any) => ({
                region: rp.region,
                currency: rp.currency,
                billingCycle: rp.billingCycle || undefined,
                price: rp.price,
                displayPrice: rp.displayPrice,
                polarPriceId: rp.polarPriceId
            }))
        } 
      },
      { new: true }
    );

    if (!updatedPlan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan
    });
  } catch (error: any) {
    console.error('Error updating regional pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update regional pricing' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pricing-plans/regional
 * Add or update a single regional pricing entry for a plan
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const PricingPlan = await getAdminPricingPlan();

    const body = await request.json();
    const { planId, region, currency, billingCycle, price, displayPrice, polarPriceId } = body;

    if (!planId || !region || !currency || price === undefined) {
      return NextResponse.json(
        { error: 'Plan ID, region, currency, and price are required' },
        { status: 400 }
      );
    }

    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Get existing regional pricing or initialize empty array
    const regionalPricing = (plan.regionalPricing || []) as any[];
    
    // Find if this region+cycle combination already exists
    const existingIndex = regionalPricing.findIndex(rp => 
      rp.region === region && 
      (billingCycle ? rp.billingCycle === billingCycle : !rp.billingCycle)
    );
    
    const newRegionalPricing = {
        region,
        currency,
        billingCycle: billingCycle || undefined,
        price,
        displayPrice: displayPrice || `${currency} ${price}`,
        polarPriceId
    };

    if (existingIndex >= 0) {
      // Update existing
      regionalPricing[existingIndex] = newRegionalPricing;
    } else {
      // Add new
      regionalPricing.push(newRegionalPricing);
    }

    // Update the plan
    plan.regionalPricing = regionalPricing;
    await plan.save();

    return NextResponse.json({
      success: true,
      plan
    });
  } catch (error: any) {
    console.error('Error adding/updating regional pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add/update regional pricing' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/pricing-plans/regional
 * Remove a regional pricing entry from a plan
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const PricingPlan = await getAdminPricingPlan();

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const region = searchParams.get('region');
    const billingCycle = searchParams.get('billingCycle');

    if (!planId || !region) {
      return NextResponse.json(
        { error: 'Plan ID and region are required' },
        { status: 400 }
      );
    }

    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Remove the regional pricing entry (specific cycle or all for region)
    const regionalPricing = (plan.regionalPricing || []) as any[];
    if (billingCycle) {
      // Remove specific cycle
      plan.regionalPricing = regionalPricing.filter(rp => 
        !(rp.region === region && rp.billingCycle === billingCycle)
      );
    } else {
      // Remove all entries for this region
      plan.regionalPricing = regionalPricing.filter(rp => rp.region !== region);
    }
    await plan.save();

    return NextResponse.json({
      success: true,
      plan
    });
  } catch (error: any) {
    console.error('Error deleting regional pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete regional pricing' },
      { status: 500 }
    );
  }
}

