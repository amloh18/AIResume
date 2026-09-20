/**
 * READ-ONLY. Why might email+password sign-in fail for these specific accounts?
 *
 * authenticateUser() returns a specific error for each of these conditions:
 *   !user.password      -> 'Please sign in with Google'
 *   !isEmailVerified    -> 'Please verify your email before signing in'
 *   bad password        -> 'Invalid credentials'
 *
 * So the account flags alone tell us which branch it takes. Password hashes are
 * NOT printed - only whether one exists.
 */
import fs from 'fs';
import { MongoClient } from 'mongodb';

const env = fs.readFileSync('.env.local', 'utf8');
const uri = env.match(/^MONGODB_URI=(.*)$/m)?.[1]?.trim();

const c = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await c.connect();
const db = c.db('airesume');

const emails = [
  'amarjotasl@gmail.com',
  'lychees_38_pacer@icloud.com',
  'amlowwh@gmail.com',
  'amarl@cvcircle.io',
];

for (const email of emails) {
  const u = await db.collection('users').findOne(
    { email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    { projection: { email: 1, password: 1, isEmailVerified: 1, authProvider: 1, authProviderId: 1, role: 1, lastLogin: 1, createdAt: 1, userLifecycleState: 1 } }
  );

  if (!u) {
    console.log(`\n${email}\n  NOT FOUND in airesume.users`);
    continue;
  }

  const hasPassword = typeof u.password === 'string' && u.password.length > 0;
  console.log(`\n${email}`);
  console.log('  _id            =', String(u._id));
  console.log('  has password   =', hasPassword, hasPassword ? `(bcrypt=${u.password.startsWith('$2')})` : '');
  console.log('  isEmailVerified=', u.isEmailVerified);
  console.log('  authProvider   =', u.authProvider);
  console.log('  authProviderId =', u.authProviderId);
  console.log('  role           =', u.role);
  console.log('  lifecycle      =', u.userLifecycleState);
  console.log('  lastLogin      =', u.lastLogin);
  console.log('  createdAt      =', u.createdAt);
  console.log('  -> credentials sign-in path:',
    !hasPassword ? 'REJECTED: "Please sign in with Google" (no password set)'
      : !u.isEmailVerified ? 'REJECTED: "Please verify your email before signing in"'
        : 'password comparison runs');
}

// Is the AdminAuth collection involved? It is a fallback in authenticateUser.
const adminHits = await db.collection('adminauths').find({}, { projection: { email: 1 } }).limit(10).toArray();
console.log('\nadminauths emails:', adminHits.map((a) => a.email).join(', ') || '(none)');

await c.close();
