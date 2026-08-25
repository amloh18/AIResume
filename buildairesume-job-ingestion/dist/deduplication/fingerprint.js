"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCanonicalFingerprint = computeCanonicalFingerprint;
const crypto_1 = __importDefault(require("crypto"));
function computeCanonicalFingerprint(normalizedCompany, normalizedTitle, countryCode, city) {
    const normCity = city.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normCountry = countryCode.toUpperCase();
    const raw = `${normalizedCompany}:::${normalizedTitle}:::${normCountry}:::${normCity}`;
    return crypto_1.default.createHash('sha256').update(raw).digest('hex');
}
//# sourceMappingURL=fingerprint.js.map