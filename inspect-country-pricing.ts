import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import model
import CountryPricing from './src/models/CountryPricing';

async function inspectCountryPricing() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to database');

        const pricing = await CountryPricing.find({});
        console.log(`Found ${pricing.length} country pricing records:`);
        
        pricing.forEach(p => {
            console.log(`- Country: ${p.countryCode}, Currency: ${p.currency}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

inspectCountryPricing();
