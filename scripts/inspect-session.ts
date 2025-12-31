
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InterviewSession from '../src/models/InterviewSession';
import InterviewQuestion from '../src/models/InterviewQuestion';

dotenv.config({ path: '.env.local' });

async function debugSession() {
    try {
        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB.');

        const jobId = '69413beaacc3304b30813d76'; // From user logs
        const userId = '690d9ac5463f7c9c51d81356'; // From user logs

        console.log(`🔍 Searching for session: Job=${jobId}, User=${userId}`);

        const session = await InterviewSession.findOne({ jobId, userId });

        if (!session) {
            console.log('❌ No session found.');
        } else {
            console.log('✅ Session Found:', session._id);
            console.log('   Modules:', session.modules?.length);
            console.log(JSON.stringify(session.modules, null, 2));

            const questions = await InterviewQuestion.find({ sessionId: session._id });
            console.log(`\n✅ Questions Found: ${questions.length}`);

            if (questions.length > 0) {
                console.log('--- First 3 Questions ---');
                questions.slice(0, 3).forEach(q => {
                    console.log(`\n[ID: ${q._id}]`);
                    console.log(`Content:`, JSON.stringify(q.content, null, 2));
                    console.log(`ModuleId: ${q.moduleId}`);
                });
            } else {
                console.log('❌ Session exists but has 0 questions!');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Debug Error:', error);
        process.exit(1);
    }
}

debugSession();
