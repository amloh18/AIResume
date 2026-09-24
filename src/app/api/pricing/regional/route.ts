// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { detectUserRegion } from '@/lib/services/regionDetectionService';

/**
 * GET /api/pricing/regional?countryCode=IN
 * 
 * Returns the user's detected/requested locale info for CLIENT-SIDE display conversion.
 * Actual checkout prices are always USD — Polar handles real currency conversion at checkout.
 * 
 * This endpoint is for UX only: showing approximate local prices in the UI.
 */

// Static exchange rates vs USD (refresh periodically in a production environment)
const USD_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.00,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.50,
  CAD: 1.37,
  AUD: 1.53,
  SGD: 1.35,
  JPY: 157.00,
  CHF: 0.90,
  SEK: 10.60,
  NOK: 10.90,
  DKK: 6.95,
  PLN: 3.98,
  BRL: 5.05,
  MXN: 17.20,
  AED: 3.67,
  SAR: 3.75,
  PKR: 278.00,
  BDT: 110.00,
  NGN: 1600.00,
  ZAR: 18.90,
  KES: 129.00,
  MYR: 4.72,
  PHP: 56.50,
  THB: 36.20,
  IDR: 16200.00,
  VND: 25200.00,
  KRW: 1370.00,
  TWD: 32.30,
  HKD: 7.82,
  CNY: 7.24,
};

const COUNTRY_CURRENCY: Record<string, { currency: string; symbol: string; locale: string }> = {
  US: { currency: 'USD', symbol: '$',    locale: 'en-US' },
  GB: { currency: 'GBP', symbol: '£',    locale: 'en-GB' },
  IN: { currency: 'INR', symbol: '₹',    locale: 'en-IN' },
  CA: { currency: 'CAD', symbol: 'CA$',  locale: 'en-CA' },
  AU: { currency: 'AUD', symbol: 'A$',   locale: 'en-AU' },
  DE: { currency: 'EUR', symbol: '€',    locale: 'de-DE' },
  FR: { currency: 'EUR', symbol: '€',    locale: 'fr-FR' },
  IT: { currency: 'EUR', symbol: '€',    locale: 'it-IT' },
  ES: { currency: 'EUR', symbol: '€',    locale: 'es-ES' },
  NL: { currency: 'EUR', symbol: '€',    locale: 'nl-NL' },
  BE: { currency: 'EUR', symbol: '€',    locale: 'nl-BE' },
  AT: { currency: 'EUR', symbol: '€',    locale: 'de-AT' },
  CH: { currency: 'CHF', symbol: 'CHF',  locale: 'de-CH' },
  SE: { currency: 'SEK', symbol: 'kr',   locale: 'sv-SE' },
  NO: { currency: 'NOK', symbol: 'kr',   locale: 'nb-NO' },
  DK: { currency: 'DKK', symbol: 'kr',   locale: 'da-DK' },
  FI: { currency: 'EUR', symbol: '€',    locale: 'fi-FI' },
  PL: { currency: 'PLN', symbol: 'zł',   locale: 'pl-PL' },
  IE: { currency: 'EUR', symbol: '€',    locale: 'en-IE' },
  PT: { currency: 'EUR', symbol: '€',    locale: 'pt-PT' },
  GR: { currency: 'EUR', symbol: '€',    locale: 'el-GR' },
  SG: { currency: 'SGD', symbol: 'S$',   locale: 'en-SG' },
  JP: { currency: 'JPY', symbol: '¥',    locale: 'ja-JP' },
  KR: { currency: 'KRW', symbol: '₩',    locale: 'ko-KR' },
  MY: { currency: 'MYR', symbol: 'RM',   locale: 'ms-MY' },
  PH: { currency: 'PHP', symbol: '₱',    locale: 'en-PH' },
  TH: { currency: 'THB', symbol: '฿',    locale: 'th-TH' },
  ID: { currency: 'IDR', symbol: 'Rp',   locale: 'id-ID' },
  BR: { currency: 'BRL', symbol: 'R$',   locale: 'pt-BR' },
  MX: { currency: 'MXN', symbol: '$',    locale: 'es-MX' },
  ZA: { currency: 'ZAR', symbol: 'R',    locale: 'en-ZA' },
  PK: { currency: 'PKR', symbol: '₨',    locale: 'en-PK' },
  AE: { currency: 'AED', symbol: 'AED',  locale: 'ar-AE' },
  SA: { currency: 'SAR', symbol: 'SAR',  locale: 'ar-SA' },
  NG: { currency: 'NGN', symbol: '₦',    locale: 'en-NG' },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let countryCode = searchParams.get('countryCode')?.toUpperCase();

    // Auto-detect from IP if not provided
    if (!countryCode) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      try {
        const region = await detectUserRegion(ip);
        countryCode = region?.countryCode || 'US';
      } catch {
        countryCode = 'US';
      }
    }

    const localInfo = COUNTRY_CURRENCY[countryCode] || COUNTRY_CURRENCY['US'];
    const rate = USD_EXCHANGE_RATES[localInfo.currency] ?? 1;

    return NextResponse.json({
      success: true,
      countryCode,
      currency: localInfo.currency,
      currencySymbol: localInfo.symbol,
      locale: localInfo.locale,
      // Exchange rate vs USD — use this to convert display prices client-side
      exchangeRate: rate,
      // Note: Polar handles real conversion at checkout. These rates are for display only.
      displayOnly: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Regional pricing error:', error);
    return NextResponse.json({
      success: true,
      countryCode: 'US',
      currency: 'USD',
      currencySymbol: '$',
      locale: 'en-US',
      exchangeRate: 1,
      displayOnly: true,
    });
  }
}
