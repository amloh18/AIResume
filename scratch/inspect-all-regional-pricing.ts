import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
import PricingPlan from '../src/models/PricingPlan';

async function inspect() {
  const mongoUri = process.env.MONGODB_URI!;
  await mongoose.connect(mongoUri);
  console.log('✅ Connected\n');

  const plans = await PricingPlan.find({ status: 'active' }).lean();
  for (const plan of plans as any[]) {
    console.log(`\n====== Plan: ${plan.key} (${plan.name}) ======`);
    console.log(`  price_monthly: ${plan.price_monthly}, price_yearly: ${plan.price_yearly}, price_quarterly: ${plan.price_quarterly}`);
    console.log(`  polarPriceId_monthly: ${plan.polarPriceId_monthly}`);
    console.log(`  polarPriceId_yearly: ${plan.polarPriceId_yearly}`);
    console.log(`  polarPriceId_quarterly: ${plan.polarPriceId_quarterly}`);
    console.log(`  Regional Pricing (${plan.regionalPricing?.length || 0}):`);
    for (const rp of (plan.regionalPricing || [])) {
      console.log(`    - ${rp.region}: ${rp.currency} ${rp.price} | polarPriceId: ${rp.polarPriceId}`);
    }
  }

  await mongoose.connection.close();
}

inspect().catch(console.error);
