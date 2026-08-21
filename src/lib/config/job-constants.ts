export const COMMON_ROLES = [
  'Full Stack Developer',
  'Software Engineer',
  'Frontend Developer',
  'Backend Lead',
  'React Developer',
  'Cloud / DevOps Engineer',
  'Data Engineer',
  'ML Engineer',
  'Product Manager',
  'DevOps Engineer',
  'Mobile Developer (iOS/Android)',
  'QA / Automation Engineer',
  'UI/UX Designer',
];

export const COMMON_LOCATIONS = [
  'Remote',
  'London',
  'New York',
  'San Francisco',
  'Bangalore',
  'Mumbai',
  'Hyderabad',
  'Pune',
  'Delhi / NCR',
  'Toronto',
  'Berlin',
  'Munich',
  'Paris',
  'Amsterdam',
  'Dublin',
  'Zurich',
  'Singapore',
  'Tokyo',
  'Beijing',
  'Shanghai',
  'Shenzhen',
  'Hong Kong',
  'Dubai',
  'Sydney',
  'Austin',
  'Seattle',
  'Boston',
  'Chicago',
];

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  currency: string;
  region: string;
  isContinent?: boolean;
}

export const COUNTRIES_LIST: CountryOption[] = [
  // Worldwide / Macro Continents
  { code: 'GLOBAL', name: 'Worldwide / Remote', flag: '🌍', currency: 'USD', region: 'Global', isContinent: true },
  { code: 'EU', name: 'Europe', flag: '🇪🇺', currency: 'EUR', region: 'Europe', isContinent: true },
  { code: 'ASIA', name: 'Asia', flag: '🌏', currency: 'USD', region: 'Asia', isContinent: true },
  { code: 'NA', name: 'North America', flag: '🌎', currency: 'USD', region: 'North America', isContinent: true },
  { code: 'LATAM', name: 'Latin America', flag: '🌎', currency: 'USD', region: 'South America', isContinent: true },
  { code: 'MEA', name: 'Middle East & Africa', flag: '🌍', currency: 'USD', region: 'Middle East', isContinent: true },
  { code: 'APAC', name: 'Asia-Pacific', flag: '🌏', currency: 'USD', region: 'Asia', isContinent: true },

  // Countries
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', region: 'Asia' },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', region: 'Asia' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', region: 'North America' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', region: 'Europe' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', region: 'Europe' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', region: 'North America' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', region: 'Asia' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', region: 'Oceania' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', region: 'Middle East' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', region: 'Europe' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', region: 'Europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', region: 'Europe' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', region: 'Europe' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', region: 'Europe' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', region: 'Asia' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', region: 'Asia' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', region: 'South America' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', region: 'Africa' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', region: 'Oceania' },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  INR: '₹',
  CNY: '¥',
  RMB: '¥',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'AED',
  CHF: 'CHF',
  SEK: 'kr',
  PLN: 'zł',
  JPY: '¥',
  KRW: '₩',
  BRL: 'R$',
  ZAR: 'R',
  NZD: 'NZ$',
};

export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '$';
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

export type JobRegion = 'UK' | 'India';
