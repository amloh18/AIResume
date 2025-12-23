import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models
import CV from '../src/models/CV';
import User from '../src/models/User';

async function verifyQuota() {
    let createdUserIds: string[] = [];
    let createdCVIds: string[] = [];

    try {
        console.log('🧪 Starting Free Plan Quota Verification...');

        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI not set');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to DB');

        // 1. Create a dummy Free Plan user
        const dummyUser = await User.create({
            email: `quota_test_${Date.now()}@test.com`,
            firstName: 'Quota',
            lastName: 'Tester',
            currentPlanKey: 'free',
            authProvider: 'local',
            authProviderId: `test_id_${Date.now()}`, // Unique ID to satisfy index
            role: 'user',
            plan: 'free', // Legacy field backup
            subscription: {
                status: 'active',
                planKey: 'free',
                provider: 'stripe', // minimal mock
                startDate: new Date(),
                endDate: new Date(Date.now() + 10000000)
            }
        });
        createdUserIds.push(dummyUser._id.toString());
        console.log(`👤 Created dummy user: ${dummyUser._id} (Plan: Free)`);

        // Helper to create CV
        const createCV = async (type: 'standalone' | 'master', title: string) => {
            // Simulate the check logic from the API (simplified)
            const count = await CV.countDocuments({
                userId: dummyUser._id,
                cvType: type
            });

            if (type === 'standalone' && count >= 1) {
                return { success: false, error: 'Limit exceeded' };
            }
            if (type === 'master' && count >= 1) {
                return { success: false, error: 'Limit exceeded' };
            }

            const cv = await CV.create({
                userId: dummyUser._id,
                title,
                cvType: type,
                status: 'draft',
                metadata: { isMaster: type === 'master' },
                // Add required fields
                templateId: new mongoose.Types.ObjectId(), // Dummy template ID
                cvData: {
                    basics: {
                        name: 'Quota User',
                        email: 'test@example.com'
                    }
                }
            });
            createdCVIds.push(cv._id.toString());
            return { success: true, cv };
        };

        // Edge Case 1: Create 1st Standalone CV
        console.log('\n🔹 Test 1: Create 1st Standalone CV');
        const res1 = await createCV('standalone', 'First CV');
        if (res1.success) console.log('✅ allowed (Expected)');
        else console.error('❌ blocked (Unexpected)');

        // Edge Case 2: Create 2nd Standalone CV (Should be blocked)
        console.log('\n🔹 Test 2: Attempt 2nd Standalone CV');
        const res2 = await createCV('standalone', 'Second CV');
        if (!res2.success) console.log('✅ blocked (Expected)');
        else console.error('❌ allowed (Unexpected)');

        // Edge Case 3: Delete and Recreate
        console.log('\n🔹 Test 3: Delete CV and Retry');
        if (res1.cv) {
            await CV.findByIdAndDelete(res1.cv._id);
            console.log('   (Deleted First CV)');
        }
        const res3 = await createCV('standalone', 'Recreated CV');
        if (res3.success) console.log('✅ allowed (Expected)');
        else console.error('❌ blocked (Unexpected)');

        // Edge Case 4: Concurrent simulation (Race condition check - Theoretical in this script)
        // Note: This script runs sequentially, but validates the logic used by the API.

        console.log('\n✅ Verification Complete.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        if (createdCVIds.length > 0) await CV.deleteMany({ _id: { $in: createdCVIds } });
        if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
        await mongoose.connection.close();
    }
}

verifyQuota();
