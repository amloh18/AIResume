import { JobSource } from './base/JobSource';
import { GreenhouseSource } from './greenhouse/GreenhouseSource';
import { LeverSource } from './lever/LeverSource';
import { AshbySource } from './ashby/AshbySource';
import { WorkdaySource } from './workday/WorkdaySource';
import { AdzunaSource } from './adzuna/AdzunaSource';
import { RemotiveSource } from './remotive/RemotiveSource';
import { RemoteOKSource } from './remoteok/RemoteOKSource';
import { JobSpySource } from './jobspy/JobSpySource';

export const ALL_JOB_SOURCES: JobSource[] = [
  new GreenhouseSource(),
  new LeverSource(),
  new AshbySource(),
  new WorkdaySource(),
  new AdzunaSource(),
  new RemotiveSource(),
  new RemoteOKSource(),
  new JobSpySource(),
];

export function getSourceByName(name: string): JobSource | undefined {
  return ALL_JOB_SOURCES.find((s) => s.name === name);
}

export * from './base/JobSource';
export * from './base/SourceTypes';
