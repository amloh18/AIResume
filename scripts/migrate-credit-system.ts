/**
 * Migration Script: Credit System Refactor
 * 
 * STANDALONE VERSION - No Next.js dependencies
 * Run with: npx tsx scripts/migrate-credit-system.ts
 */

import mongoose from 'mongoose';

// MongoDB connection string from environment or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvcircle';

// Simplified mongoose connection
async function connectDB() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
}

async function freezeExcessDocuments(userId: string, reason: string, CV: any) {
    // Freeze excess CVs by type (keep 1 Master, 1 Journey, 1 Standalone)
    const cvTypes = ['master', 'journey', 'standalone'];

    for (const cvType of cvTypes) {
        const cvs = await CV.find({ userId, cvType }).sort({ updatedAt: -1 });

        // Keep the most recent one as editable, freeze the rest
        const cvsToFreeze = cvs.slice(1);

        if (cvsToFreeze.length > 0) {
            await CV.updateMany(
                { _id: { $in: cvsToFreeze.map((cv: any) => cv._id) } },
                {
                    $set: {
                        documentState: 'frozen',
                        frozenAt: new Date(),
                        frozenReason: reason
                    }
                }
            );
        }
    }
}

async function runMigration() {
    try {
        console.log('🚀 Starting credit system migration...\n');

        await connectDB();

        // Import models after connection
        const { User, CV, Job } = await (async () => {
            try {
                // Try to import from models/index
                const models = await import('../src/models/index.js');
                return models;
            } catch {
                // Fallback: import individually
                const User = (await import('../src/models/User.js')).default;
                const CV = (await import('../src/models/CV.js')).default;
                const Job = (await import('../src/models/Job.js')).default;
                return { User, CV, Job };
            }
        })();

        // Step 1: Add documentState to all CVs
        console.log('📄 Step 1: Adding documentState to CVs...');
        const cvsWithoutState = await CV.countDocuments({
            documentState: { $exists: false }
        });

        if (cvsWithoutState > 0) {
            await CV.updateMany(
                { documentState: { $exists: false } },
                { $set: { documentState: 'editable' } }
            );
            console.log(`✅ Added documentState to ${cvsWithoutState} CVs\n`);
        } else {
            console.log('✅ All CVs already have documentState\n');
        }

        // Step 2: Freeze excess CVs for free users
        console.log('🧊 Step 2: Freezing excess CVs for free users...');
        const freeUsers = await User.find({ currentPlanKey: 'free' });
        console.log(`Found ${freeUsers.length} free users`);

        let frozenCount = 0;
        for (const user of freeUsers) {
            await freezeExcessDocuments(user._id.toString(), 'plan_downgrade', CV);
            frozenCount++;
            if (frozenCount % 10 === 0) {
                console.log(`Processed ${frozenCount}/${freeUsers.length} users...`);
            }
        }
        console.log(`✅ Frozen excess documents for ${frozenCount} free users\n`);

        // Step 3: Set isArchived on jobs
        console.log('📦 Step 3: Setting isArchived on jobs...');
        const jobsWithoutArchive = await Job.countDocuments({
            isArchived: { $exists: false }
        });

        if (jobsWithoutArchive > 0) {
            const archivedResult = await Job.updateMany(
                {
                    isArchived: { $exists: false },
                    status: { $in: ['rejected', 'accepted', 'withdrawn'] }
                },
                { $set: { isArchived: true } }
            );

            const activeResult = await Job.updateMany(
                {
                    isArchived: { $exists: false },
                    status: { $nin: ['rejected', 'accepted', 'withdrawn'] }
                },
                { $set: { isArchived: false } }
            );

            console.log(`✅ Set ${archivedResult.modifiedCount} jobs as archived`);
            console.log(`✅ Set ${activeResult.modifiedCount} jobs as active\n`);
        } else {
            console.log('✅ All jobs already have isArchived field\n');
        }

        // Step 4: Consolidate credit fields
        console.log('💳 Step 4: Consolidating credit fields...');

        const usersWithOldCredits = await User.countDocuments({
            $or: [
                { 'credits.cvCredits': { $exists: true } },
                { 'credits.exportCredits': { $exists: true } },
                { 'credits.atsCheckCredits': { $exists: true } }
            ]
        });

        if (usersWithOldCredits > 0) {
            console.log(`Found ${usersWithOldCredits} users with old credit structure`);

            await User.updateMany(
                {},
                {
                    $set: {
                        'credits.aiCredits': 5,
                        'credits.creditRefundCount': 0,
                        'credits.lastRefundDate': null,
                        'credits.creditRefundResetAt': new Date(),
                        'credits.totalUsage.aiGenerations': 0,
                        'credits.totalUsage.cvs': 0,
                        'credits.totalUsage.jobs': 0,
                        'credits.totalUsage.downloads': 0
                    },
                    $unset: {
                        'credits.cvCredits': '',
                        'credits.exportCredits': '',
                        'credits.atsCheckCredits': '',
                        'credits.totalCreated': ''
                    }
                }
            );

            console.log(`✅ Updated credit structure for all users\n`);
        } else {
            console.log('✅ All users already have new credit structure\n');
        }

        // Step 5: Initialize jobCredits field
        console.log('🔄 Step 5: Ensuring jobCredits field exists...');
        await User.updateMany(
            { 'credits.jobCredits': { $exists: false } },
            [
                {
                    $set: {
                        'credits.jobCredits': '$credits.aiCredits'
                    }
                }
            ]
        );
        console.log('✅ jobCredits field synchronized with aiCredits\n');

        // Step 6: Summary
        console.log('📊 Migration Summary:');
        console.log('='.repeat(50));

        const [editableCVs, frozenCVs, readOnlyCVs, archivedJobs, activeJobs, freeUsersCount, paidUsersCount] = await Promise.all([
            CV.countDocuments({ documentState: 'editable' }),
            CV.countDocuments({ documentState: 'frozen' }),
            CV.countDocuments({ documentState: 'read-only' }),
            Job.countDocuments({ isArchived: true }),
            Job.countDocuments({ isArchived: false }),
            User.countDocuments({ currentPlanKey: 'free' }),
            User.countDocuments({ currentPlanKey: { $in: ['pro_monthly', 'pro_quarterly', 'pro_yearly'] } })
        ]);

        console.log(`\nCVs:`);
        console.log(`  - Editable: ${editableCVs}`);
        console.log(`  - Frozen: ${frozenCVs}`);
        console.log(`  - Read-Only: ${readOnlyCVs}`);

        console.log(`\nJobs:`);
        console.log(`  - Active: ${activeJobs}`);
        console.log(`  - Archived: ${archivedJobs}`);

        console.log(`\nUsers:`);
        console.log(`  - Free: ${freeUsersCount}`);
        console.log(`  - Paid: ${paidUsersCount}`);

        console.log('\n' + '='.repeat(50));
        console.log('✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from database');
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
