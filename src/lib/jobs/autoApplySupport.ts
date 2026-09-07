/**
 * Auto-Apply support — which job sources/ATS types the platform can submit
 * applications to automatically.
 *
 * Matches the ATS adapters in UnifiedApplyService:
 *  - Greenhouse, Lever, Ashby, Workable (direct API apply)
 *  - Naukri, Indeed (session-based apply)
 *
 * Adzuna / Workday / Unknown are not auto-apply supported (redirect/manual).
 */

export const AUTO_APPLY_SUPPORTED_ATS = [
  'greenhouse',
  'lever',
  'ashby',
  'workable',
  'naukri',
  'indeed',
] as const;

export type AutoApplySupportedAts = (typeof AUTO_APPLY_SUPPORTED_ATS)[number];

/** Case-insensitive check whether an ATS/source string supports auto-apply. */
export function isAutoApplySupported(atsType: string | undefined | null): boolean {
  if (!atsType) return false;
  const normalized = atsType.trim().toLowerCase();
  return (AUTO_APPLY_SUPPORTED_ATS as readonly string[]).includes(normalized);
}