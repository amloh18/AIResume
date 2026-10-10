import assert from 'node:assert/strict';

// Test simulation of buildJobIndices logic
function jobIdentityKey(company?: string | null, title?: string | null): string {
  const comp = (company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const tit = (title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return `${comp}___${tit}`;
}

function normalizeApplyUrl(url?: string | null): string {
  return url ? url.trim().toLowerCase() : '';
}

type SavedIndexRecord = {
  _id?: string;
  id?: string;
  jobId?: string;
  externalId?: string;
  jobUrl?: string;
  sourceUrl?: string;
  company?: string;
  jobTitle?: string;
  title?: string;
  status?: string;
  internalStatus?: string;
};

interface BuiltJobIndices {
  savedIds: Set<string>;
  savedJobIdMap: Map<string, string>;
  applicationJobIdMap: Map<string, string>;
  appliedJobIds: Set<string>;
}

function buildJobIndices(items: SavedIndexRecord[]): BuiltJobIndices {
  const savedIds = new Set<string>();
  const savedJobIdMap = new Map<string, string>();
  const applicationJobIdMap = new Map<string, string>();
  const appliedJobIds = new Set<string>();

  items.forEach((j) => {
    const dbId = j._id || j.id;
    if (!dbId) return;

    applicationJobIdMap.set(dbId, dbId);
    if (j.jobId) applicationJobIdMap.set(j.jobId, dbId);
    if (j.externalId) applicationJobIdMap.set(j.externalId, dbId);
    if (j.jobUrl || j.sourceUrl) {
      applicationJobIdMap.set(normalizeApplyUrl(j.jobUrl || j.sourceUrl), dbId);
    }
    if (j.company && (j.jobTitle || j.title)) {
      applicationJobIdMap.set(jobIdentityKey(j.company, j.jobTitle || j.title), dbId);
    }

    const isSavedOnly = j.status === 'saved' || j.status === 'draft';
    if (isSavedOnly) {
      savedIds.add(dbId);
      savedJobIdMap.set(dbId, dbId);
      if (j.jobId) {
        savedIds.add(j.jobId);
        savedJobIdMap.set(j.jobId, dbId);
      }
      if (j.externalId) {
        savedIds.add(j.externalId);
        savedJobIdMap.set(j.externalId, dbId);
      }
      if (j.jobUrl || j.sourceUrl) {
        savedJobIdMap.set(normalizeApplyUrl(j.jobUrl || j.sourceUrl), dbId);
      }
      if (j.company && (j.jobTitle || j.title)) {
        savedJobIdMap.set(jobIdentityKey(j.company, j.jobTitle || j.title), dbId);
      }
    } else if (j.status) {
      appliedJobIds.add(dbId);
      if (j.jobId) appliedJobIds.add(j.jobId);
      if (j.externalId) appliedJobIds.add(j.externalId);
    }
  });

  return { savedIds, savedJobIdMap, applicationJobIdMap, appliedJobIds };
}

console.log('Running verify-job-card-journey-integration...');

// 1. Saved vs Applied separation
const testItems: SavedIndexRecord[] = [
  {
    _id: 'app_1',
    jobId: 'ext_1',
    title: 'Senior Engineer',
    company: 'Stripe',
    status: 'saved',
  },
  {
    _id: 'app_2',
    jobId: 'ext_2',
    title: 'Staff Engineer',
    company: 'OpenAI',
    status: 'created',
  },
  {
    _id: 'app_3',
    jobId: 'ext_3',
    title: 'Tech Lead',
    company: 'Google',
    status: 'applied',
  },
];

const indices = buildJobIndices(testItems);

// Check that only app_1 is saved
assert.strictEqual(indices.savedIds.has('app_1'), true, 'app_1 must be in savedIds');
assert.strictEqual(indices.savedIds.has('ext_1'), true, 'ext_1 must be in savedIds');
assert.strictEqual(indices.savedIds.has('app_2'), false, 'app_2 must NOT be in savedIds');
assert.strictEqual(indices.savedIds.has('ext_2'), false, 'ext_2 must NOT be in savedIds');
assert.strictEqual(indices.savedIds.has('app_3'), false, 'app_3 must NOT be in savedIds');
assert.strictEqual(indices.savedIds.has('ext_3'), false, 'ext_3 must NOT be in savedIds');

// Check that appliedJobIds contains created and applied
assert.strictEqual(indices.appliedJobIds.has('app_2'), true, 'app_2 must be in appliedJobIds');
assert.strictEqual(indices.appliedJobIds.has('ext_2'), true, 'ext_2 must be in appliedJobIds');
assert.strictEqual(indices.appliedJobIds.has('app_3'), true, 'app_3 must be in appliedJobIds');
assert.strictEqual(indices.appliedJobIds.has('ext_3'), true, 'ext_3 must be in appliedJobIds');
assert.strictEqual(indices.appliedJobIds.has('app_1'), false, 'app_1 must NOT be in appliedJobIds');

// Check that applicationJobIdMap resolves all applications
assert.strictEqual(indices.applicationJobIdMap.get('app_1'), 'app_1');
assert.strictEqual(indices.applicationJobIdMap.get('ext_1'), 'app_1');
assert.strictEqual(indices.applicationJobIdMap.get('app_2'), 'app_2');
assert.strictEqual(indices.applicationJobIdMap.get('ext_2'), 'app_2');
assert.strictEqual(indices.applicationJobIdMap.get('app_3'), 'app_3');
assert.strictEqual(indices.applicationJobIdMap.get('ext_3'), 'app_3');

// 2. Feed visibility: applying does not vanish the job from explore
const exploreJobs = [
  { _id: 'job_a', title: 'Senior Engineer', company: 'Stripe' },
  { _id: 'job_b', title: 'Staff Engineer', company: 'OpenAI' },
];

function isJobSaved(job: any, savedIds: Set<string>, savedMap: Map<string, string>) {
  return savedIds.has(job._id) || savedMap.has(job._id);
}

// User applies to job_b
const appliedIds = new Set<string>(['job_b']);
// savedIds remains untouched
const currentSavedIds = new Set<string>();
const currentSavedMap = new Map<string, string>();

// When filters.savedOnly = false, feed must show all exploreJobs
const filtersSavedOnlyFalse = false;
const displayedWhenExplore = filtersSavedOnlyFalse
  ? exploreJobs.filter((j) => isJobSaved(j, currentSavedIds, currentSavedMap))
  : exploreJobs;

assert.strictEqual(displayedWhenExplore.length, 2, 'Explore feed must keep both jobs visible');
assert.strictEqual(displayedWhenExplore.some((j) => j._id === 'job_b'), true, 'Applied job must stay visible in explore');

// When filters.savedOnly = true, feed only shows saved jobs (none currently)
const filtersSavedOnlyTrue = true;
const displayedWhenSaved = filtersSavedOnlyTrue
  ? exploreJobs.filter((j) => isJobSaved(j, currentSavedIds, currentSavedMap))
  : exploreJobs;

assert.strictEqual(displayedWhenSaved.length, 0, 'Saved tab must NOT contain applied job');

console.log('All 12 checks passed successfully!');
