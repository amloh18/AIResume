
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InterviewSession from '../src/models/InterviewSession';
import InterviewQuestion from '../src/models/InterviewQuestion';

dotenv.config({ path: '.env.local' });

async function debugPracticeFetch() {
    try {
        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB.');

        const jobId = '69413beaacc3304b30813d76'; // User's job ID
        const userId = '690d9ac5463f7c9c51d81356'; // User's ID
        const targetModuleId = 'technical-module'; // Expected module ID from new generation

        // 1. Simulate /api/interview/initiate
        const session = await InterviewSession.findOne({ jobId, userId });
        if (!session) {
            console.error('❌ Session not found');
            process.exit(1);
        }
        console.log('✅ Session Found:', session._id);

        // Check module ID in session
        console.log('   Session Modules:', JSON.stringify(session.modules, null, 2));
        const sessionModule = session.modules.find(m => m.id === targetModuleId);
        console.log('   Target Module in Session:', sessionModule ? 'Found' : 'MISSING');
        if (sessionModule) {
            console.log('   Module Details:', JSON.stringify(sessionModule, null, 2));
        }

        // 2. Simulate /api/interview/questions
        const questions = await InterviewQuestion.find({ sessionId: session._id });
        console.log(`✅ Questions Fetched: ${questions.length}`);

        // 3. Simulate Frontend Filtering
        // NOTE: Frontend does: qs.filter((q: Question) => q.moduleId === moduleId);
        const filtered = questions.filter(q => q.moduleId === targetModuleId);
        console.log(`🔍 Filtering by moduleId="${targetModuleId}"`);
        console.log(`✅ Filtered Count: ${filtered.length}`);

        if (filtered.length === 0) {
            console.log('❌ FILTERING FAILED!');
            if (questions.length > 0) {
                console.log('Sample Question Module ID:', questions[0]?.moduleId);
                console.log('Type of Question Module ID:', typeof questions[0]?.moduleId);
                console.log('Type of Target:', typeof targetModuleId);

                // Check strict equality vs loose
                console.log(`Strict Equality Check: '${questions[0]?.moduleId}' === '${targetModuleId}' is ${questions[0]?.moduleId === targetModuleId}`);
            }
        } else {
            console.log('✅ Filtering worked in script. Frontend issue?');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Debug Error:', error);
        process.exit(1);
    }
}

debugPracticeFetch();
