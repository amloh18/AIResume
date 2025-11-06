/**
 * Currency Conversion Utility
 * Converts various currencies to INR (Indian Rupees)
 * Note: These are approximate rates. For production, use a real-time currency API
 */

export const CURRENCY_RATES: Record<string, number> = {
  'INR': 1,
  'USD': 83.5,
  'EUR': 90.2,
  'GBP': 105.8,
  'CAD': 61.2,
  'AUD': 54.8,
  'PKR': 0.30,
  'PLN': 20.5
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'CAD': '$',
  'AUD': '$',
  'PKR': '₨',
  'PLN': 'zł'
};

/**
 * Convert amount from source currency to INR
 */
export function convertToINR(amount: number, fromCurrency: string): number {
  const rate = CURRENCY_RATES[fromCurrency] || 1;
  return amount * rate;
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol} ${amount.toFixed(2)}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

