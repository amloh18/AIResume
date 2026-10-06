import { MatchScoreResult } from './deterministicScoring';

export function formatExplainableMatchSummary(match: MatchScoreResult): string {
  if (!match.reasons || match.reasons.length === 0) {
    return `${match.score}% Match based on your general candidate profile`;
  }

  return `${match.score}% Match · ${match.reasons.join(' · ')}`;
}
