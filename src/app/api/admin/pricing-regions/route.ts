import { NextRequest } from 'next/server';
import { getConnection } from '@/lib/database/connection-manager';
import PriceRegion from '@/models/PriceRegion';
import CountryMapping from '@/models/CountryMapping';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { withErrorHandling, successResponse, errorResponse } from '@/lib/validation/api-validator';
import { withValidation } from '@/lib/validation/api-validator';
import {
  createPriceRegionSchema,
  updatePriceRegionSchema,
  deletePriceRegionSchema,
} from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * GET /api/admin/pricing-regions
 * Get all price regions and country mappings
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
    await getConnection();

    const [priceRegions, countryMappings] = await Promise.all([
      PriceRegion.find({}).sort({ currency: 1, regionId: 1 }),
      CountryMapping.find({}).sort({ countryCode: 1 }),
    ]);

  return successResponse({ priceRegions, countryMappings });
});

/**
 * POST /api/admin/pricing-regions
 * Create or update a price region
 * Requires admin authentication
 */
export const POST = withAdminAuth(
  withValidation(createPriceRegionSchema, async (request, validatedData) => {
    await getConnection();

    const { regionId, isDefault, currency, currencySymbol, plans } = validatedData;

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

    return successResponse({ priceRegion });
  }) as (request: NextRequest) => Promise<NextResponse>
);

/**
 * PUT /api/admin/pricing-regions
 * Update a price region
 * Requires admin authentication
 */
export const PUT = withAdminAuth(
  withValidation(updatePriceRegionSchema, async (request, validatedData) => {
    await getConnection();

    const { regionId, isDefault, currency, currencySymbol, plans } = validatedData;

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
      return errorResponse('NOT_FOUND', 'Price region not found', undefined, 404);
    }

    return successResponse({ priceRegion });
  }) as (request: NextRequest) => Promise<NextResponse>
);

/**
 * DELETE /api/admin/pricing-regions
 * Delete a price region
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
    await getConnection();

    const { searchParams } = new URL(request.url);
  const regionIdParam = searchParams.get('regionId');

  if (!regionIdParam) {
    return errorResponse('VALIDATION_ERROR', 'Region ID is required', undefined, 400);
    }

  // Validate region ID
  const deleteSchema = z.object({
    regionId: z.string().min(1, 'Region ID is required'),
  });

  try {
    const { regionId } = deleteSchema.parse({ regionId: regionIdParam });

    // Check if region is default
    const region = await PriceRegion.findOne({ regionId });
    if (region?.isDefault) {
      return errorResponse('VALIDATION_ERROR', 'Cannot delete default region', undefined, 400);
    }

    // Check if any country mappings use this region
    const mappingsCount = await CountryMapping.countDocuments({ regionId });
    if (mappingsCount > 0) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Cannot delete region: ${mappingsCount} country mapping(s) still reference it`,
        undefined,
        400
      );
    }

    await PriceRegion.deleteOne({ regionId });

    return successResponse({ message: 'Price region deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid region ID format', undefined, 400);
  }
    throw error;
  }
});
