/**
 * List all admin accounts from both AdminAuth and User collections.
 * Run: npx tsx scripts/list-admins.ts
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function main() {
  if (!MONGODB_URI) {
    console.error('Set MONGODB_URI or MONGO_URI env var first.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  console.log('\n=== AdminAuth collection (adminauths) ===');
  const adminAuths = await db.collection('adminauths').find({}).project({ email: 1, role: 1, lastLogin: 1, createdAt: 1 }).toArray();
  if (adminAuths.length === 0) {
    console.log('  (none)');
  } else {
    for (const a of adminAuths) {
      console.log(`  ${a.email}  role=${a.role}  lastLogin=${a.lastLogin || 'never'}  created=${a.createdAt}`);
    }
  }
  console.log(`  Total: ${adminAuths.length}`);

  console.log('\n=== User collection (users) with admin/superadmin role ===');
  const adminUsers = await db.collection('users').find({ role: { $in: ['admin', 'superadmin'] } }).project({ email: 1, name: 1, role: 1, createdAt: 1 }).toArray();
  if (adminUsers.length === 0) {
    console.log('  (none)');
  } else {
    for (const u of adminUsers) {
      console.log(`  ${u.email}  name=${u.name || ''}  role=${u.role}  created=${u.createdAt}`);
    }
  }
  console.log(`  Total: ${adminUsers.length}`);

  console.log(`\nGrand total admin accounts: ${adminAuths.length + adminUsers.length}`);

  await mongoose.disconnect();
}

main().catch(console.error);
