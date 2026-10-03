import { describe, expect, it } from 'vitest';
import {
  deriveRemoteOnly,
  deriveWorkplacePreference,
  normalizeWorkplaceData,
  normalizeWorkplaceTypes,
  resolveFeedRemoteOnly,
  workplaceLabelToId,
  WORKPLACE_ID_TO_LABEL,
} from './workplace';

describe('workplaceLabelToId', () => {
  it('maps canonical ids and legacy labels case-insensitively', () => {
    expect(workplaceLabelToId('remote')).toBe('remote');
    expect(workplaceLabelToId('Remote')).toBe('remote');
    expect(workplaceLabelToId('Remote Only')).toBe('remote');
    expect(workplaceLabelToId('On-site')).toBe('onsite');
    expect(workplaceLabelToId('On Site')).toBe('onsite');
    expect(workplaceLabelToId('Hybrid / Remote')).toBe('hybrid');
  });

  it('returns undefined for non-workplace values', () => {
    expect(workplaceLabelToId('London')).toBeUndefined();
    expect(workplaceLabelToId('')).toBeUndefined();
  });
});

describe('normalizeWorkplaceTypes', () => {
  it('dedupes and preserves a stable order', () => {
    expect(normalizeWorkplaceTypes(['onsite', 'remote', 'onsite'])).toEqual(['remote', 'onsite']);
    expect(normalizeWorkplaceTypes(['hybrid'])).toEqual(['hybrid']);
  });

  it('handles labels, mixed input, and junk', () => {
    expect(normalizeWorkplaceTypes(['Remote', 'On-site'])).toEqual(['remote', 'onsite']);
    expect(normalizeWorkplaceTypes(['London', 42, null])).toEqual([]);
    expect(normalizeWorkplaceTypes(undefined)).toEqual([]);
    expect(normalizeWorkplaceTypes('remote')).toEqual([]);
  });
});

describe('normalizeWorkplaceData', () => {
  it('migrates legacy labels out of locations into workplaceTypes', () => {
    const result = normalizeWorkplaceData(['remote'], ['Remote', 'London', 'Bangalore']);
    expect(result.workplaceTypes).toEqual(['remote']);
    expect(result.locations).toEqual(['London', 'Bangalore']);
  });

  it('merges labels from both fields and dedupes', () => {
    const result = normalizeWorkplaceData(['remote'], ['Hybrid', 'London']);
    expect(result.workplaceTypes).toEqual(['remote', 'hybrid']);
    expect(result.locations).toEqual(['London']);
  });

  it('leaves city-only locations untouched', () => {
    const result = normalizeWorkplaceData([], ['London', 'Berlin']);
    expect(result.workplaceTypes).toEqual([]);
    expect(result.locations).toEqual(['London', 'Berlin']);
  });
});

describe('deriveRemoteOnly', () => {
  it('treats an exclusively remote selection as a hard constraint', () => {
    expect(deriveRemoteOnly(['remote'])).toBe(true);
    expect(deriveRemoteOnly(['remote', 'hybrid'])).toBe(false);
    expect(deriveRemoteOnly(['remote', 'onsite'])).toBe(false);
    expect(deriveRemoteOnly(['onsite'])).toBe(false);
    expect(deriveRemoteOnly([])).toBe(false);
  });

  it('honors the legacy flag only when no explicit selection exists', () => {
    expect(deriveRemoteOnly([], true)).toBe(true);
    expect(deriveRemoteOnly([], false)).toBe(false);
    expect(deriveRemoteOnly(['onsite'], true)).toBe(false);
    expect(deriveRemoteOnly(['remote'], true)).toBe(true);
  });
});

describe('deriveWorkplacePreference', () => {
  it('collapses selections into the scoring preference', () => {
    expect(deriveWorkplacePreference([])).toBe('any');
    expect(deriveWorkplacePreference(['remote'])).toBe('remote');
    expect(deriveWorkplacePreference(['onsite'])).toBe('onsite');
    expect(deriveWorkplacePreference(['hybrid'])).toBe('hybrid');
    expect(deriveWorkplacePreference(['remote', 'hybrid'])).toBe('remote');
    expect(deriveWorkplacePreference(['hybrid', 'onsite'])).toBe('onsite');
    expect(deriveWorkplacePreference(['remote', 'onsite'])).toBe('any');
    expect(deriveWorkplacePreference(['remote', 'hybrid', 'onsite'])).toBe('any');
  });
});

describe('resolveFeedRemoteOnly', () => {
  it('gives explicit remoteOnly param precedence', () => {
    expect(resolveFeedRemoteOnly({ remoteOnlyParam: true, workplaceFilter: ['onsite'], profileRemoteOnly: false })).toBe(true);
  });

  it('only a single remote pill implies a remote pool', () => {
    expect(resolveFeedRemoteOnly({ workplaceFilter: ['remote'] })).toBe(true);
    expect(resolveFeedRemoteOnly({ workplaceFilter: ['onsite'] })).toBe(false);
    expect(resolveFeedRemoteOnly({ workplaceFilter: ['hybrid'] })).toBe(false);
    expect(resolveFeedRemoteOnly({ workplaceFilter: ['remote', 'hybrid'] })).toBe(false);
  });

  it('falls back to the profile constraint when no explicit workplace filter is set', () => {
    expect(resolveFeedRemoteOnly({ profileRemoteOnly: true })).toBe(true);
    expect(resolveFeedRemoteOnly({ profileRemoteOnly: false })).toBe(false);
    expect(resolveFeedRemoteOnly({})).toBe(false);
  });
});

describe('WORKPLACE_ID_TO_LABEL', () => {
  it('renders labels for display', () => {
    expect(WORKPLACE_ID_TO_LABEL.remote).toBe('Remote');
    expect(WORKPLACE_ID_TO_LABEL.hybrid).toBe('Hybrid');
    expect(WORKPLACE_ID_TO_LABEL.onsite).toBe('On-site');
  });
});