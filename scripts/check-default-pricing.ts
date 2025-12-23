import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import model
import CountryPricing from '../src/models/CountryPricing';

const TARGET_ID = '6916eaebbe67a3e5a1b65089';

async function checkDefaultPricing() {
    try {
        console.log(`🔍 Checking CountryPricing for ID: ${TARGET_ID}...`);

        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const pricing = await CountryPricing.findById(TARGET_ID).lean();

        if (!pricing) {
            console.log('❌ No CountryPricing found for this ID');
        } else {
            console.log('✅ Pricing found:');
            console.log(JSON.stringify(pricing, null, 2));
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkDefaultPricing();
