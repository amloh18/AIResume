import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function inspect() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is missing');
        return;
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Inspect countrypricing
    const countryPricingCol = mongoose.connection.db.collection('countrypricings');
    const countryPricing = await countryPricingCol.find({}).toArray();
    console.log('\n--- Country Pricings ---');
    for (const cp of countryPricing) {
        console.log(`Country: ${cp.countryName} (${cp.countryCode}) | Currency: ${cp.currency}`);
        console.log(`Plan Prices:`, cp.planPrices);
        console.log(`Polar Price IDs:`, cp.polarPriceIds);
    }

    // Inspect pricingplans
    const pricingPlanCol = mongoose.connection.db.collection('pricingplans');
    const pricingPlans = await pricingPlanCol.find({}).toArray();
    console.log('\n--- Pricing Plans ---');
    for (const plan of pricingPlans) {
        console.log(`Plan Key: ${plan.key} | Name: ${plan.name} | Active: ${plan.status}`);
        console.log(`Price Monthly: ${plan.price_monthly} | Price Quarterly: ${plan.price_quarterly} | Price Yearly: ${plan.price_yearly} | Price One-Time: ${plan.price_one_time}`);
    }

    await mongoose.connection.close();
}

inspect();
