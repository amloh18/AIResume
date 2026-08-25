"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLocation = normalizeLocation;
const COUNTRY_MAP = {
    uk: { name: 'United Kingdom', code: 'GB' },
    gb: { name: 'United Kingdom', code: 'GB' },
    'united kingdom': { name: 'United Kingdom', code: 'GB' },
    'great britain': { name: 'United Kingdom', code: 'GB' },
    england: { name: 'United Kingdom', code: 'GB' },
    scotland: { name: 'United Kingdom', code: 'GB' },
    wales: { name: 'United Kingdom', code: 'GB' },
    london: { name: 'United Kingdom', code: 'GB' },
    us: { name: 'United States', code: 'US' },
    usa: { name: 'United States', code: 'US' },
    'united states': { name: 'United States', code: 'US' },
    india: { name: 'India', code: 'IN' },
    in: { name: 'India', code: 'IN' },
    bangalore: { name: 'India', code: 'IN' },
    bengaluru: { name: 'India', code: 'IN' },
    hyderabad: { name: 'India', code: 'IN' },
    mumbai: { name: 'India', code: 'IN' },
    delhi: { name: 'India', code: 'IN' },
    pune: { name: 'India', code: 'IN' },
    canada: { name: 'Canada', code: 'CA' },
    ca: { name: 'Canada', code: 'CA' },
    germany: { name: 'Germany', code: 'DE' },
    de: { name: 'Germany', code: 'DE' },
    france: { name: 'France', code: 'FR' },
    fr: { name: 'France', code: 'FR' },
    australia: { name: 'Australia', code: 'AU' },
    au: { name: 'Australia', code: 'AU' },
};
function normalizeLocation(rawLocation, rawCountryCode, isExplicitRemote) {
    const loc = (rawLocation || '').trim();
    const lowerLoc = loc.toLowerCase();
    // 1. Detect remote mode
    let remote = isExplicitRemote === true;
    let remoteType = remote ? 'remote' : 'on_site';
    if (lowerLoc.includes('hybrid')) {
        remote = true;
        remoteType = 'hybrid';
    }
    else if (lowerLoc.includes('remote') || lowerLoc.includes('anywhere') || lowerLoc.includes('worldwide')) {
        remote = true;
        remoteType = 'remote';
    }
    // 2. Parse Country & City
    let country = 'Worldwide';
    let countryCode = (rawCountryCode || '').toUpperCase();
    let city = '';
    let state = '';
    const parts = loc.split(/[,/|-]+/).map((p) => p.trim());
    if (parts.length > 0) {
        city = parts[0];
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].toLowerCase();
            if (COUNTRY_MAP[lastPart]) {
                country = COUNTRY_MAP[lastPart].name;
                countryCode = COUNTRY_MAP[lastPart].code;
            }
        }
    }
    // Fallback checks across entire location string
    if (!countryCode) {
        for (const [key, mapping] of Object.entries(COUNTRY_MAP)) {
            if (lowerLoc.includes(key)) {
                country = mapping.name;
                countryCode = mapping.code;
                break;
            }
        }
    }
    if (country === 'Worldwide' && !countryCode) {
        countryCode = 'GLOBAL';
    }
    return {
        city: city || (remote ? 'Remote' : 'Various'),
        state,
        country,
        countryCode: countryCode || 'GLOBAL',
        remote,
        remoteType,
    };
}
//# sourceMappingURL=normalizeLocation.js.map