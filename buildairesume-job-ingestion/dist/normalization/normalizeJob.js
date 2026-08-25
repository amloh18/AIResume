"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCanonicalId = generateCanonicalId;
exports.normalizeRawJob = normalizeRawJob;
const crypto_1 = __importDefault(require("crypto"));
const normalizeTitle_1 = require("./normalizeTitle");
const normalizeCompany_1 = require("./normalizeCompany");
const normalizeLocation_1 = require("./normalizeLocation");
const normalizeSalary_1 = require("./normalizeSalary");
const normalizeSkills_1 = require("./normalizeSkills");
const sanitizeDescription_1 = require("./sanitizeDescription");
const constants_1 = require("../config/constants");
function generateCanonicalId(normalizedCompany, normalizedTitle, countryCode, city) {
    const payload = `${normalizedCompany}::${normalizedTitle}::${countryCode}::${city.toLowerCase()}`;
    return crypto_1.default.createHash('sha256').update(payload).digest('hex');
}
function normalizeRawJob(raw) {
    // 1. Title & Seniority Level
    const titleRes = (0, normalizeTitle_1.normalizeTitle)(raw.title);
    // 2. Company & Logo
    const company = (0, normalizeCompany_1.normalizeCompany)(raw.companyName, raw.url);
    // 3. Location & Remote
    const location = (0, normalizeLocation_1.normalizeLocation)(raw.locationString, raw.countryCode, raw.isRemote);
    // 4. Description Sanitization
    const descRes = (0, sanitizeDescription_1.sanitizeDescription)(raw.rawHtmlDescription || raw.rawTextDescription || '');
    // 5. Compensation
    const salary = (0, normalizeSalary_1.normalizeSalary)(raw.salaryText, raw.salaryMin, raw.salaryMax, raw.salaryCurrency, raw.salaryPeriod);
    // 6. Skills
    const skills = (0, normalizeSkills_1.extractNormalizedSkills)(titleRes.title, descRes.descriptionText);
    // 7. Canonical SHA-256 Fingerprint
    const canonicalId = generateCanonicalId(company.normalizedName, titleRes.normalizedTitle, location.countryCode, location.city);
    const now = new Date();
    const postedAt = raw.postedDate ? new Date(raw.postedDate) : now;
    // 8. Visa Sponsorship Mention Detection
    const descLower = descRes.descriptionText.toLowerCase();
    const visaMentioned = descLower.includes('visa sponsorship') ||
        descLower.includes('sponsor visa') ||
        descLower.includes('sponsorship available') ||
        descLower.includes('h-1b') ||
        descLower.includes('tier 2') ||
        descLower.includes('skilled worker visa');
    return {
        canonicalId,
        title: titleRes.title,
        normalizedTitle: titleRes.normalizedTitle,
        company,
        description: descRes.sanitizedHtml,
        descriptionText: descRes.descriptionText,
        source: {
            primary: raw.source,
            sourceJobId: raw.sourceJobId,
            sourceUrl: raw.url,
            applicationUrl: raw.applicationUrl || raw.url,
            discoveredAt: now,
            lastSeenAt: now,
        },
        sources: [
            {
                name: raw.source,
                sourceJobId: raw.sourceJobId,
                url: raw.url,
                firstSeenAt: now,
                lastSeenAt: now,
            },
        ],
        location,
        employmentType: raw.employmentTypeString || 'full_time',
        experience: {
            minYears: null,
            maxYears: null,
            level: titleRes.level,
        },
        salary,
        skills,
        requirements: [],
        benefits: [],
        visaSponsorship: {
            mentioned: visaMentioned,
            type: null,
        },
        postedAt,
        expiresAt: null,
        status: constants_1.SYSTEM_CONSTANTS.STATUS.ACTIVE,
        ingestion: {
            firstSeenAt: now,
            lastSeenAt: now,
            lastUpdatedAt: now,
            updateCount: 1,
        },
        search: {
            keywords: skills,
            normalizedLocation: `${location.city} ${location.country}`.toLowerCase(),
            normalizedSkills: skills.map((s) => s.toLowerCase()),
        },
        matching: {
            embeddingId: null,
            indexed: false,
        },
        metadata: {
            rawSource: raw.rawPayload,
            parserVersion: constants_1.SYSTEM_CONSTANTS.DEFAULT_PARSER_VERSION,
            normalizerVersion: constants_1.SYSTEM_CONSTANTS.DEFAULT_NORMALIZER_VERSION,
        },
        createdAt: now,
        updatedAt: now,
    };
}
//# sourceMappingURL=normalizeJob.js.map