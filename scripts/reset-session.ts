
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InterviewSession from '../src/models/InterviewSession';
import InterviewQuestion from '../src/models/InterviewQuestion';

dotenv.config({ path: '.env.local' });

async function deleteDebugSession() {
    try {
        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB.');

        const jobId = '6920a53f21f94f8e9ec8bb4b'; // From user logs
        const userId = '690d9ac5463f7c9c51d81356'; // From user logs

        console.log(`🔍 Finding session to delete: Job=${jobId}, User=${userId}`);

        const session = await InterviewSession.findOne({ jobId, userId });

        if (!session) {
            console.log('❌ No session found to delete.');
        } else {
            console.log('✅ Session Found:', session._id);

            // Delete questions first
            const delQuestions = await InterviewQuestion.deleteMany({ sessionId: session._id });
            console.log(`🗑️ Deleted ${delQuestions.deletedCount} questions.`);

            // Delete session
            const delSession = await InterviewSession.deleteOne({ _id: session._id });
            console.log(`🗑️ Deleted session.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Delete Error:', error);
        process.exit(1);
    }
}

deleteDebugSession();
