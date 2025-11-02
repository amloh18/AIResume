export interface LocationData {
  country: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  paymentPartner: 'stripe' | 'razorpay';
  exchangeRate: number;
}

export interface PricingData {
  originalPrice: number;
  originalCurrency: string;
  convertedPrice: number;
  convertedCurrency: string;
  exchangeRate: number;
  paymentPartner: 'stripe' | 'razorpay';
}

// Exchange rates (simplified - in production, use a real API)
const EXCHANGE_RATES: Record<string, number> = {
  'EUR': 1.0,
  'USD': 1.08,
  'GBP': 0.85,
  'INR': 89.5,
  'CAD': 1.47,
  'AUD': 1.65,
  'SGD': 1.45,
  'JPY': 160.5,
  'CHF': 0.95,
  'SEK': 11.2,
  'NOK': 11.8,
  'DKK': 7.45,
  'PLN': 4.35,
  'CZK': 25.1,
  'HUF': 395.0,
  'RON': 4.95,
  'BGN': 1.96,
  'HRK': 7.53,
  'RUB': 98.5,
  'TRY': 32.8,
  'BRL': 5.35,
  'MXN': 18.2,
  'ARS': 945.0,
  'CLP': 1050.0,
  'COP': 4200.0,
  'PEN': 4.05,
  'UYU': 42.5,
  'PYG': 7950.0,
  'BOB': 7.45,
  'GTQ': 8.45,
  'HNL': 26.8,
  'NIO': 39.8,
  'CRC': 550.0,
  'PAB': 1.08,
  'DOP': 63.5,
  'JMD': 168.0,
  'TTD': 7.35,
  'BBD': 2.16,
  'XCD': 2.92,
  'ANG': 1.94,
  'AWG': 1.94,
  'KYD': 0.90,
  'BMD': 1.08,
  'BZD': 2.16,
  'FJD': 2.42,
  'WST': 2.95,
  'TOP': 2.55,
  'SBD': 9.15,
  'VUV': 130.0,
  'VND': 26250.0,
  'THB': 38.5,
  'MYR': 5.15,
  'SGD': 1.45,
  'IDR': 16850.0,
  'PHP': 60.5,
  'KRW': 1450.0,
  'TWD': 34.2,
  'HKD': 8.45,
  'CNY': 7.75,
  'MOP': 8.70,
  'BND': 1.45,
  'MMK': 2270.0,
  'LAK': 22500.0,
  'KHR': 4400.0,
  'BDT': 118.5,
  'LKR': 340.0,
  'NPR': 142.5,
  'PKR': 300.0,
  'AFN': 78.5,
  'IRR': 45500.0,
  'IQD': 1410.0,
  'SAR': 4.05,
  'AED': 3.97,
  'QAR': 3.93,
  'KWD': 0.33,
  'BHD': 0.41,
  'OMR': 0.42,
  'JOD': 0.76,
  'LBP': 16200.0,
  'SYP': 13500.0,
  'YER': 270.0,
  'EGP': 33.5,
  'MAD': 10.8,
  'TND': 3.35,
  'DZD': 145.0,
  'LYD': 5.25,
  'SDG': 325.0,
  'ETB': 60.5,
  'SOS': 620.0,
  'KES': 170.0,
  'TZS': 2700.0,
  'UGX': 4100.0,
  'RWF': 1350.0,
  'BIF': 3100.0,
  'MWK': 1850.0,
  'ZMW': 28.5,
  'ZAR': 20.2,
  'NAD': 20.2,
  'BWP': 14.8,
  'SZL': 20.2,
  'LSL': 20.2,
  'MUR': 47.5,
  'SCR': 14.5,
  'MVR': 16.7,
  'KMF': 490.0,
  'DJF': 192.0,
  'GMD': 72.5,
  'GHS': 13.2,
  'NGN': 1650.0,
  'XOF': 655.0,
  'XAF': 655.0,
  'XPF': 120.0,
  'CDF': 2950.0,
  'GNF': 9250.0,
  'MGA': 4850.0,
  'STN': 24.5,
  'CVE': 110.0,
  'GMD': 72.5,
  'GHS': 13.2,
  'NGN': 1650.0,
  'XOF': 655.0,
  'XAF': 655.0,
  'XPF': 120.0,
  'CDF': 2950.0,
  'GNF': 9250.0,
  'MGA': 4850.0,
  'STN': 24.5,
  'CVE': 110.0,
};

// Country to payment partner mapping
const COUNTRY_PAYMENT_PARTNERS: Record<string, 'stripe' | 'razorpay'> = {
  'IN': 'razorpay', // India
  'US': 'stripe',   // United States
  'CA': 'stripe',   // Canada
  'GB': 'stripe',   // United Kingdom
  'AU': 'stripe',   // Australia
  'DE': 'stripe',   // Germany
  'FR': 'stripe',   // France
  'IT': 'stripe',   // Italy
  'ES': 'stripe',   // Spain
  'NL': 'stripe',   // Netherlands
  'BE': 'stripe',   // Belgium
  'AT': 'stripe',   // Austria
  'CH': 'stripe',   // Switzerland
  'SE': 'stripe',   // Sweden
  'NO': 'stripe',   // Norway
  'DK': 'stripe',   // Denmark
  'FI': 'stripe',   // Finland
  'PL': 'stripe',   // Poland
  'CZ': 'stripe',   // Czech Republic
  'HU': 'stripe',   // Hungary
  'RO': 'stripe',   // Romania
  'BG': 'stripe',   // Bulgaria
  'HR': 'stripe',   // Croatia
  'SI': 'stripe',   // Slovenia
  'SK': 'stripe',   // Slovakia
  'LT': 'stripe',   // Lithuania
  'LV': 'stripe',   // Latvia
  'EE': 'stripe',   // Estonia
  'IE': 'stripe',   // Ireland
  'PT': 'stripe',   // Portugal
  'GR': 'stripe',   // Greece
  'CY': 'stripe',   // Cyprus
  'MT': 'stripe',   // Malta
  'LU': 'stripe',   // Luxembourg
  'IS': 'stripe',   // Iceland
  'LI': 'stripe',   // Liechtenstein
  'MC': 'stripe',   // Monaco
  'SM': 'stripe',   // San Marino
  'VA': 'stripe',   // Vatican City
  'AD': 'stripe',   // Andorra
  'default': 'stripe'
};

// Country to currency mapping
const COUNTRY_CURRENCIES: Record<string, { currency: string; symbol: string }> = {
  'IN': { currency: 'INR', symbol: '₹' },
  'US': { currency: 'USD', symbol: '$' },
  'CA': { currency: 'CAD', symbol: '$' },
  'GB': { currency: 'GBP', symbol: '£' },
  'AU': { currency: 'AUD', symbol: '$' },
  'DE': { currency: 'EUR', symbol: '€' },
  'FR': { currency: 'EUR', symbol: '€' },
  'IT': { currency: 'EUR', symbol: '€' },
  'ES': { currency: 'EUR', symbol: '€' },
  'NL': { currency: 'EUR', symbol: '€' },
  'BE': { currency: 'EUR', symbol: '€' },
  'AT': { currency: 'EUR', symbol: '€' },
  'CH': { currency: 'CHF', symbol: 'CHF' },
  'SE': { currency: 'SEK', symbol: 'kr' },
  'NO': { currency: 'NOK', symbol: 'kr' },
  'DK': { currency: 'DKK', symbol: 'kr' },
  'FI': { currency: 'EUR', symbol: '€' },
  'PL': { currency: 'PLN', symbol: 'zł' },
  'CZ': { currency: 'CZK', symbol: 'Kč' },
  'HU': { currency: 'HUF', symbol: 'Ft' },
  'RO': { currency: 'RON', symbol: 'lei' },
  'BG': { currency: 'BGN', symbol: 'лв' },
  'HR': { currency: 'HRK', symbol: 'kn' },
  'SI': { currency: 'EUR', symbol: '€' },
  'SK': { currency: 'EUR', symbol: '€' },
  'LT': { currency: 'EUR', symbol: '€' },
  'LV': { currency: 'EUR', symbol: '€' },
  'EE': { currency: 'EUR', symbol: '€' },
  'IE': { currency: 'EUR', symbol: '€' },
  'PT': { currency: 'EUR', symbol: '€' },
  'GR': { currency: 'EUR', symbol: '€' },
  'CY': { currency: 'EUR', symbol: '€' },
  'MT': { currency: 'EUR', symbol: '€' },
  'LU': { currency: 'EUR', symbol: '€' },
  'IS': { currency: 'ISK', symbol: 'kr' },
  'LI': { currency: 'CHF', symbol: 'CHF' },
  'MC': { currency: 'EUR', symbol: '€' },
  'SM': { currency: 'EUR', symbol: '€' },
  'VA': { currency: 'EUR', symbol: '€' },
  'AD': { currency: 'EUR', symbol: '€' },
  'default': { currency: 'EUR', symbol: '€' }
};

export class LocationService {
  // Helper function to add timeout to fetch
  private static async fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static async getLocationData(): Promise<LocationData> {
    // Try multiple IP geolocation services as fallbacks
    const services = [
      { url: 'https://ipapi.co/json/', parse: (data: any) => ({ code: data.country_code, name: data.country_name }) },
      { url: 'https://ip-api.com/json/', parse: (data: any) => ({ code: data.countryCode, name: data.country }) },
      { url: 'https://api.country.is/', parse: (data: any) => ({ code: data.country, name: data.country }) },
    ];

    for (const service of services) {
      try {
        const response = await this.fetchWithTimeout(service.url, 5000);

        if (!response.ok) {
          continue; // Try next service
        }

        const data = await response.json();
        const parsed = service.parse(data);
        
        if (!parsed || !parsed.code || parsed.code.length !== 2) {
          continue; // Invalid response, try next service
        }

        const countryCode = parsed.code.toUpperCase();
        
        const currencyInfo = COUNTRY_CURRENCIES[countryCode] || COUNTRY_CURRENCIES.default;
        const paymentPartner = COUNTRY_PAYMENT_PARTNERS[countryCode] || COUNTRY_PAYMENT_PARTNERS.default;
        const exchangeRate = EXCHANGE_RATES[currencyInfo.currency] || 1.0;

        const locationData: LocationData = {
          country: parsed.name || 'Unknown',
          countryCode,
          currency: currencyInfo.currency,
          currencySymbol: currencyInfo.symbol,
          paymentPartner,
          exchangeRate
        };

        console.log('Location detected:', locationData);
        return locationData;
      } catch (error) {
        // Continue to next service on error
        console.warn(`Location service ${service.url} failed:`, error);
        continue;
      }
    }

    // If all services fail, try to detect from browser language/timezone
    try {
      const browserLocale = navigator.language || (navigator as any).userLanguage;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      console.log('Browser locale:', browserLocale, 'Timezone:', timezone);
      
      // Try to infer country from timezone
      const timezoneToCountry: Record<string, string> = {
        'Asia/Kolkata': 'IN',
        'Asia/Calcutta': 'IN',
        'Asia/Karachi': 'PK',
        'Asia/Dhaka': 'BD',
        'Europe/London': 'GB',
        'America/New_York': 'US',
        'America/Los_Angeles': 'US',
        'America/Toronto': 'CA',
        'Australia/Sydney': 'AU',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Europe/Rome': 'IT',
        'Europe/Madrid': 'ES',
        'Europe/Amsterdam': 'NL',
        'Europe/Brussels': 'BE',
        'Europe/Vienna': 'AT',
        'Europe/Warsaw': 'PL',
      };

      const inferredCountryCode = timezoneToCountry[timezone];
      if (inferredCountryCode) {
        const currencyInfo = COUNTRY_CURRENCIES[inferredCountryCode] || COUNTRY_CURRENCIES.default;
        const paymentPartner = COUNTRY_PAYMENT_PARTNERS[inferredCountryCode] || COUNTRY_PAYMENT_PARTNERS.default;
        const exchangeRate = EXCHANGE_RATES[currencyInfo.currency] || 1.0;

        const locationData: LocationData = {
          country: 'Detected from timezone',
          countryCode: inferredCountryCode,
          currency: currencyInfo.currency,
          currencySymbol: currencyInfo.symbol,
          paymentPartner,
          exchangeRate
        };

        console.log('Location inferred from timezone:', locationData);
        return locationData;
      }
    } catch (error) {
      console.warn('Failed to infer location from browser:', error);
    }

    // Final fallback to default values
    console.warn('All location detection methods failed, using default (US)');
    return {
      country: 'United States',
      countryCode: 'US',
      currency: 'USD',
      currencySymbol: '$',
      paymentPartner: 'stripe',
      exchangeRate: 1.08
    };
  }

  static convertPrice(originalPrice: number, originalCurrency: string, targetCurrency: string): PricingData {
    const originalRate = EXCHANGE_RATES[originalCurrency] || 1.0;
    const targetRate = EXCHANGE_RATES[targetCurrency] || 1.0;
    const exchangeRate = targetRate / originalRate;
    const convertedPrice = originalPrice * exchangeRate;

    // Determine payment partner based on target currency
    const paymentPartner = targetCurrency === 'INR' ? 'razorpay' : 'stripe';

    return {
      originalPrice,
      originalCurrency,
      convertedPrice: Math.round(convertedPrice * 100) / 100, // Round to 2 decimal places
      convertedCurrency: targetCurrency,
      exchangeRate,
      paymentPartner
    };
  }

  static getSupportedCurrencies() {
    return [
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
      { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
      { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
      { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
      { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
      { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
      { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
      { code: 'DKK', symbol: 'kr', name: 'Danish Krone' }
    ];
  }

  static getPaymentPartnerForCurrency(currency: string): 'stripe' | 'razorpay' {
    return currency === 'INR' ? 'razorpay' : 'stripe';
  }

  static formatPrice(price: number, currency: string, symbol?: string): string {
    const currencySymbol = symbol || this.getCurrencySymbol(currency);
    
    if (currency === 'INR') {
      return `${currencySymbol}${Math.round(price)}`;
    }
    
    return `${currencySymbol}${price.toFixed(2)}`;
  }

  static getCurrencySymbol(currency: string): string {
    const currencyInfo = this.getSupportedCurrencies().find(c => c.code === currency);
    return currencyInfo?.symbol || currency;
  }
}
