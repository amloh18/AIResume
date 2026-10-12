/**
 * Freshness Scoring Engine
 *
 * Implements the piecewise decay freshness curve specified in AGENTS §11 and
 * job-recommendation-plan §4.2:
 *
 * <1h: 100
 * 1–3h: 95
 * 3–6h: 90
 * 6–12h: 82
 * 12–24h: 70
 * 1–3d (24-72h): 50
 * 3–7d (72-168h): 25
 * >7d (>168h): 5
 * unknown / missing date: 40
 */

export function computeFreshnessScore(dateInput?: Date | string | number | null): number {
  if (!dateInput) {
    return 40; // unknown: 40 per plan §4.2
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const time = date.getTime();
  if (isNaN(time) || time <= 0) {
    return 40;
  }

  const now = Date.now();
  const diffMs = now - time;
  // If posted in future or zero diff, full score
  if (diffMs <= 0) {
    return 100;
  }

  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return 100;
  if (diffHours < 3) return 95;
  if (diffHours < 6) return 90;
  if (diffHours < 12) return 82;
  if (diffHours < 24) return 70;
  if (diffHours < 72) return 50;  // 1-3 days
  if (diffHours < 168) return 25; // 3-7 days
  return 5;                       // >7 days
}
