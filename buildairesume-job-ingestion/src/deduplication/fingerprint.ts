import crypto from 'crypto';

export function computeCanonicalFingerprint(
  normalizedCompany: string,
  normalizedTitle: string,
  countryCode: string,
  city: string
): string {
  const normCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normCountry = countryCode.toUpperCase();
  const raw = `${normalizedCompany}:::${normalizedTitle}:::${normCountry}:::${normCity}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
