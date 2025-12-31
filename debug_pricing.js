
const { getConnection } = require('./src/lib/database/connection-manager');
const CountryPricing = require('./src/models/CountryPricing');
const mongoose = require('mongoose');

async function checkPricing() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const pricings = await require('./src/models/CountryPricing').default.find({});
        console.log(`Found ${pricings.length} country pricing records`);

        for (const p of pricings) {
            console.log(`Country: ${p.countryCode}, Currency: ${p.currency}`);
            console.log('Stripe Price IDs:', p.stripePriceIds);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Mocking the model since I can't import typescript module directly in node script easily without compilation
// I will rely on reading the file content instead of running it, 
// OR I can use the existing API to inspect logic. 
// Actually, I can just inspect the code logic more deeply.
