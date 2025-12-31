
import mongoose from 'mongoose';
// import { getConnection } from '../src/lib/database';
import InterviewQuestion from '../src/models/InterviewQuestion';
import InterviewSession from '../src/models/InterviewSession'; // Needed for reference?
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyInterviewSave() {
    try {
        console.log('🔌 Connecting to DB...');
        // await getConnection();
        if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Mock Data from Service (Refactored Output)
        // This mirrors exactly what InterviewCoachService returns now
        const mockQuestionsFromService = [
            {
                moduleId: 'technical-module',
                content: {
                    question: 'MOCK: Describe React Reconciliation.',
                    whyAsked: 'Test technical depth',
                    difficulty: 'medium',
                    tags: ['technical']
                },
                edgeTip: {
                    content: 'Mention Fiber architecture.'
                },
                displayOrder: 0,
                isHighRelevance: true
            }
        ];

        // 2. Mock Session ID (Create a Fake ObjectId)
        const sessionId = new mongoose.Types.ObjectId();
        console.log('📝 Created Mock Session ID:', sessionId);

        // 3. Map to DB Schema (Same logic as in route.ts)
        const questionDocs = mockQuestionsFromService.map(q => ({
            ...q,
            sessionId: sessionId
        }));

        console.log('💾 Attempting to insert questions...');
        console.log(JSON.stringify(questionDocs, null, 2));

        // 4. Attempt Insert
        await InterviewQuestion.insertMany(questionDocs);

        console.log('✅ Insert Successful!');

        // 5. Cleanup
        await InterviewQuestion.deleteMany({ sessionId });
        console.log('🧹 Cleanup Successful.');

        process.exit(0);

    } catch (error) {
        console.error('❌ SAVE ERROR:', error);
        if (error instanceof mongoose.Error.ValidationError) {
            console.error('Validation Errors:', error.errors);
        }
        process.exit(1);
    }
}

verifyInterviewSave();
