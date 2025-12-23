import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import model
import PricingPlan from '../src/models/PricingPlan';

async function checkPlans() {
    try {
        console.log('🔍 Checking Pricing Plans...');

        // Connect directly to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const plans = await PricingPlan.find({}).lean();

        if (plans.length === 0) {
            console.log('❌ No pricing plans found');
        } else {
            console.log(`✅ Found ${plans.length} plans:`);
            plans.forEach(plan => {
                const defaultId = plan.defaultCountryPricingId ? plan.defaultCountryPricingId.toString() : 'MISSING';
                console.log(`- Key: ${plan.key.padEnd(15)} | Status: ${plan.status.padEnd(10)} | Default Pricing ID: ${defaultId}`);
            });
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkPlans();
