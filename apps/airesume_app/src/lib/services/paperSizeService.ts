/**
 * Paper Size Service
 * 
 * Determines default paper size based on user location.
 * US Letter format is used in North/Central/South America and Philippines.
 * A4 is used in the rest of the world.
 */

/**
 * Countries that use US Letter as the standard paper size
 * ISO 3166-1 alpha-2 country codes
 */
export const US_LETTER_COUNTRIES = [
    'US', // United States
    'CA', // Canada
    'MX', // Mexico
    'PH', // Philippines
    'BZ', // Belize
    'CL', // Chile
    'CO', // Colombia
    'CR', // Costa Rica
    'SV', // El Salvador
    'GT', // Guatemala
    'NI', // Nicaragua
    'PA', // Panama
    'PR', // Puerto Rico
    'VE', // Venezuela
    'DO', // Dominican Republic
    'BO', // Bolivia
    'EC', // Ecuador
    'PE', // Peru
];

export type PaperSize = 'A4' | 'Letter';

/**
 * Get the default paper size based on country code
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns 'Letter' for US Letter countries, 'A4' otherwise
 */
export const getDefaultPaperSize = (countryCode: string | undefined | null): PaperSize => {
    if (!countryCode) return 'A4';
    return US_LETTER_COUNTRIES.includes(countryCode.toUpperCase()) ? 'Letter' : 'A4';
};

/**
 * Check if a country uses US Letter paper size
 */
export const isUSLetterCountry = (countryCode: string | undefined | null): boolean => {
    if (!countryCode) return false;
    return US_LETTER_COUNTRIES.includes(countryCode.toUpperCase());
};

/**
 * Paper size dimensions
 */
export const PAPER_DIMENSIONS = {
    A4: {
        width: '210mm',
        height: '297mm',
        widthPx: 794,  // at 96 DPI
        heightPx: 1123,
        twips: { width: 11906, height: 16838 }
    },
    Letter: {
        width: '8.5in',
        height: '11in',
        widthPx: 816,  // at 96 DPI
        heightPx: 1056,
        twips: { width: 12240, height: 15840 }
    }
} as const;
