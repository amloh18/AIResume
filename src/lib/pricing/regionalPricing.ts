export interface RegionalPricing {
  country: string;
  currency: string;
  currencySymbol: string;
  dayPass: string;
  monthly: string;
  quarterly: string;
  yearly: string;
}

// Regional pricing data
export const REGIONAL_PRICING: Record<string, RegionalPricing> = {
  'GB': {
    country: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    dayPass: '£1.99',
    monthly: '£9.99',
    quarterly: '£24.99',
    yearly: '£89.99'
  },
  'US': {
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    dayPass: '$2.99',
    monthly: '$12.99',
    quarterly: '$34.99',
    yearly: '$119.99'
  },
  'CA': {
    country: 'Canada',
    currency: 'CAD',
    currencySymbol: '$',
    dayPass: '$3.49',
    monthly: '$14.99',
    quarterly: '$39.99',
    yearly: '$149.99'
  },
  'AU': {
    country: 'Australia',
    currency: 'AUD',
    currencySymbol: '$',
    dayPass: '$3.49',
    monthly: '$14.99',
    quarterly: '$39.99',
    yearly: '$149.99'
  },
  // EU countries - all use EUR pricing
  'DE': {
    country: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'FR': {
    country: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'IT': {
    country: 'Italy',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'ES': {
    country: 'Spain',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'NL': {
    country: 'Netherlands',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'BE': {
    country: 'Belgium',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'AT': {
    country: 'Austria',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'FI': {
    country: 'Finland',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'IE': {
    country: 'Ireland',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'PT': {
    country: 'Portugal',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'GR': {
    country: 'Greece',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  },
  'PL': {
    country: 'Poland',
    currency: 'PLN',
    currencySymbol: 'zł',
    dayPass: '7.99 zł',
    monthly: '39.99 zł',
    quarterly: '99.99 zł',
    yearly: '359.99 zł'
  },
  'IN': {
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    dayPass: '₹49',
    monthly: '₹199',
    quarterly: '₹549',
    yearly: '₹1,999'
  },
  'PK': {
    country: 'Pakistan',
    currency: 'PKR',
    currencySymbol: '₨',
    dayPass: '₨99',
    monthly: '₨449',
    quarterly: '₨1,199',
    yearly: '₨3,999'
  }
};

// Default pricing (GBP)
export const DEFAULT_PRICING: RegionalPricing = {
  country: 'United Kingdom',
  currency: 'GBP',
  currencySymbol: '£',
  dayPass: '£1.99',
  monthly: '£9.99',
  quarterly: '£24.99',
  yearly: '£89.99'
};

// Get pricing for a country code
export function getRegionalPricing(countryCode: string): RegionalPricing {
  return REGIONAL_PRICING[countryCode] || DEFAULT_PRICING;
}

// Check if country is in EU
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

export function isEUCountry(countryCode: string): boolean {
  return EU_COUNTRIES.includes(countryCode);
}

// Get pricing for EU countries (use EUR pricing)
export function getEUPricing(): RegionalPricing {
  return {
    country: 'European Union',
    currency: 'EUR',
    currencySymbol: '€',
    dayPass: '€2.49',
    monthly: '€11.99',
    quarterly: '€29.99',
    yearly: '€109.99'
  };
}

