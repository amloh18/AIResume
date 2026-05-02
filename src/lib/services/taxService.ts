// @ts-nocheck
/**
 * Tax Service
 * Handles tax rate retrieval and tax calculations
 */

import { getConnection } from '../database/connection-manager';
import TaxRate from '@/models/TaxRate';

export interface TaxCalculationResult {
  rate: number;
  amount: number;
  taxType: string;
  countryCode: string;
  regionCode?: string;
}

/**
 * Get active tax rate for a country/region
 */
export async function getTaxRate(
  countryCode: string,
  regionCode?: string
): Promise<TaxRate | null> {
  try {
    await getConnection();

    const query: any = {
      countryCode: countryCode.toUpperCase(),
      isActive: true
    };

    if (regionCode) {
      query.regionCode = regionCode.toUpperCase();
    }

    const now = new Date();
    const taxRate = await TaxRate.findOne({
      ...query,
      effectiveFrom: { $lte: now },
      $or: [
        { effectiveUntil: { $gte: now } },
        { effectiveUntil: null }
      ]
    }).sort({ effectiveFrom: -1 }); // Get most recent rate

    return taxRate;
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    return null;
  }
}

/**
 * Calculate tax amount for a given amount and country/region
 */
export async function calculateTax(
  amount: number,
  countryCode: string,
  regionCode?: string
): Promise<TaxCalculationResult | null> {
  try {
    const taxRate = await getTaxRate(countryCode, regionCode);

    if (!taxRate) {
      // No tax rate found - return zero tax
      return {
        rate: 0,
        amount: 0,
        taxType: 'None',
        countryCode: countryCode.toUpperCase(),
        regionCode: regionCode?.toUpperCase()
      };
    }

    const taxAmount = (amount * taxRate.rate) / 100;

    return {
      rate: taxRate.rate,
      amount: taxAmount,
      taxType: taxRate.taxType,
      countryCode: taxRate.countryCode,
      regionCode: taxRate.regionCode
    };
  } catch (error) {
    console.error('Error calculating tax:', error);
    return null;
  }
}

/**
 * Check if tax exemption applies (e.g., for tax ID holders)
 */
export async function isTaxExempt(
  countryCode: string,
  taxId?: string
): Promise<boolean> {
  // Basic implementation - can be enhanced with tax ID validation
  // For now, return false (no exemptions)
  // In production, you might check against a tax exemption database
  return false;
}

