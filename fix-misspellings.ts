import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import model
import PricingPlan from './src/models/PricingPlan';

async function fixMisspellings() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        // Fix starter_yealry
        const res1 = await PricingPlan.updateOne(
            { key: 'starter_yealry' },
            { $set: { key: 'starter_yearly' } }
        );
        console.log(`- starter_yealry -> starter_yearly: Matched: ${res1.matchedCount}, Modified: ${res1.modifiedCount}`);

        // Fix smart_quaterly
        const res2 = await PricingPlan.updateOne(
            { key: 'smart_quaterly' },
            { $set: { key: 'smart_quarterly' } }
        );
        console.log(`- smart_quaterly -> smart_quarterly: Matched: ${res2.matchedCount}, Modified: ${res2.modifiedCount}`);

        await mongoose.connection.close();
        console.log('✅ Done fixing misspellings.');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixMisspellings();
