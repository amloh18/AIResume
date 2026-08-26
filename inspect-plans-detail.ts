import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import model
import PricingPlan from './src/models/PricingPlan';

async function inspectPlansDetail() {
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
            console.log(`- Key: ${plan.key}`);
            console.log(`  Name: ${plan.name}`);
            console.log(`  Status: ${plan.status}`);
            console.log(`  displayOnLanding: ${plan.displayOnLanding}`);
            console.log(`  targetAudience: ${plan.targetAudience}`);
            console.log(`  sortOrder: ${plan.sortOrder}`);
            console.log(`  billingCycle: ${plan.billingCycle}`);
            console.log(`  price: ${plan.price}`);
            console.log(`  regionalPricing Count: ${plan.regionalPricing?.length || 0}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

inspectPlansDetail();
