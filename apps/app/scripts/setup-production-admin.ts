/**
 * Setup Production Admin Account and Clean Up Non-Production Admins
 *
 * Requirements:
 * 1. Keep localhost developer login (amarl@buildairesume.com with role 'superadmin' in users).
 * 2. Only one production admin: "amlowwh@gmail.com" (role 'superadmin').
 * 3. Set password for "amlowwh@gmail.com" to "Y@nknenadd1" in both adminauths and users.
 * 4. Remove other admins from adminauths and demote other users to role 'user'.
 *
 * Run: npx tsx scripts/setup-production-admin.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'airesume';

const PROD_ADMIN_EMAIL = 'amlowwh@gmail.com';
const PROD_ADMIN_PASSWORD = 'Y@nknenadd1';
const DEV_ADMIN_EMAILS = ['amarl@buildairesume.com'];

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI or MONGO_URI env var is required.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB (${DB_NAME})...`);
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db!;
  console.log(`Connected to database: ${db.databaseName}\n`);

  // 1. Hash the password with bcrypt salt 12 (same salt rounds used by AdminAuth and User models)
  console.log('🔒 Generating bcrypt hash for admin password...');
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(PROD_ADMIN_PASSWORD, salt);

  // 2. Setup production admin in `adminauths`
  console.log(`\n=== 1. Updating adminauths collection for ${PROD_ADMIN_EMAIL} ===`);
  const adminAuthResult = await db.collection('adminauths').updateOne(
    { email: PROD_ADMIN_EMAIL.toLowerCase() },
    {
      $set: {
        email: PROD_ADMIN_EMAIL.toLowerCase(),
        password: passwordHash,
        role: 'superadmin',
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      }
    },
    { upsert: true }
  );
  console.log(`✅ adminauths updated (matched: ${adminAuthResult.matchedCount}, upserted: ${adminAuthResult.upsertedCount})`);

  // Delete all other accounts in adminauths
  const deleteAdminAuthsResult = await db.collection('adminauths').deleteMany({
    email: { $ne: PROD_ADMIN_EMAIL.toLowerCase() }
  });
  console.log(`🗑️ Deleted ${deleteAdminAuthsResult.deletedCount} non-production account(s) from adminauths`);

  // 3. Setup production admin in `users`
  console.log(`\n=== 2. Updating users collection for ${PROD_ADMIN_EMAIL} ===`);
  const userResult = await db.collection('users').updateOne(
    { email: PROD_ADMIN_EMAIL.toLowerCase() },
    {
      $set: {
        email: PROD_ADMIN_EMAIL.toLowerCase(),
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
        firstName: 'Amar',
        lastName: 'Admin',
        authProvider: 'local',
        authProviderId: `local_${PROD_ADMIN_EMAIL.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
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
      }
    },
    { upsert: true }
  );
  console.log(`✅ users updated for ${PROD_ADMIN_EMAIL} (matched: ${userResult.matchedCount}, upserted: ${userResult.upsertedCount})`);

  // 4. Ensure localhost developer login is preserved in `users`
  console.log(`\n=== 3. Preserving localhost developer login ===`);
  for (const devEmail of DEV_ADMIN_EMAILS) {
    const devUser = await db.collection('users').findOne({ email: devEmail.toLowerCase() });
    if (devUser) {
      await db.collection('users').updateOne(
        { email: devEmail.toLowerCase() },
        { $set: { role: 'superadmin', isEmailVerified: true } }
      );
      console.log(`✅ Preserved developer account in users: ${devEmail} (role: superadmin)`);
    } else {
      console.log(`ℹ️ Developer account ${devEmail} not found in DB yet (will be created automatically on first localhost dev-bypass)`);
    }
  }

  // 5. Demote all OTHER users with admin/superadmin role to 'user'
  console.log(`\n=== 4. Demoting any other admin accounts in users ===`);
  const protectedEmails = [PROD_ADMIN_EMAIL.toLowerCase(), ...DEV_ADMIN_EMAILS.map(e => e.toLowerCase())];
  const demoteResult = await db.collection('users').updateMany(
    {
      role: { $in: ['admin', 'superadmin'] },
      email: { $nin: protectedEmails }
    },
    {
      $set: { role: 'user' }
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

  const remainingAdminUsers = await db.collection('users').find({
    role: { $in: ['admin', 'superadmin'] }
  }).project({ email: 1, role: 1, password: 1, isEmailVerified: 1 }).toArray();
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
