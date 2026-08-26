import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import model
import PricingPlan from './src/models/PricingPlan';

async function inspectPlansKeys() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const plans = await PricingPlan.find({});
        console.log(`Found ${plans.length} plans:`);
        
        plans.forEach(plan => {
            console.log(`- Key: "${plan.key}", Name: "${plan.name}"`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

inspectPlansKeys();
