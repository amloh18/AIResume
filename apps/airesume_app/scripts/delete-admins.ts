/**
 * Delete every admin account EXCEPT the configured production admin, and demote every other
 * `admin`/`superadmin` user to `user`.
 *
 * WARNING: destructive. Run `list-admins.ts` first to verify what will be removed.
 *
 * ⚠️ IDENTITIES COME FROM THE ENVIRONMENT. This file previously hardcoded a production admin
 * address and a developer address. It is a public repository, so no deployment's accounts may
 * appear in source.
 *
 * Required env:
 *   MONGODB_URI        connection string (MONGODB_DB selects the database, default `airesume`)
 *   PROD_ADMIN_EMAIL   the one account to keep
 * Optional env:
 *   DEV_ADMIN_EMAILS   comma-separated localhost developer logins to also preserve
 *
 * Run: npx tsx scripts/delete-admins.ts
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'airesume';

const KEEP_EMAIL = (process.env.PROD_ADMIN_EMAIL || '').trim().toLowerCase();
const DEV_EMAILS = (process.env.DEV_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  if (!MONGODB_URI) {
    console.error('Set MONGODB_URI or MONGO_URI env var first.');
    process.exit(1);
  }

  // ⚠️ Load-bearing guard. The deletes below are `email: { $ne: KEEP_EMAIL }`, so an EMPTY
  // KEEP_EMAIL would match every document and wipe every admin account in the database.
  if (!KEEP_EMAIL) {
    console.error('❌ PROD_ADMIN_EMAIL env var is required.');
    console.error('   Refusing to run: without it every admin account would be deleted.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db!;

  console.log(`Connected to database: "${db.databaseName}"`);
  console.log(`Keeping production admin: ${KEEP_EMAIL}`);
  console.log(`Preserving developer logins: ${DEV_EMAILS.join(', ') || '(none)'}\n`);

  // Delete from AdminAuth collection (only KEEP_EMAIL should be in AdminAuth)
  const authResult = await db.collection('adminauths').deleteMany({
    email: { $ne: KEEP_EMAIL },
  });
  console.log(`AdminAuth: deleted ${authResult.deletedCount} accounts`);

  // Remove admin/superadmin role from User collection (set back to 'user'), except KEEP_EMAIL and DEV_EMAILS
  const protectedEmails = [KEEP_EMAIL, ...DEV_EMAILS];
  const userResult = await db.collection('users').updateMany(
    {
      role: { $in: ['admin', 'superadmin'] },
      email: { $nin: protectedEmails },
    },
    { $set: { role: 'user' } }
  );
  console.log(`Users: demoted ${userResult.modifiedCount} admin accounts to 'user' role`);

  // Verify
  console.log('\n--- Verification ---');
  const remainingAuth = await db
    .collection('adminauths')
    .find({})
    .project({ email: 1, role: 1 })
    .toArray();
  console.log(`AdminAuth accounts remaining: ${remainingAuth.length}`);
  for (const a of remainingAuth) {
    console.log(`  ${a.email} (role=${a.role})`);
  }

  const remainingAdmins = await db
    .collection('users')
    .find({ role: { $in: ['admin', 'superadmin'] } })
    .project({ email: 1, role: 1 })
    .toArray();
  console.log(`User admin accounts remaining: ${remainingAdmins.length}`);
  for (const u of remainingAdmins) {
    console.log(`  ${u.email} (role=${u.role})`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(console.error);
