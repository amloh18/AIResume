import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import CountryPricing from '../src/models/CountryPricing';

async function checkAllPricing() {
    try {
        console.log('🔍 Connecting to database...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected');

        const records = await CountryPricing.find({}).lean();
        console.log(`✅ Found ${records.length} CountryPricing records:`);
        console.log(JSON.stringify(records, null, 2));

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAllPricing();
