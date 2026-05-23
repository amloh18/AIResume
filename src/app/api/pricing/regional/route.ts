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
      let countryPricing = await getCountryPricing(targetCountryCode);
      
      // Fallback if not found
      if (!countryPricing) {
        countryPricing = await getCountryPricing('US');
      }
      
      if (countryPricing) {
        const currency = countryPricing.currency;
        const currencySymbol = countryPricing.currencySymbol;
        const isUSD = currency === 'USD';

        const baseUSDPrice = {
          monthly: 12.99,
          quarterly: 34.99,
          yearly: 99.00,
          lifetime: 199.00
        };

        let monthlyVal = baseUSDPrice.monthly;
        let quarterlyVal = baseUSDPrice.quarterly;
        let yearlyVal = baseUSDPrice.yearly;
        let lifetimeVal = baseUSDPrice.lifetime;

        if (!isUSD) {
          const { LocationService } = await import('@/lib/payment/locationService');
          monthlyVal = Math.round(LocationService.convertPrice(baseUSDPrice.monthly, 'USD', currency).convertedPrice);
          quarterlyVal = Math.round(LocationService.convertPrice(baseUSDPrice.quarterly, 'USD', currency).convertedPrice);
          yearlyVal = Math.round(LocationService.convertPrice(baseUSDPrice.yearly, 'USD', currency).convertedPrice);
          lifetimeVal = Math.round(LocationService.convertPrice(baseUSDPrice.lifetime, 'USD', currency).convertedPrice);
        }

        pricingData = {
          currency: currency,
          currencySymbol: currencySymbol,
          monthly: isUSD ? `${currencySymbol}${monthlyVal.toFixed(2)}` : `${currencySymbol}${monthlyVal}`,
          quarterly: isUSD ? `${currencySymbol}${quarterlyVal.toFixed(2)}` : `${currencySymbol}${quarterlyVal}`,
          yearly: isUSD ? `${currencySymbol}${yearlyVal.toFixed(2)}` : `${currencySymbol}${yearlyVal >= 1000 ? yearlyVal.toLocaleString() : yearlyVal}`,
          lifetime: isUSD ? `${currencySymbol}${lifetimeVal.toFixed(2)}` : `${currencySymbol}${lifetimeVal >= 1000 ? lifetimeVal.toLocaleString() : lifetimeVal}`,
          // Include additional data for new structure
          countryCode: countryPricing.countryCode,
          countryName: countryPricing.countryName,
          regionId: countryPricing.regionId,
          planPrices: {
            free: { price: 0, planId: countryPricing.planPrices?.free?.planId?.toString() || '' },
            monthly: { price: monthlyVal, planId: countryPricing.planPrices?.monthly?.planId?.toString() || '' },
            quarterly: { price: quarterlyVal, planId: countryPricing.planPrices?.quarterly?.planId?.toString() || '' },
            yearly: { price: yearlyVal, planId: countryPricing.planPrices?.yearly?.planId?.toString() || '' },
            lifetime: { price: lifetimeVal, planId: countryPricing.planPrices?.lifetime?.planId?.toString() || '' }
          }
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
    const responseData: any = {
      success: true,
      pricing: {
        currency: pricingData.currency,
        currencySymbol: pricingData.currencySymbol,
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
        lifetime: typeof pricingData.lifetime === 'string' 
          ? pricingData.lifetime 
          : `${pricingData.currencySymbol}${pricingData.lifetime >= 1000 
            ? pricingData.lifetime.toLocaleString() 
            : pricingData.lifetime}`,
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
        monthly: pricingData.planPrices.monthly.price,
        quarterly: pricingData.planPrices.quarterly.price,
        yearly: pricingData.planPrices.yearly.price,
        lifetime: pricingData.planPrices.lifetime.price
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

