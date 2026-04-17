import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyAdminAuth } from '@/lib/utils/adminAuth';
import { getConnection } from '@/lib/database';
import TaxRate from '@/models/TaxRate';

/**
 * Admin API for managing tax rates
 * CRUD operations for tax rates
 */
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await verifyAdminAuth();
    
    if (!adminAuth.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    await getConnection();

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('countryCode');
    const isActive = searchParams.get('isActive');

    const query: any = {};
    if (countryCode) {
      query.countryCode = countryCode.toUpperCase();
    }
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    const taxRates = await TaxRate.find(query).sort({ countryCode: 1, effectiveFrom: -1 }).lean();

    return NextResponse.json({
      success: true,
      taxRates: taxRates.map(tr => ({
        id: tr._id,
        countryCode: tr.countryCode,
        regionCode: tr.regionCode,
        taxType: tr.taxType,
        rate: tr.rate,
        effectiveFrom: tr.effectiveFrom,
        effectiveUntil: tr.effectiveUntil,
        isActive: tr.isActive,
        description: tr.description
      }))
    });
  } catch (error: any) {
    console.error('Error fetching tax rates:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await verifyAdminAuth();
    
    if (!adminAuth.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    await getConnection();

    const body = await request.json();
    const {
      countryCode,
      regionCode,
      taxType,
      rate,
      effectiveFrom,
      effectiveUntil,
      isActive,
      description
    } = body;

    if (!countryCode || !taxType || rate === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const taxRate = await TaxRate.create({
      countryCode: countryCode.toUpperCase(),
      regionCode: regionCode?.toUpperCase(),
      taxType,
      rate,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
      isActive: isActive !== undefined ? isActive : true,
      description
    });

    return NextResponse.json({
      success: true,
      taxRate: {
        id: taxRate._id,
        countryCode: taxRate.countryCode,
        regionCode: taxRate.regionCode,
        taxType: taxRate.taxType,
        rate: taxRate.rate,
        effectiveFrom: taxRate.effectiveFrom,
        effectiveUntil: taxRate.effectiveUntil,
        isActive: taxRate.isActive,
        description: taxRate.description
      }
    });
  } catch (error: any) {
    console.error('Error creating tax rate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

