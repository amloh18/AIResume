import { BaseATSAdapter } from './BaseATSAdapter';
import { GreenhouseAdapter } from './GreenhouseAdapter';
import { LeverAdapter } from './LeverAdapter';
import { AshbyAdapter } from './AshbyAdapter';
import { WorkdayAdapter } from './WorkdayAdapter';

export { BaseATSAdapter } from './BaseATSAdapter';
export type { ATSField, ATSDetectionResult, FillResult, SubmissionResult } from './BaseATSAdapter';
export { GreenhouseAdapter } from './GreenhouseAdapter';
export { LeverAdapter } from './LeverAdapter';
export { AshbyAdapter } from './AshbyAdapter';
export { WorkdayAdapter } from './WorkdayAdapter';

/**
 * Get an ATS adapter based on the URL
 */
export function getATSAdapter(url: string): BaseATSAdapter | null {
  const adapters: BaseATSAdapter[] = [
    new GreenhouseAdapter(),
    new LeverAdapter(),
    new AshbyAdapter(),
    new WorkdayAdapter(),
  ];

  for (const adapter of adapters) {
    const detection = adapter.detectATS(url);
    if (detection.detected && detection.confidence >= 0.8) {
      return adapter;
    }
  }

  return null;
}

/**
 * Get an ATS adapter by type
 */
export function getATSAdapterByType(atsType: string): BaseATSAdapter | null {
  switch (atsType.toLowerCase()) {
    case 'greenhouse':
      return new GreenhouseAdapter();
    case 'lever':
      return new LeverAdapter();
    case 'ashby':
      return new AshbyAdapter();
    case 'workday':
      return new WorkdayAdapter();
    default:
      return null;
  }
}

/**
 * Detect ATS type from URL
 */
export function detectATSType(url: string): { atsType: string; confidence: number } {
  const adapter = getATSAdapter(url);
  
  if (adapter) {
    const detection = adapter.detectATS(url);
    return {
      atsType: detection.atsType,
      confidence: detection.confidence,
    };
  }
  
  return { atsType: 'unknown', confidence: 0 };
}

/**
 * List all supported ATS types
 */
export function getSupportedATSTypes(): string[] {
  return [
    'greenhouse',
    'lever',
    'ashby',
    'workday',
  ];
}
