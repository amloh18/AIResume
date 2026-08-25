"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateDetector = exports.DuplicateDetector = void 0;
const similarity_1 = require("./similarity");
class DuplicateDetector {
    /**
     * Checks incoming normalized job against an existing candidate match
     */
    evaluateCandidate(incoming, existing) {
        // 1. Tier 1: Exact Source and Source Job ID
        if (incoming.source.primary === existing.source.primary &&
            incoming.source.sourceJobId === existing.source.sourceJobId) {
            return {
                isDuplicate: true,
                tier: 'L1_EXACT_SOURCE_ID',
                confidence: 1.0,
                existingJobId: String(existing._id),
                matchedCanonicalId: existing.canonicalId,
            };
        }
        // 2. Tier 2: Canonical Fingerprint Match
        if (incoming.canonicalId === existing.canonicalId) {
            return {
                isDuplicate: true,
                tier: 'L2_CANONICAL_FINGERPRINT',
                confidence: 0.98,
                existingJobId: String(existing._id),
                matchedCanonicalId: existing.canonicalId,
            };
        }
        // 3. Tier 3: High Similarity on ambiguous matches
        if (incoming.company.normalizedName === existing.company.normalizedName) {
            const sim = (0, similarity_1.areJobsSimilar)(incoming.title, incoming.descriptionText, existing.title, existing.descriptionText);
            if (sim.isDuplicate) {
                return {
                    isDuplicate: true,
                    tier: 'L3_SIMILARITY',
                    confidence: sim.confidence,
                    existingJobId: String(existing._id),
                    matchedCanonicalId: existing.canonicalId,
                };
            }
        }
        return {
            isDuplicate: false,
            tier: 'NONE',
            confidence: 0,
        };
    }
}
exports.DuplicateDetector = DuplicateDetector;
exports.duplicateDetector = new DuplicateDetector();
//# sourceMappingURL=duplicateDetector.js.map