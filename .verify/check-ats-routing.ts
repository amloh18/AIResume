/**
 * Verifies `detectAtsFromUrl` against real apply URLs taken from production
 * (`airesume.jobs.applyUrl`, 2026-09-27) plus the embed shapes that were failing.
 *
 * Run:  npx esbuild .verify/check-ats-routing.ts --bundle --platform=node --format=esm \
 *         --alias:@=./src --outfile=.verify/build/check-ats-routing.mjs && node .verify/build/check-ats-routing.mjs
 */
import { detectAtsFromUrl, isPlaywrightAutomatable } from '@/lib/jobs/autoApplySupport';

const cases: Array<[string | null, string | null]> = [
  // ── Real production applyUrls that were parked as "unknown" ──────────────
  ['https://recruiting.paylocity.com/recruiting/Jobs/Details/4535997', null],
  ['https://tggaccounting.bamboohr.com/careers/1052', null],
  ['https://cityoflonetree.bamboohr.com/careers/87', null],
  ['https://careers-swissport.icims.com/jobs/8866/baggage-hall-agent/job', null],
  [
    'https://tiketdotcom.wd3.myworkdayjobs.com/tiket_careers/job/Singapore-Singapore/Market-Manager--Singapore-_R-3343',
    'workday',
  ],
  [
    'https://syneoshealth.wd12.myworkdayjobs.com/syneos_health_external_site/job/IND-Hyderabad-Hybrid/Vendor-Tech-Life-Sciences-Counsel-I_25110655',
    'workday',
  ],
  ['https://tjx.wd1.myworkdayjobs.com/tjx_external/job/Shreveport-LA-71105/Retail-Merchandise-Associate_REQ158616', 'workday'],

  // ── Greenhouse company-hosted embeds (the SB-05 class) ───────────────────
  ['https://stripe.com/jobs/search?gh_jid=8190046', 'greenhouse'],
  ['https://stripe.com/jobs/search?gh_jid=8194604', 'greenhouse'],
  ['https://careers.airbnb.com/positions/8232474?gh_jid=8232474', 'greenhouse'],
  ['https://jobs.elastic.co/jobs?gh_jid=8121805&gh_jid=8121805', 'greenhouse'],

  // ── Direct boards ────────────────────────────────────────────────────────
  ['https://job-boards.greenhouse.io/stripe/jobs/123', 'greenhouse'],
  ['https://boards.greenhouse.io/embed/job_app?for=stripe&token=8194604', 'greenhouse'],
  ['https://boards.greenhouse.io/someco/jobs/456', 'greenhouse'],
  ['https://jobs.lever.co/someco/abc-123', 'lever'],
  ['https://apply.workable.com/someco/j/ABC123/', 'workable'],
  ['https://jobs.ashbyhq.com/elevenlabs/347282a4-74ff-4e56-a92d-3c4249ee6c28/application', 'ashby'],

  // ── Other supported sources ──────────────────────────────────────────────
  ['https://www.naukri.com/job-listings-something', 'naukri'],
  ['https://www.indeed.com/viewjob?jk=abc', 'indeed'],
  ['https://www.adzuna.co.uk/jobs/details/123', 'adzuna'],

  // ── Degenerate input must not throw ──────────────────────────────────────
  ['', null],
  [null, null],
  [undefined, null],
  ['not a url at all', null],
  ['   ', null],
];

let pass = 0;
let fail = 0;

console.log('detectAtsFromUrl — production URLs\n');
for (const [url, want] of cases) {
  let got: string | null;
  try {
    got = detectAtsFromUrl(url as any);
  } catch (err: any) {
    got = `THREW: ${err.message}` as any;
  }
  const ok = got === want;
  ok ? pass++ : fail++;
  const label = url === null ? 'null' : url === undefined ? 'undefined' : JSON.stringify(url);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.slice(0, 78).padEnd(80)} got=${String(got).padEnd(12)} want=${want}`);
}

console.log('\nworker gate — PLAYWRIGHT_AUTOMATABLE_ATS');
const gate: Array<[string, boolean]> = [
  ['greenhouse', true],
  ['lever', true],
  ['ashby', true],
  ['workable', true],
  // SB-04: no `case 'workday'` exists in UnifiedApplyService.apply — must NOT pass the gate.
  ['workday', false],
  ['unknown', false],
  ['naukri', false],
  ['indeed', false],
  ['adzuna', false],
];
for (const [ats, want] of gate) {
  const got = isPlaywrightAutomatable(ats);
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${ats.padEnd(12)} got=${String(got).padEnd(6)} want=${want}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
