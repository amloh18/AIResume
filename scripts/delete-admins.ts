/**
 * Delete all admin accounts EXCEPT the specified email.
 * Run: npx tsx scripts/delete-admins.ts
 * 
 * WARNING: This is destructive. Run list-admins.ts first to verify.
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const KEEP_EMAIL = 'amlowwh@gmail.com';

async function main() {
  if (!MONGODB_URI) {
    console.error('Set MONGODB_URI or MONGO_URI env var first.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  console.log(`Keeping admin: ${KEEP_EMAIL}\n`);

  // Delete from AdminAuth collection
  const authResult = await db.collection('adminauths').deleteMany({
    email: { $ne: KEEP_EMAIL.toLowerCase() }
  });
  console.log(`AdminAuth: deleted ${authResult.deletedCount} accounts`);

  // Remove admin/superadmin role from User collection (set back to 'user')
  const userResult = await db.collection('users').updateMany(
    { role: { $in: ['admin', 'superadmin'] }, email: { $ne: KEEP_EMAIL.toLowerCase() } },
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
