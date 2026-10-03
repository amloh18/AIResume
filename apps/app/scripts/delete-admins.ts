/**
 * Delete all admin accounts EXCEPT the specified production admin and localhost developer admin.
 * Run: npx tsx scripts/delete-admins.ts
 * 
 * WARNING: This is destructive. Run list-admins.ts first to verify.
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'airesume';

const KEEP_EMAIL = 'amlowwh@gmail.com';
const DEV_EMAILS = ['amarl@buildairesume.com'];

async function main() {
  if (!MONGODB_URI) {
    console.error('Set MONGODB_URI or MONGO_URI env var first.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db!;

  console.log(`Connected to database: "${db.databaseName}"`);
  console.log(`Keeping production admin: ${KEEP_EMAIL}`);
  console.log(`Preserving developer login: ${DEV_EMAILS.join(', ')}\n`);

  // Delete from AdminAuth collection (only KEEP_EMAIL should be in AdminAuth)
  const authResult = await db.collection('adminauths').deleteMany({
    email: { $ne: KEEP_EMAIL.toLowerCase() }
  });
  console.log(`AdminAuth: deleted ${authResult.deletedCount} accounts`);

  // Remove admin/superadmin role from User collection (set back to 'user'), except KEEP_EMAIL and DEV_EMAILS
  const protectedEmails = [KEEP_EMAIL.toLowerCase(), ...DEV_EMAILS.map(e => e.toLowerCase())];
  const userResult = await db.collection('users').updateMany(
    {
      role: { $in: ['admin', 'superadmin'] },
      email: { $nin: protectedEmails }
    },
    { $set: { role: 'user' } }
  );
  console.log(`Users: demoted ${userResult.modifiedCount} admin accounts to 'user' role`);

  // Verify
  console.log('\n--- Verification ---');
  const remainingAuth = await db.collection('adminauths').find({}).project({ email: 1, role: 1 }).toArray();
  console.log(`AdminAuth accounts remaining: ${remainingAuth.length}`);
  for (const a of remainingAuth) {
    console.log(`  ${a.email} (role=${a.role})`);
  }

  const remainingAdmins = await db.collection('users').find({ role: { $in: ['admin', 'superadmin'] } }).project({ email: 1, role: 1 }).toArray();
  console.log(`User admin accounts remaining: ${remainingAdmins.length}`);
  for (const u of remainingAdmins) {
    console.log(`  ${u.email} (role=${u.role})`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(console.error);
