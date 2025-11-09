import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database/connection-manager';
import { getRegionalPricingFromDB, getDefaultPricingFromDB } from '@/lib/services/pricingService';

/**
 * GET /api/pricing/regional
 * Get regional pricing for a country code
 * Query params: countryCode (optional, defaults to default pricing)
 */
export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('countryCode');

    let pricingData;

    if (countryCode) {
      pricingData = await getRegionalPricingFromDB(countryCode);
      
      // Fallback to default if country not found
      if (!pricingData) {
        pricingData = await getDefaultPricingFromDB();
      }
    } else {
      // Return default pricing if no country code provided
      pricingData = await getDefaultPricingFromDB();
    }

    if (!pricingData) {
      return NextResponse.json(
        { error: 'Pricing data not found' },
        { status: 404 }
      );
    }

    // Format response to match the expected RegionalPricing interface
    // Format yearly with commas for thousands (e.g., 1999 -> "1,999")
    const formatYearly = pricingData.yearly >= 1000 
      ? pricingData.yearly.toLocaleString() 
      : pricingData.yearly.toString();
    
    return NextResponse.json({
      success: true,
      pricing: {
        currency: pricingData.currency,
        currencySymbol: pricingData.currencySymbol,
        dayPass: `${pricingData.currencySymbol}${pricingData.dayPass}`,
        monthly: `${pricingData.currencySymbol}${pricingData.monthly}`,
        quarterly: `${pricingData.currencySymbol}${pricingData.quarterly}`,
        yearly: `${pricingData.currencySymbol}${formatYearly}`,
      },
      raw: pricingData, // Also return raw numeric values for calculations
    });
  } catch (error) {
    console.error('Error fetching regional pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional pricing' },
      { status: 500 }
    );
  }
}

