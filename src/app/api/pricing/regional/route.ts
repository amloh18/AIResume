// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database/connection-manager';
import { getCountryPricing } from '@/lib/services/countryPricingService';
import { createErrorResponse } from '@/lib/api/error-handler';

/**
 * GET /api/pricing/regional
 * Get regional pricing for a country code
 * Query params: countryCode (optional, defaults to default pricing)
 * 
 * IMPORTANT: This route MUST always return JSON, never HTML
 * 
 * Now uses CountryPricing collection (normalized structure)
 */
export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('countryCode');

    let pricingData;

    try {
      const targetCountryCode = countryCode || 'US'; // Default to US if no country code provided
      const countryPricing = await getCountryPricing(targetCountryCode);
      
      if (countryPricing) {
        // Convert CountryPricing to RegionalPricing format for backward compatibility
        pricingData = {
          currency: countryPricing.currency,
          currencySymbol: countryPricing.currencySymbol,
          dayPass: `${countryPricing.currencySymbol}${countryPricing.planPrices.dayPass.price}`,
          monthly: `${countryPricing.currencySymbol}${countryPricing.planPrices.monthly.price}`,
          quarterly: `${countryPricing.currencySymbol}${countryPricing.planPrices.quarterly.price}`,
          yearly: `${countryPricing.currencySymbol}${countryPricing.planPrices.yearly.price >= 1000 
            ? countryPricing.planPrices.yearly.price.toLocaleString() 
            : countryPricing.planPrices.yearly.price}`,
          // Include additional data for new structure
          countryCode: countryPricing.countryCode,
          countryName: countryPricing.countryName,
          regionId: countryPricing.regionId,
          planPrices: countryPricing.planPrices
        };
      }
    } catch (dbError) {
      console.error('Database error fetching pricing:', dbError);
      // Return JSON error, never HTML
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch pricing data from database',
          message: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      );
    }

    if (!pricingData) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Pricing data not found' 
        },
        { status: 404 }
      );
    }

    // Format response to match the expected RegionalPricing interface
    // pricingData already has formatted strings if from CountryPricing
    // or numeric values if from old service
    const responseData: any = {
      success: true,
      pricing: {
        currency: pricingData.currency,
        currencySymbol: pricingData.currencySymbol,
        dayPass: typeof pricingData.dayPass === 'string' 
          ? pricingData.dayPass 
          : `${pricingData.currencySymbol}${pricingData.dayPass}`,
        monthly: typeof pricingData.monthly === 'string' 
          ? pricingData.monthly 
          : `${pricingData.currencySymbol}${pricingData.monthly}`,
        quarterly: typeof pricingData.quarterly === 'string' 
          ? pricingData.quarterly 
          : `${pricingData.currencySymbol}${pricingData.quarterly}`,
        yearly: typeof pricingData.yearly === 'string' 
          ? pricingData.yearly 
          : `${pricingData.currencySymbol}${pricingData.yearly >= 1000 
            ? pricingData.yearly.toLocaleString() 
            : pricingData.yearly}`,
      }
    };

    // Include additional CountryPricing data if available
    if (pricingData.countryCode) {
      responseData.pricing.countryCode = pricingData.countryCode;
      responseData.pricing.countryName = pricingData.countryName;
      responseData.pricing.regionId = pricingData.regionId;
      if (pricingData.planPrices) {
        responseData.pricing.planPrices = pricingData.planPrices;
      }
    }

    // Also return raw numeric values for calculations
    if (pricingData.planPrices) {
      responseData.raw = {
        currency: pricingData.currency,
        currencySymbol: pricingData.currencySymbol,
        dayPass: pricingData.planPrices.dayPass.price,
        monthly: pricingData.planPrices.monthly.price,
        quarterly: pricingData.planPrices.quarterly.price,
        yearly: pricingData.planPrices.yearly.price
      };
    } else {
      responseData.raw = pricingData;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    // CRITICAL: Always return JSON, never let Next.js return HTML
    console.error('Error fetching regional pricing:', error);
    return createErrorResponse(error);
  }
}

