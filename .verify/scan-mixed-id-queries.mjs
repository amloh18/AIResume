#!/usr/bin/env node
/**
 * SB-06 sweep helper — find bare-equality *queries* on `Schema.Types.Mixed` id paths.
 *
 * A `Mixed` path is not cast by Mongoose, so `{ userId: <ObjectId> }` silently misses rows stored
 * with the string form and vice versa. This scans every file that imports a model owning a Mixed id
 * path and reports lines where that path is a query predicate without a dual-shape guard.
 *
 * Attribution matters: a file that imports `JobApplication` also contains `CV.findOne({ userId })`,
 * and `CV.userId` is a plain ObjectId path that needs no guard. So every candidate line is matched
 * against the **receiver** of its enclosing query call, resolved through the file's own imports.
 *
 * ⚠️  KNOWN LIMITS — a `0` from this tool is necessary, not sufficient.
 *  1. **Barrel imports are now handled, but were not.** The first version discovered files with
 *     `grep -rl '@/models/<Model>'`. A file that imports from the `@/models` barrel
 *     (`import { JobApplication, User } from '@/models'`) contains no such string and was never
 *     opened — 53 files hid behind that, including `dailySummaryEmailService.ts`, which was a live
 *     bug. Both `filesImporting` and `aliasesFor` now resolve the barrel form.
 *  2. **Namespace imports are still missed.** `import * as M from '@/models'` → `M.JobApplication`
 *     is not resolved. (None exist in the tree today; re-check with
 *     `grep -rn "import \* as .* from '@/models'" src` before trusting a 0.)
 *  3. **A pre-computed id variable is still flagged only if the receiver resolves.** The tool keys on
 *     `receiver.path:`, not on the value, so `const oid = new ObjectId(id); Model.find({userId: oid})`
 *     *is* caught — but a re-exported wrapper (`const q = Model.find; q({userId: oid})`) is not.
 *  4. Tests are excluded by design (they build fixtures, not production queries).
 *
 * Read-only. Prints `file:line  receiver.path  code` for review; it does not decide, it enumerates.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();

// model -> the id paths on that model that are `Schema.Types.Mixed`
const MIXED_PATHS = {
  JobApplication: ['userId', 'cvId', 'coverLetterId'],
  ApplicationQueue: ['applicationId', 'userId', 'jobId'],
  UserSettings: ['userId'],
  AutoApplyReservation: ['userId', 'applicationId', 'journeyId', 'queueItemId'],
  PortalConnection: ['userId'],
  PortalJobSyncTask: ['userId', 'portalConnectionId'],
  Communication: ['jobId', 'applicationId', 'companyId', 'contactId', 'threadId'],
  CoverLetter: ['jobId', 'cvId', 'journeyId'],
  ApplicationEvent: ['jobId'],
  CompanyWatchlist: ['userId'],
  PaymentMethod: ['userId'],
  VerificationToken: ['userId'],
  Feedback: ['userId'],
  MoriChat: ['userId', 'cvId'],
  Invoice: ['userId'],
  Advocate: ['userId'],
};

const QUERY_CALL = /([A-Za-z_$][\w$]*)\s*\.\s*(find|findOne|findOneAndUpdate|findOneAndDelete|updateOne|updateMany|deleteOne|deleteMany|countDocuments|distinct|aggregate|exists)\s*\(/g;
const GUARDED = /\$in|\$or|mixedIdFilter|idShapes|userFilter|\$ne|\$exists|isValidObjectId|isValid\(|\.select\(|\.project\(/;

/** Local identifiers bound to each model in this file. */
function aliasesFor(src, model) {
  const names = new Set();

  const addClause = (clause) => {
    for (const part of clause.replace(/[{}]/g, ',').split(',')) {
      const t = part.trim().replace(/^type\s+/, '');
      if (!t) continue;
      const asMatch = t.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
      names.add(asMatch ? asMatch[1] : t.split(/\s+/)[0]);
    }
  };

  // Direct model import: `import JobApplication from '@/models/JobApplication'`
  // Anchored to a line start and newline-free on purpose: a lazy `[\s\S]*?` spans import
  // statements, which made `ApplicationJourney` look like an alias of `JobApplication`.
  for (const m of src.matchAll(/^import\s+([^\n]*?)\s+from\s+['"]@\/models\/([A-Za-z0-9_]+)['"]/gm)) {
    if (m[2] !== model) continue;
    addClause(m[1]);
  }

  // Barrel import: `import { JobApplication, ApplicationJourney, User } from '@/models'`.
  // The model name lives in the destructuring, not the module path — which is why the original
  // path-only discovery could not see these files at all.
  for (const m of src.matchAll(/^import\s*\{([^\n]*?)\}\s*from\s*['"]@\/models['"]/gm)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/^type\s+/, '');
      if (!t) continue;
      const asMatch = t.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      const imported = asMatch ? asMatch[1] : t.split(/\s+/)[0];
      const local = asMatch ? asMatch[2] : t.split(/\s+/)[0];
      if (imported === model) names.add(local);
    }
  }

  // Dynamic default import: `const { default: Model } = await import('@/models/Model')`
  for (const m of src.matchAll(/default:\s*([A-Za-z_$][\w$]*)\s*\}\s*=\s*await\s+import\(\s*['"]@\/models\/([A-Za-z0-9_]+)['"]/g)) {
    if (m[2] === model) names.add(m[1]);
  }

  return names;
}

function grepFiles(pattern) {
  try {
    return execFileSync(
      'grep',
      ['-rl', pattern, 'src', '--include=*.ts', '--include=*.tsx'],
      { cwd: ROOT, encoding: 'utf8' }
    ).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function filesImporting(model) {
  const files = new Set(grepFiles(`@/models/${model}`));
  // A barrel import names the model in the destructuring, so the path grep above misses it.
  for (const f of grepFiles(`from ['"]@/models['"]`)) {
    let src;
    try {
      src = readFileSync(path.join(ROOT, f), 'utf8');
    } catch {
      continue;
    }
    if (new RegExp(`\\b${model}\\b`).test(src)) files.add(f);
  }
  return [...files];
}

const findings = [];

for (const [model, paths] of Object.entries(MIXED_PATHS)) {
  for (const rel of filesImporting(model)) {
    if (rel.includes('.test.')) continue; // tests build fixtures, not production queries
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    const aliases = aliasesFor(src, model);
    if (aliases.size === 0) continue;
    const lines = src.split('\n');

    lines.forEach((line, i) => {
      const code = line.trim();
      if (code.startsWith('//') || code.startsWith('*') || code.startsWith('console.')) return;

      for (const p of paths) {
        if (!new RegExp(`(^|[{,\\s'"])${p}:`).test(line)) continue;
        if (GUARDED.test(line)) continue;
        if (/:\s*[01]\s*[,}]?\s*$/.test(code)) continue; // projection value
        if (new RegExp(`\\b${p}:\\s*[01]\\b`).test(line)) continue; // projection value

        // nearest enclosing query call, walking back for multi-line filters
        const window = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
        const calls = [...window.matchAll(QUERY_CALL)];
        if (!calls.length) continue;
        const receiver = calls[calls.length - 1][1];
        if (!aliases.has(receiver)) continue;

        // The lookback is a heuristic, so reject the case it gets wrong: a field of a *response*
        // body that happens to sit within 6 lines of a query on the same path
        // (`NextResponse.json({ data: { userId: user._id } })` after a `countDocuments`).
        const afterCall = window.slice(calls[calls.length - 1].index);
        if (/NextResponse\.json\s*\(/.test(afterCall)) continue;

        findings.push({ file: rel, line: i + 1, path: `${receiver}.${p}`, code });
        break;
      }
    });
  }
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

console.log(`\n${findings.length} bare-equality query site(s) on a Mixed id path, in ${byFile.size} file(s)\n`);
for (const [file, items] of [...byFile.entries()].sort()) {
  console.log(file);
  for (const it of items) console.log(`  ${String(it.line).padStart(5)}  ${it.path.padEnd(40)} ${it.code}`);
  console.log();
}
