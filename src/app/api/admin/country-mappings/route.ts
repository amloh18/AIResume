import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import CountryMapping from '@/models/CountryMapping';
import PriceRegion from '@/models/PriceRegion';

/**
 * GET /api/admin/country-mappings
 * Get all country mappings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check

    await getConnection();

    const countryMappings = await CountryMapping.find({}).sort({ countryCode: 1 });

    return NextResponse.json({
      success: true,
      countryMappings,
    });
  } catch (error) {
    console.error('Error fetching country mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch country mappings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/country-mappings
 * Create or update a country mapping
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
    const { countryCode, regionId } = body;

    if (!countryCode || !regionId) {
      return NextResponse.json(
        { error: 'Country code and region ID are required' },
        { status: 400 }
      );
    }

    // Verify region exists
    const region = await PriceRegion.findOne({ regionId });
    if (!region) {
      return NextResponse.json(
        { error: 'Price region not found' },
        { status: 404 }
      );
    }

    const countryMapping = await CountryMapping.findOneAndUpdate(
      { countryCode: countryCode.toUpperCase() },
      { countryCode: countryCode.toUpperCase(), regionId },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      countryMapping,
    });
  } catch (error) {
    console.error('Error creating/updating country mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create/update country mapping' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/country-mappings
 * Delete a country mapping
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
    const countryCode = searchParams.get('countryCode');

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      );
    }

    await CountryMapping.deleteOne({ countryCode: countryCode.toUpperCase() });

    return NextResponse.json({
      success: true,
      message: 'Country mapping deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting country mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete country mapping' },
      { status: 500 }
    );
  }
}

