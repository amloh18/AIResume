/**
 * Deduplicate Users and Create Unique Index on Email
 *
 * Runs natively in Node 20+ without TypeScript compilation.
 *
 * Usage:
 *   node scripts/deduplicate-users.mjs --dry-run
 *   node scripts/deduplicate-users.mjs --apply
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/airesume';

const COLLECTIONS_TO_REASSIGN = [
  'cvs',
  'coverletters',
  'jobs',
  'jobapplications',
  'applicationjourneys',
  'morichats',
  'invoices',
  'supportnotes',
  'loginsessions',
  'companywatchlists',
  'interviewsessions',
  'autoapplyreservations',
  'activitylogs',
  'feedbacks',
  'notifications',
  'emailthreads',
  'emailmessages',
  'temporarycvdrafts',
  'portaljobsynctasks',
  'verificationtokens'
];

async function run() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = !isApply;

  console.log(`\n======================================================`);
  console.log(`   BuildAIResume - User Deduplication & Index Fix     `);
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (No changes will be written)' : 'LIVE APPLY (Modifying database)'}`);
  console.log(`======================================================\n`);

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Failed to get database connection');
  }

  const usersCollection = db.collection('users');

  // Find all duplicates grouped by normalized email
  console.log(`Analyzing user collection...`);
  const duplicateGroups = await usersCollection.aggregate([
    {
      $project: {
        normalizedEmail: { $toLower: { $trim: { input: '$email' } } },
        originalEmail: '$email',
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
        lastLogin: '$lastLogin',
        isEmailVerified: '$isEmailVerified',
        subscriptionStatus: '$subscription.status'
      }
    },
    {
      $group: {
        _id: '$normalizedEmail',
        count: { $sum: 1 },
        userIds: { $push: '$_id' }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log(`Found ${duplicateGroups.length} duplicate email groups.\n`);

  let totalDuplicatesToRemove = 0;
  let totalReassignedDocs = 0;

  for (const group of duplicateGroups) {
    const email = group._id;
    const userIds = group.userIds;

    console.log(`--------------------------------------------------`);
    console.log(`Group: ${email} (${userIds.length} duplicate accounts)`);

    // Fetch user documents and score them
    const candidates = [];

    for (const uid of userIds) {
      const u = await usersCollection.findOne({ _id: uid });
      if (!u) continue;

      const uidStr = uid.toString();
      const cvFilter = { $or: [{ userId: uid }, { userId: uidStr }] };

      const cvCount = await db.collection('cvs').countDocuments(cvFilter);
      const masterCV = await db.collection('cvs').findOne({ ...cvFilter, cvType: 'master' });
      const hasMasterCV = !!masterCV;

      const appCount = await db.collection('jobapplications').countDocuments({
        $or: [{ userId: uid }, { userId: uidStr }]
      });

      const journeyCount = await db.collection('applicationjourneys').countDocuments({
        $or: [{ userId: uid }, { userId: uidStr }]
      });

      // Calculate score
      let score = 0;
      if (cvCount > 0) score += cvCount * 1000;
      if (hasMasterCV) score += 500;
      if (appCount > 0) score += appCount * 100;
      if (journeyCount > 0) score += journeyCount * 50;
      if (u.subscription?.status === 'active') score += 2000;
      if (u.isEmailVerified) score += 50;
      if (u.password) score += 100; // Local auth user with password

      if (u.lastLogin) {
        score += 200 + Math.min(100, Math.floor(new Date(u.lastLogin).getTime() / 1e11));
      } else {
        score -= 50; // penalize imported empty accounts with no login
      }

      candidates.push({
        _id: uid,
        email: u.email,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLogin: u.lastLogin,
        isEmailVerified: !!u.isEmailVerified,
        subscription: u.subscription,
        cvCount,
        hasMasterCV,
        appCount,
        journeyCount,
        score
      });
    }

    // Sort candidates by score descending, then by lastLogin descending, then by createdAt ascending (oldest first)
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bLogin = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      const aLogin = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      if (bLogin !== aLogin) return bLogin - aLogin;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aCreated - bCreated;
    });

    const canonical = candidates[0];
    const duplicates = candidates.slice(1);

    console.log(`  -> Canonical User: ${canonical._id} (Score: ${canonical.score}, CVs: ${canonical.cvCount}, MasterCV: ${canonical.hasMasterCV}, Apps: ${canonical.appCount}, LastLogin: ${canonical.lastLogin || 'never'})`);

    for (const dup of duplicates) {
      console.log(`  -> Duplicate to remove: ${dup._id} (Score: ${dup.score}, CVs: ${dup.cvCount}, MasterCV: ${dup.hasMasterCV}, Apps: ${dup.appCount}, LastLogin: ${dup.lastLogin || 'never'})`);
      totalDuplicatesToRemove++;

      const dupId = dup._id;
      const dupIdStr = dupId.toString();
      const canId = canonical._id;
      const canIdStr = canId.toString();

      // If duplicate has a master CV and canonical already has one, convert duplicate's to standalone
      if (dup.hasMasterCV) {
        if (canonical.hasMasterCV) {
          console.log(`     [Conflict] Duplicate has Master CV, but canonical already has one. Demoting duplicate Master CV to standalone.`);
          if (isApply) {
            await db.collection('cvs').updateMany(
              { $or: [{ userId: dupId }, { userId: dupIdStr }], cvType: 'master' },
              { $set: { cvType: 'standalone', 'metadata.isMaster': false } }
            );
          }
        }
      }

      // Reassign child records across collections
      for (const colName of COLLECTIONS_TO_REASSIGN) {
        const col = db.collection(colName);
        const countObj = await col.countDocuments({ userId: dupId });
        const countStr = await col.countDocuments({ userId: dupIdStr });
        const total = countObj + countStr;

        if (total > 0) {
          console.log(`     Reassigning ${total} doc(s) in '${colName}' (${countObj} ObjectId, ${countStr} String) -> ${canId}`);
          totalReassignedDocs += total;

          if (isApply) {
            if (countObj > 0) {
              await col.updateMany({ userId: dupId }, { $set: { userId: canId } });
            }
            if (countStr > 0) {
              await col.updateMany({ userId: dupIdStr }, { $set: { userId: canIdStr } });
            }
          }
        }
      }

      // Handle UserSettings (unique index on userId)
      const dupSettings = await db.collection('usersettings').findOne({
        $or: [{ userId: dupId }, { userId: dupIdStr }]
      });
      if (dupSettings) {
        const canSettings = await db.collection('usersettings').findOne({
          $or: [{ userId: canId }, { userId: canIdStr }]
        });
        if (canSettings) {
          console.log(`     Canonical already has UserSettings, removing duplicate's settings.`);
          if (isApply) {
            await db.collection('usersettings').deleteOne({ _id: dupSettings._id });
          }
        } else {
          console.log(`     Reassigning UserSettings to canonical user.`);
          if (isApply) {
            await db.collection('usersettings').updateOne(
              { _id: dupSettings._id },
              { $set: { userId: canId } }
            );
          }
        }
      }

      // Delete the duplicate user
      if (isApply) {
        await usersCollection.deleteOne({ _id: dupId });
        console.log(`     Deleted duplicate user ${dupId}`);
      }
    }

    // Ensure canonical user email is normalized to lowercase trimmed
    if (isApply) {
      await usersCollection.updateOne(
        { _id: canonical._id },
        { $set: { email: email.toLowerCase().trim() } }
      );
    }
  }

  console.log(`\n======================================================`);
  console.log(`Summary:`);
  console.log(`- Duplicate Groups Processed: ${duplicateGroups.length}`);
  console.log(`- Duplicate Users to Remove: ${totalDuplicatesToRemove}`);
  console.log(`- Child Documents Reassigned: ${totalReassignedDocs}`);
  console.log(`======================================================\n`);

  if (isApply) {
    console.log(`Normalizing all remaining user emails to lowercase and trimmed...`);
    const allUsers = await usersCollection.find({}, { projection: { _id: 1, email: 1 } }).toArray();
    for (const u of allUsers) {
      if (u.email) {
        const norm = u.email.toLowerCase().trim();
        if (norm !== u.email) {
          await usersCollection.updateOne({ _id: u._id }, { $set: { email: norm } });
        }
      }
    }

    console.log(`Creating unique index on users.email...`);
    try {
      await usersCollection.createIndex({ email: 1 }, { unique: true, background: true });
      console.log(`✅ Unique index on users.email successfully created!`);
    } catch (err) {
      console.error(`❌ Failed to create unique index on users.email:`, err.message);
    }
  } else {
    console.log(`[DRY RUN COMPLETE] To execute these changes and create the unique index, run:`);
    console.log(`  node scripts/deduplicate-users.mjs --apply\n`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal error during deduplication:', err);
  process.exit(1);
});
