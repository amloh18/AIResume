/**
 * Sync Polar product IDs AND price IDs into MongoDB pricing plans.
 * 
 * Polar production products (fetched 2026-06-06):
 *   starter_monthly  → product: 451129c8 | price: a87d2721 (free)
 *   starter_yearly   → product: 5995d667 | price: 22668be3  $19.99/yr
 *   focused_monthly  → product: 455ce28f | price: 1461a25e  $9.99/mo
 *   focused_yearly   → product: da38a22b | price: 43eca2c3  $79.99/yr
 *   smart_quarterly  → product: ebbadbda | price: 4fad9368  $59.99/3mo
 *   smart_yearly     → product: 2e12fc32 | price: 8b08d4c6  $199.00/yr
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
import PricingPlan from '../src/models/PricingPlan';

interface PolarPlanEntry {
  productId: string;
  priceId: string;
  usdPrice: number;
  isFree?: boolean;
}

const POLAR_MAP: Record<string, PolarPlanEntry> = {
  starter_monthly:  { productId: '451129c8-ff5e-4925-b040-da2b58d81e35', priceId: 'a87d2721-b749-4175-9a7e-1c60b08b1d93', usdPrice: 0, isFree: true },
  starter_yearly:   { productId: '5995d667-5d84-41fa-80cf-367abf29d5f8', priceId: '22668be3-508e-4503-99d2-d4510d2420fc', usdPrice: 19.99 },
  focused_monthly:  { productId: '455ce28f-8dd0-41c7-87a2-94a7f3241b79', priceId: '1461a25e-918a-4d00-9250-31289743918e', usdPrice: 9.99 },
  focused_yearly:   { productId: 'da38a22b-463e-4416-ac28-836c9b9a33fc', priceId: '43eca2c3-f258-47d5-95f2-bd1b20bdf1aa', usdPrice: 79.99 },
  smart_quarterly:  { productId: 'ebbadbda-c32c-4e81-b509-b692c246cc35', priceId: '4fad9368-756b-441b-9ad3-1a17fde2563e', usdPrice: 59.99 },
  smart_yearly:     { productId: '2e12fc32-3d00-4b2b-8195-c872d1ec7bc4', priceId: '8b08d4c6-0cde-4f2a-ad2d-6a7beb487e5a', usdPrice: 199.00 },
};

async function sync() {
  const mongoUri = process.env.MONGODB_URI!;
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to database\n');

  for (const [planKey, { productId, priceId, usdPrice, isFree }] of Object.entries(POLAR_MAP)) {
    const plan = await PricingPlan.findOne({ key: planKey });
    if (!plan) {
      console.log(`⚠️  Plan not found: ${planKey}`);
      continue;
    }

    const polarIdFields: Record<string, any> = {};
    const priceFields: Record<string, any> = {};

    if (planKey.endsWith('_monthly')) {
      polarIdFields.polarPriceId_monthly = priceId;
      polarIdFields.polarProductId_monthly = productId;
      polarIdFields.price_monthly = usdPrice;
    } else if (planKey.endsWith('_yearly')) {
      polarIdFields.polarPriceId_yearly = priceId;
      polarIdFields.polarProductId_yearly = productId;
      polarIdFields.price_yearly = usdPrice;
    } else if (planKey.endsWith('_quarterly')) {
      polarIdFields.polarPriceId_quarterly = priceId;
      polarIdFields.polarProductId_quarterly = productId;
      polarIdFields.price_quarterly = usdPrice;
    }

    // Update regionalPricing to have real price IDs
    const updatedRegionalPricing = (plan.regionalPricing || []).map((rp: any) => {
      const rpObj = rp.toObject?.() ?? rp;
      if (rpObj.region === 'US') {
        return { ...rpObj, polarPriceId: priceId, polarProductId: productId, price: usdPrice };
      }
      // Use same product/price for non-US (Polar uses single USD price for all)
      return { ...rpObj, polarPriceId: priceId, polarProductId: productId };
    });

    await PricingPlan.findOneAndUpdate(
      { key: planKey },
      {
        $set: {
          ...polarIdFields,
          regionalPricing: updatedRegionalPricing
        }
      }
    );

    console.log(`✅ ${planKey}: productId=${productId.substring(0, 8)}... priceId=${priceId.substring(0, 8)}... USD=$${usdPrice}${isFree ? ' (FREE)' : ''}`);
  }

  console.log('\n✅ Done. All Polar IDs synced.');
  await mongoose.connection.close();
}

sync().catch(e => { console.error(e); process.exit(1); });
