import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import model
import CountryPricing from '../src/models/CountryPricing';

async function checkPricing() {
    try {
        console.log('🔍 Checking pricing for US (USA)...');

        // Connect directly to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const pricing = await CountryPricing.findOne({ countryCode: 'US' }).lean();

        if (!pricing) {
            console.log('❌ No pricing found for US');
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

checkPricing();
