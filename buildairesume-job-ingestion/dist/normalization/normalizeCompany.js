"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCompany = normalizeCompany;
const LEGAL_SUFFIXES = /\b(inc\.?|llc\.?|ltd\.?|limited|gmbh|corp\.?|corporation|plc|sa|srl|pvt\.?|private|pty)\b/gi;
function normalizeCompany(rawName, sourceUrl) {
    if (!rawName) {
        return {
            name: 'Unknown Employer',
            normalizedName: 'unknown employer',
        };
    }
    // 1. Clean presentation name
    let name = rawName
        .replace(LEGAL_SUFFIXES, '')
        .replace(/[,.-]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!name)
        name = rawName.trim();
    // 2. Canonical normalized name (lowercase alphanumeric)
    const normalizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    // 3. Extract domain if URL available
    let domain;
    if (sourceUrl) {
        try {
            const parsed = new URL(sourceUrl);
            const host = parsed.hostname.replace(/^www\./, '');
            // If not a standard ATS board domain
            if (!host.includes('greenhouse.io') &&
                !host.includes('lever.co') &&
                !host.includes('ashbyhq.com') &&
                !host.includes('workday.com') &&
                !host.includes('adzuna.com') &&
                !host.includes('remotive.com') &&
                !host.includes('remoteok.com')) {
                domain = host;
            }
        }
        catch {
            // ignore
        }
    }
    const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : undefined;
    return {
        name,
        normalizedName,
        domain,
        logoUrl,
    };
}
//# sourceMappingURL=normalizeCompany.js.map