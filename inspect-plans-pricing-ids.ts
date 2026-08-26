import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import model
import PricingPlan from './src/models/PricingPlan';

async function inspectPlansPricingIds() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const plans = await PricingPlan.find({ status: 'active' });
        console.log(`Found ${plans.length} active plans:`);
        
        plans.forEach(plan => {
            console.log(`- Key: ${plan.key}, defaultCountryPricingId: ${plan.defaultCountryPricingId}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

inspectPlansPricingIds();
