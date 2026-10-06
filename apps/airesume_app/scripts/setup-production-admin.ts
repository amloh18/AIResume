/**
 * Set up the single production admin account, and demote/remove every other admin.
 *
 * ⚠️ DESTRUCTIVE. This deletes every other document in `adminauths` and demotes every other
 * `admin`/`superadmin` user to `user`. Run `list-admins.ts` first to see what will be removed.
 *
 * ⚠️ EVERYTHING INSTANCE-SPECIFIC COMES FROM THE ENVIRONMENT. This file previously hardcoded a
 * production email, a developer email and — critically — the live production password, in the
 * docstring *and* as a constant. It is a public repository; no deployment's credentials or
 * identities may appear in source. Nothing here is optional: the script exits loudly rather than
 * silently operating on the wrong account.
 *
 * Required env:
 *   MONGODB_URI             connection string (MONGODB_DB selects the database, default `airesume`)
 *   PROD_ADMIN_EMAIL        the one account that is kept as superadmin
 *   PROD_ADMIN_PASSWORD     its password — used to hash, and to verify the write
 * Optional env:
 *   DEV_ADMIN_EMAILS        comma-separated localhost developer logins to preserve in `users`
 *
 * Run: npx tsx scripts/setup-production-admin.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'airesume';

const PROD_ADMIN_EMAIL = (process.env.PROD_ADMIN_EMAIL || '').trim().toLowerCase();
const PROD_ADMIN_PASSWORD = process.env.PROD_ADMIN_PASSWORD || '';
const DEV_ADMIN_EMAILS = (process.env.DEV_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI or MONGO_URI env var is required.');
    process.exit(1);
  }
  if (!PROD_ADMIN_EMAIL) {
    console.error('❌ PROD_ADMIN_EMAIL env var is required (the single superadmin to keep).');
    process.exit(1);
  }
  if (!PROD_ADMIN_PASSWORD) {
    console.error('❌ PROD_ADMIN_PASSWORD env var is required.');
    console.error('   Refusing to run: without it this script would hash an empty string and lock');
    console.error('   every admin out of the account it is supposed to set up.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB (${DB_NAME})...`);
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db!;
  console.log(`Connected to database: ${db.databaseName}`);
  console.log(`Keeping production admin: ${PROD_ADMIN_EMAIL}`);
  console.log(`Preserving developer logins: ${DEV_ADMIN_EMAILS.join(', ') || '(none)'}\n`);

  // 1. Hash the password with bcrypt salt 12 (same salt rounds used by AdminAuth and User models)
  console.log('🔒 Generating bcrypt hash for admin password...');
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(PROD_ADMIN_PASSWORD, salt);

  // 2. Setup production admin in `adminauths`
  console.log(`\n=== 1. Updating adminauths collection for ${PROD_ADMIN_EMAIL} ===`);
  const adminAuthResult = await db.collection('adminauths').updateOne(
    { email: PROD_ADMIN_EMAIL },
    {
      $set: {
        email: PROD_ADMIN_EMAIL,
        password: passwordHash,
        role: 'superadmin',
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log(
    `✅ adminauths updated (matched: ${adminAuthResult.matchedCount}, upserted: ${adminAuthResult.upsertedCount})`
  );

  // Delete all other accounts in adminauths
  const deleteAdminAuthsResult = await db.collection('adminauths').deleteMany({
    email: { $ne: PROD_ADMIN_EMAIL },
  });
  console.log(`🗑️ Deleted ${deleteAdminAuthsResult.deletedCount} non-production account(s) from adminauths`);

  // 3. Setup production admin in `users`
  console.log(`\n=== 2. Updating users collection for ${PROD_ADMIN_EMAIL} ===`);
  const userResult = await db.collection('users').updateOne(
    { email: PROD_ADMIN_EMAIL },
    {
      $set: {
        email: PROD_ADMIN_EMAIL,
        password: passwordHash,
        role: 'superadmin',
        isEmailVerified: true,
        'onboarding.activation_status': 'completed',
        userLifecycleState: 'ACTIVE',
        updatedAt: new Date(),
      },
      $unset: {
        'onboarding.activation_route': '',
      },
      $setOnInsert: {
        firstName: 'Admin',
        lastName: 'User',
        authProvider: 'local',
        authProviderId: `local_${PROD_ADMIN_EMAIL.replace(/[^a-z0-9]/g, '_')}`,
        currentPlanKey: 'focused_yearly',
        userLifecycleState: 'ACTIVE',
        subscription: {
          planKey: 'focused_yearly',
          status: 'active',
          startDate: new Date(),
          provider: 'none',
          interval: 'one-time',
          seats: 1,
          storageUsed: 0,
        },
        usage: {
          cvJourneyCount: 0,
          cvCreatedCount: 0,
          journeysCreated: 0,
          exportCount: 0,
          atsCheckCount: 0,
          lastResetDate: new Date(),
        },
        settings: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true,
          },
          timezone: 'UTC',
          languagePreference: 'en',
        },
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log(`✅ users updated for ${PROD_ADMIN_EMAIL} (matched: ${userResult.matchedCount}, upserted: ${userResult.upsertedCount})`);

  // 4. Ensure localhost developer logins are preserved in `users`
  if (DEV_ADMIN_EMAILS.length > 0) {
    console.log(`\n=== 3. Preserving localhost developer logins ===`);
    for (const devEmail of DEV_ADMIN_EMAILS) {
      const devUser = await db.collection('users').findOne({ email: devEmail });
      if (devUser) {
        await db.collection('users').updateOne(
          { email: devEmail },
          { $set: { role: 'superadmin', isEmailVerified: true } }
        );
        console.log(`✅ Preserved developer account in users: ${devEmail} (role: superadmin)`);
      } else {
        console.log(`ℹ️ Developer account ${devEmail} not found in DB yet (created on first dev-bypass)`);
      }
    }
  }

  // 5. Demote all OTHER users with admin/superadmin role to 'user'
  console.log(`\n=== 4. Demoting any other admin accounts in users ===`);
  const protectedEmails = [PROD_ADMIN_EMAIL, ...DEV_ADMIN_EMAILS];
  const demoteResult = await db.collection('users').updateMany(
    {
      role: { $in: ['admin', 'superadmin'] },
      email: { $nin: protectedEmails },
    },
    {
      $set: { role: 'user' },
    }
  );
  console.log(`Demoted ${demoteResult.modifiedCount} account(s) to 'user' role`);

  // 6. Verification
  console.log(`\n=== 5. Verification ===`);
  const remainingAuths = await db.collection('adminauths').find({}).toArray();
  console.log(`AdminAuth accounts (${remainingAuths.length}):`);
  for (const a of remainingAuths) {
    const isPwValid = await bcrypt.compare(PROD_ADMIN_PASSWORD, a.password);
    console.log(`  - ${a.email} [role: ${a.role}] password valid: ${isPwValid}`);
  }

  const remainingAdminUsers = await db
    .collection('users')
    .find({ role: { $in: ['admin', 'superadmin'] } })
    .project({ email: 1, role: 1, password: 1, isEmailVerified: 1 })
    .toArray();
  console.log(`User collection admins (${remainingAdminUsers.length}):`);
  for (const u of remainingAdminUsers) {
    let pwValidText = 'N/A (dev login)';
    if (u.password) {
      const isPwValid = await bcrypt.compare(PROD_ADMIN_PASSWORD, u.password);
      pwValidText = `password valid: ${isPwValid}`;
    }
    console.log(`  - ${u.email} [role: ${u.role}] verified: ${u.isEmailVerified} (${pwValidText})`);
  }

  await mongoose.disconnect();
  console.log('\n✨ Setup completed successfully!');
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
