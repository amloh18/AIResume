import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import PriceRegion from '@/models/PriceRegion';
import CountryMapping from '@/models/CountryMapping';

/**
 * GET /api/admin/pricing-regions
 * Get all price regions and country mappings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check
    // if (!isAdmin(session.user.email)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    await getConnection();

    const [priceRegions, countryMappings] = await Promise.all([
      PriceRegion.find({}).sort({ currency: 1, regionId: 1 }),
      CountryMapping.find({}).sort({ countryCode: 1 }),
    ]);

    return NextResponse.json({
      success: true,
      priceRegions,
      countryMappings,
    });
  } catch (error) {
    console.error('Error fetching pricing regions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing regions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pricing-regions
 * Create or update a price region
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check

    await getConnection();

    const body = await request.json();
    const { regionId, isDefault, currency, currencySymbol, plans } = body;

    if (!regionId || !currency || !currencySymbol || !plans) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await PriceRegion.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const priceRegion = await PriceRegion.findOneAndUpdate(
      { regionId },
      {
        regionId,
        isDefault: isDefault || false,
        currency,
        currencySymbol,
        plans: {
          dayPass: plans.dayPass,
          monthly: plans.monthly,
          quarterly: plans.quarterly,
          yearly: plans.yearly,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      priceRegion,
    });
  } catch (error) {
    console.error('Error creating/updating price region:', error);
    return NextResponse.json(
      { error: 'Failed to create/update price region' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/pricing-regions
 * Update a price region
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check

    await getConnection();

    const body = await request.json();
    const { regionId, isDefault, currency, currencySymbol, plans } = body;

    if (!regionId) {
      return NextResponse.json(
        { error: 'Region ID is required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await PriceRegion.updateMany(
        { isDefault: true, regionId: { $ne: regionId } },
        { $set: { isDefault: false } }
      );
    }

    const updateData: any = {};
    if (currency !== undefined) updateData.currency = currency;
    if (currencySymbol !== undefined) updateData.currencySymbol = currencySymbol;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (plans) {
      updateData.plans = {
        dayPass: plans.dayPass,
        monthly: plans.monthly,
        quarterly: plans.quarterly,
        yearly: plans.yearly,
      };
    }

    const priceRegion = await PriceRegion.findOneAndUpdate(
      { regionId },
      { $set: updateData },
      { new: true }
    );

    if (!priceRegion) {
      return NextResponse.json(
        { error: 'Price region not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      priceRegion,
    });
  } catch (error) {
    console.error('Error updating price region:', error);
    return NextResponse.json(
      { error: 'Failed to update price region' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/pricing-regions
 * Delete a price region
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check

    await getConnection();

    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    if (!regionId) {
      return NextResponse.json(
        { error: 'Region ID is required' },
        { status: 400 }
      );
    }

    // Check if region is default
    const region = await PriceRegion.findOne({ regionId });
    if (region?.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default region' },
        { status: 400 }
      );
    }

    // Check if any country mappings use this region
    const mappingsCount = await CountryMapping.countDocuments({ regionId });
    if (mappingsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete region: ${mappingsCount} country mapping(s) still reference it` },
        { status: 400 }
      );
    }

    await PriceRegion.deleteOne({ regionId });

    return NextResponse.json({
      success: true,
      message: 'Price region deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting price region:', error);
    return NextResponse.json(
      { error: 'Failed to delete price region' },
      { status: 500 }
    );
  }
}

