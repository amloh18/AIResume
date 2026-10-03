import { NextRequest } from 'next/server';
import { getConnection } from '@/lib/database/connection-manager';
import CountryPricing from '@/models/CountryPricing';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { successResponse, errorResponse } from '@/lib/validation/api-validator';
import { z } from 'zod';

/**
 * GET /api/admin/country-pricing
 * Get all country pricing records
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  await getConnection();

  const countryPricing = await CountryPricing.find({}).sort({ countryCode: 1 }).lean();

  return successResponse({ countryPricing });
});

/**
 * POST /api/admin/country-pricing
 * Create or update a country pricing record
 * Requires admin authentication
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  await getConnection();

  const body = await request.json();
  const {
    countryCode,
    countryName,
    currency,
    currencySymbol,
    regionId,
    planPrices,
    polarPriceIds,
  } = body;

  if (!countryCode || !countryName || !currency || !currencySymbol || !regionId || !planPrices) {
    return errorResponse('VALIDATION_ERROR', 'Missing required fields', undefined, 400);
  }

  // Validate planPrices structure
  const requiredPlans = ['free', 'monthly', 'quarterly', 'yearly', 'lifetime'];
  for (const planKey of requiredPlans) {
    if (!planPrices[planKey] || planPrices[planKey].price === undefined || !planPrices[planKey].planId) {
      return errorResponse('VALIDATION_ERROR', `Missing required plan price for ${planKey}`, undefined, 400);
    }
  }

  const countryPricing = await CountryPricing.findOneAndUpdate(
    { countryCode: countryCode.toUpperCase() },
    {
      countryCode: countryCode.toUpperCase(),
      countryName,
      currency: currency.toUpperCase(),
      currencySymbol,
      regionId,
      planPrices: {
        free: {
          price: planPrices.free.price,
          planId: planPrices.free.planId
        },
        monthly: {
          price: planPrices.monthly.price,
          planId: planPrices.monthly.planId
        },
        quarterly: {
          price: planPrices.quarterly.price,
          planId: planPrices.quarterly.planId
        },
        yearly: {
          price: planPrices.yearly.price,
          planId: planPrices.yearly.planId
        },
        lifetime: {
          price: planPrices.lifetime.price,
          planId: planPrices.lifetime.planId
        }
      },
      polarPriceIds: polarPriceIds || {}
    },
    { upsert: true, new: true }
  );

  return successResponse({ countryPricing });
});

/**
 * PUT /api/admin/country-pricing
 * Update a country pricing record
 * Requires admin authentication
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  await getConnection();

  const body = await request.json();
  const { countryCode, ...updateData } = body;

  if (!countryCode) {
    return errorResponse('VALIDATION_ERROR', 'Country code is required', undefined, 400);
  }

  const countryPricing = await CountryPricing.findOneAndUpdate(
    { countryCode: countryCode.toUpperCase() },
    { $set: updateData },
    { new: true }
  );

  if (!countryPricing) {
    return errorResponse('NOT_FOUND', 'Country pricing not found', undefined, 404);
  }

  return successResponse({ countryPricing });
});

/**
 * DELETE /api/admin/country-pricing
 * Delete a country pricing record
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  await getConnection();

  const { searchParams } = new URL(request.url);
  const countryCodeParam = searchParams.get('countryCode');

  if (!countryCodeParam) {
    return errorResponse('VALIDATION_ERROR', 'Country code is required', undefined, 400);
  }

  const deleteSchema = z.object({
    countryCode: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
  });

  try {
    const { countryCode } = deleteSchema.parse({ countryCode: countryCodeParam });
    await CountryPricing.deleteOne({ countryCode });

    return successResponse({ message: 'Country pricing deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid country code format', undefined, 400);
    }
    throw error;
  }
});




