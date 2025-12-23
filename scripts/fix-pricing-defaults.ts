import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import model
import PricingPlan from '../src/models/PricingPlan';

const DEFAULT_PRICES = {
    'day_pass': { price_one_time: 5, currency: 'GBP' },
    'pro_monthly': { price_monthly: 19, currency: 'GBP' },
    'pro_quarterly': { price_quarterly: 49, currency: 'GBP' },
    'pro_yearly': { price_yearly: 179, currency: 'GBP' }
};

async function fixPricingDefaults() {
    try {
        console.log('🛠 Updating PricingPlan default values...');

        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        for (const [key, defaults] of Object.entries(DEFAULT_PRICES)) {
            console.log(`Updating ${key}...`);
            const result = await PricingPlan.updateOne(
                { key: key },
                { $set: defaults }
            );
            console.log(`- Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        }

        await mongoose.connection.close();
        console.log('✅ Done updating defaults.');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixPricingDefaults();
