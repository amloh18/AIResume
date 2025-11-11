import { NextRequest } from 'next/server';
import { getConnection } from '@/lib/database/connection-manager';
import CountryMapping from '@/models/CountryMapping';
import PriceRegion from '@/models/PriceRegion';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import { withErrorHandling, successResponse, errorResponse } from '@/lib/validation/api-validator';
import { withValidation } from '@/lib/validation/api-validator';
import { createCountryMappingSchema, deleteCountryMappingSchema } from '@/lib/validation/schemas';
import { validateQuery } from '@/lib/validation/api-validator';
import { z } from 'zod';

/**
 * GET /api/admin/country-mappings
 * Get all country mappings
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
    await getConnection();

    const countryMappings = await CountryMapping.find({}).sort({ countryCode: 1 });

  return successResponse({ countryMappings });
});

/**
 * POST /api/admin/country-mappings
 * Create or update a country mapping
 * Requires admin authentication
 */
export const POST = withAdminAuth(
  withValidation(createCountryMappingSchema, async (request, validatedData) => {
    await getConnection();

    const { countryCode, regionId } = validatedData;

    // Verify region exists
    const region = await PriceRegion.findOne({ regionId });
    if (!region) {
      return errorResponse('NOT_FOUND', 'Price region not found', undefined, 404);
    }

    const countryMapping = await CountryMapping.findOneAndUpdate(
      { countryCode: countryCode.toUpperCase() },
      { countryCode: countryCode.toUpperCase(), regionId },
      { upsert: true, new: true }
    );

    return successResponse({ countryMapping });
  }) as (request: NextRequest) => Promise<NextResponse>
);

/**
 * DELETE /api/admin/country-mappings
 * Delete a country mapping
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
    await getConnection();

    const { searchParams } = new URL(request.url);
  const countryCodeParam = searchParams.get('countryCode');

  if (!countryCodeParam) {
    return errorResponse('VALIDATION_ERROR', 'Country code is required', undefined, 400);
  }

  // Validate country code format
  const deleteSchema = z.object({
    countryCode: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
  });

  try {
    const { countryCode } = deleteSchema.parse({ countryCode: countryCodeParam });
    await CountryMapping.deleteOne({ countryCode: countryCode.toUpperCase() });

    return successResponse({ message: 'Country mapping deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid country code format', undefined, 400);
  }
    throw error;
  }
});
