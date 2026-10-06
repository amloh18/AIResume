/**
 * Backfill Script: cvTailoringMode -> canonical store
 *
 * Background
 * ----------
 * The "Auto CV: Normal | Standout" toggle on the Jobs explore page used to
 * write `JobSearchProfile.cvTailoringMode` only, while Journey document
 * generation reads `User.settings.cvTailoringMode`
 * (see `src/lib/cv-tailoring/getUserCvTailoringMode.ts`).
 *
 * Both write paths are now mirrored in both directions, but existing rows
 * still hold their value in the legacy store. This script copies the legacy
 * value into the canonical store so no user silently loses their preference.
 *
 * Conflict policy (deterministic — never guesses)
 * ----------------------------------------------
 * Both documents declare `default: 'standard'`, so an explicit "standard"
 * cannot be distinguished from an untouched default by value alone. When the
 * two stores disagree we fall back to the most recent document `updatedAt`:
 *
 *   profile.updatedAt > user.updatedAt  -> legacy wins, canonical is backfilled
 *   user.updatedAt    >= profile.updatedAt -> canonical wins, conflict reported
 *
 * `--force` overrides the above and always copies the legacy value.
 *
 * This script is idempotent and non-destructive: it only ever writes
 * `User.settings.cvTailoringMode`, never touches CVs, journeys or profiles.
 *
 * Usage:
 *   npx tsx scripts/backfill-cv-tailoring-mode.ts [--dry-run] [--user-id=xxx] [--verbose] [--force]
 *
 * Flags:
 *   --dry-run    Report what would change without writing
 *   --user-id    Process only one user (testing)
 *   --verbose    Log per-user decisions, including conflicts
 *   --force      Overwrite the canonical value from the legacy value
 */

import mongoose from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const FORCE = process.argv.includes('--force');
const SPECIFIC_USER_ID = process.argv.find((arg) => arg.startsWith('--user-id='))?.split('=')[1];

const VALID_MODES = ['standard', 'standout'] as const;
type CvTailoringMode = (typeof VALID_MODES)[number];

const stats = {
  profilesScanned: 0,
  usersLoaded: 0,
  alreadyAligned: 0,
  backfilled: 0,
  forced: 0,
  conflictsKept: 0,
  invalidLegacyValue: 0,
  noUser: 0,
  errors: 0,
};

function isValidMode(value: unknown): value is CvTailoringMode {
  return typeof value === 'string' && (VALID_MODES as readonly string[]).includes(value);
}

function log(message: string) {
  console.log(message);
}

function vlog(message: string) {
  if (VERBOSE) console.log(message);
}

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buildairesume';
  await mongoose.connect(MONGODB_URI);
  log(`Connected to MongoDB (${MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')})`);
}

async function main() {
  await connectDB();

  const UserModule = await import('../src/models/User');
  const JobSearchProfileModule = await import('../src/models/JobSearchProfile');
  const User: any = UserModule.default;
  const JobSearchProfile: any = JobSearchProfileModule.default;

  const profileQuery: Record<string, any> = {
    cvTailoringMode: { $exists: true, $ne: null },
  };
  if (SPECIFIC_USER_ID) profileQuery.userId = SPECIFIC_USER_ID;

  const profiles = await JobSearchProfile.find(profileQuery)
    .select('userId cvTailoringMode updatedAt')
    .lean();

  log(`Found ${profiles.length} JobSearchProfile document(s) with a cvTailoringMode.`);
  if (DRY_RUN) log('DRY RUN — no writes will be performed.');
  if (FORCE) log('FORCE — legacy value will overwrite the canonical value.');

  for (const profile of profiles as any[]) {
    stats.profilesScanned += 1;

    const legacyMode = profile.cvTailoringMode;
    if (!isValidMode(legacyMode)) {
      stats.invalidLegacyValue += 1;
      vlog(`  [invalid] profile ${profile._id} has cvTailoringMode=${JSON.stringify(legacyMode)} — skipped`);
      continue;
    }

    const user = await User.findById(profile.userId)
      .select('settings.cvTailoringMode updatedAt')
      .lean();
    stats.usersLoaded += 1;

    if (!user) {
      stats.noUser += 1;
      vlog(`  [no-user] profile ${profile._id} references missing user ${profile.userId}`);
      continue;
    }

    const canonicalRaw = (user as any)?.settings?.cvTailoringMode;
    const canonicalMode = isValidMode(canonicalRaw) ? canonicalRaw : undefined;

    if (canonicalMode === legacyMode && !FORCE) {
      stats.alreadyAligned += 1;
      vlog(`  [ok] user ${profile.userId} already '${legacyMode}'`);
      continue;
    }

    const profileUpdatedAt = profile.updatedAt ? new Date(profile.updatedAt).getTime() : 0;
    const userUpdatedAt = (user as any).updatedAt ? new Date((user as any).updatedAt).getTime() : 0;

    let shouldWrite = FORCE;
    let reason = 'forced by --force';

    if (!shouldWrite) {
      if (canonicalMode === undefined) {
        shouldWrite = true;
        reason = 'canonical unset';
      } else if (profileUpdatedAt > userUpdatedAt) {
        shouldWrite = true;
        reason = `legacy newer (${new Date(profileUpdatedAt).toISOString()} > ${new Date(userUpdatedAt).toISOString()})`;
      } else {
        reason = `canonical newer or equal (${new Date(userUpdatedAt).toISOString()} >= ${new Date(profileUpdatedAt).toISOString()})`;
      }
    }

    if (!shouldWrite) {
      stats.conflictsKept += 1;
      vlog(
        `  [conflict] user ${profile.userId}: canonical='${canonicalMode}' legacy='${legacyMode}' -> keeping canonical (${reason})`
      );
      continue;
    }

    if (DRY_RUN) {
      log(`  [would-backfill] user ${profile.userId}: '${canonicalMode ?? '<unset>'}' -> '${legacyMode}' (${reason})`);
    } else {
      try {
        await User.findByIdAndUpdate(profile.userId, {
          'settings.cvTailoringMode': legacyMode,
        });
        log(`  [backfilled] user ${profile.userId}: '${canonicalMode ?? '<unset>'}' -> '${legacyMode}' (${reason})`);
      } catch (error: any) {
        stats.errors += 1;
        console.error(`  [error] user ${profile.userId}: ${error?.message || error}`);
        continue;
      }
    }

    if (FORCE) stats.forced += 1;
    else stats.backfilled += 1;
  }

  log('');
  log('--- Summary ---');
  log(`  profiles scanned:        ${stats.profilesScanned}`);
  log(`  already aligned:         ${stats.alreadyAligned}`);
  log(`  ${DRY_RUN ? 'would backfill' : 'backfilled'}:          ${stats.backfilled}`);
  if (FORCE) log(`  forced overwrites:       ${stats.forced}`);
  log(`  conflicts kept (canonical wins): ${stats.conflictsKept}`);
  log(`  invalid legacy values:   ${stats.invalidLegacyValue}`);
  log(`  missing users:           ${stats.noUser}`);
  log(`  errors:                  ${stats.errors}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    /* noop */
  }
  process.exit(1);
});
