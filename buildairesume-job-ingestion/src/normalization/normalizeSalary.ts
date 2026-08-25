import { JobSalary, SalaryPeriod } from '../models/Job';

const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD',
  '£': 'GBP',
  '€': 'EUR',
  '₹': 'INR',
  'c$': 'CAD',
  'a$': 'AUD',
};

export function normalizeSalary(
  rawSalaryText?: string,
  rawMin?: number,
  rawMax?: number,
  rawCurrency?: string,
  rawPeriod?: SalaryPeriod
): JobSalary {
  // If already numerical
  if (rawMin !== undefined || rawMax !== undefined) {
    return {
      min: rawMin ?? null,
      max: rawMax ?? null,
      currency: rawCurrency || 'USD',
      period: rawPeriod || 'year',
    };
  }

  if (!rawSalaryText) {
    return { min: null, max: null, currency: undefined, period: 'year' };
  }

  const text = rawSalaryText.trim();
  let currency = rawCurrency || 'USD';

  // Detect currency from symbol
  for (const [sym, curr] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(sym)) {
      currency = curr;
      break;
    }
  }

  // Detect period
  let period: SalaryPeriod = 'year';
  const lower = text.toLowerCase();
  if (lower.includes('/hr') || lower.includes('/hour') || lower.includes('per hour') || lower.includes('hourly')) {
    period = 'hour';
  } else if (lower.includes('/mo') || lower.includes('/month') || lower.includes('per month') || lower.includes('monthly')) {
    period = 'month';
  }

  // Extract numbers (supporting k suffix and comma notation)
  const numberMatches = text.match(/\b\d+([.,]\d+)?\s*(k)?\b/gi);
  if (!numberMatches || numberMatches.length === 0) {
    return { min: null, max: null, currency, period };
  }

  const parsedNumbers = numberMatches.map((val) => {
    let numStr = val.toLowerCase().replace(/,/g, '').trim();
    const isK = numStr.endsWith('k');
    if (isK) numStr = numStr.slice(0, -1);
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : isK ? parsed * 1000 : parsed;
  }).filter((n) => n > 0);

  if (parsedNumbers.length === 0) {
    return { min: null, max: null, currency, period };
  }

  const min = Math.min(...parsedNumbers);
  const max = parsedNumbers.length > 1 ? Math.max(...parsedNumbers) : min;

  return {
    min: min || null,
    max: max || null,
    currency,
    period,
  };
}
