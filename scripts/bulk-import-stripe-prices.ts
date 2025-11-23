/**
 * Bulk Import Stripe Products and Prices
 * 
 * This script:
 * 1. Reads all CountryPricing records from the database
 * 2. Creates Stripe Products (reusable per currency)
 * 3. Creates Stripe Prices for each country/plan combination
 * 4. Updates CountryPricing records with Stripe price IDs
 * 
 * Usage: npx tsx scripts/bulk-import-stripe-prices.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import CountryPricing from '../src/models/CountryPricing';
import PricingPlan from '../src/models/PricingPlan';
import Stripe from 'stripe';

// Plan configurations
const PLAN_CONFIGS = {
  dayPass: {
    name: 'Day Pass',
    description: 'One-day access to all premium features',
    type: 'one-time' as const
  },
  monthly: {
    name: 'Professional Monthly',
    description: 'Monthly subscription plan - automatically charged every month',
    type: 'recurring' as const,
    interval: 'month' as const
  },
  quarterly: {
    name: 'Professional Quarterly',
    description: 'Quarterly subscription plan - automatically charged every 3 months',
    type: 'recurring' as const,
    interval: 'month' as const,
    intervalCount: 3
  },
  yearly: {
    name: 'Professional Yearly',
    description: 'Yearly subscription plan - automatically charged every year',
    type: 'recurring' as const,
    interval: 'year' as const
  }
};

// Cache for products (key: currency_planKey)
const productCache = new Map<string, string>();

async function getOrCreateProduct(
  stripe: Stripe, 
  currency: string, 
  planKey: keyof typeof PLAN_CONFIGS,
  planFeatures?: string[]
): Promise<string | null> {
  const cacheKey = `${currency}_${planKey}`;
  
  // Check cache first
  if (productCache.has(cacheKey)) {
    return productCache.get(cacheKey)!;
  }

  const config = PLAN_CONFIGS[planKey];
  const productName = `${config.name} (${currency.toUpperCase()})`;
  
  // Build description with features
  let productDescription = config.description;
  if (planFeatures && planFeatures.length > 0) {
    const featuresList = planFeatures.slice(0, 5).join(', '); // Limit to first 5 features
    productDescription = `${config.description}\n\nFeatures: ${featuresList}${planFeatures.length > 5 ? '...' : ''}`;
  }
  
  // Check if product already exists in Stripe
  try {
    const products = await stripe.products.list({
      limit: 100,
      active: true
    });
    
    const existingProduct = products.data.find(
      p => p.name === productName && !p.deleted
    );
    
    if (existingProduct) {
      productCache.set(cacheKey, existingProduct.id);
      console.log(`  ✅ Found existing product: ${productName} (${existingProduct.id})`);
      
      // Update existing product with features if not already set
      if (planFeatures && planFeatures.length > 0 && (!existingProduct.description || !existingProduct.description.includes('Features:'))) {
        try {
          await stripe.products.update(existingProduct.id, {
            description: productDescription,
            metadata: {
              ...existingProduct.metadata,
              planKey: planKey,
              currency: currency.toUpperCase(),
              type: config.type,
              features: planFeatures.join('|')
            }
          });
          console.log(`  ✅ Updated product with features: ${productName}`);
        } catch (updateError) {
          console.warn(`  ⚠️  Could not update product features:`, updateError);
        }
      }
      
      return existingProduct.id;
    }
  } catch (error) {
    console.error(`  ⚠️  Error checking for existing product:`, error);
  }

  // Create new product
  try {
    const productMetadata: Record<string, string> = {
      planKey: planKey,
      currency: currency.toUpperCase(),
      type: config.type
    };
    
    if (planFeatures && planFeatures.length > 0) {
      productMetadata.features = planFeatures.join('|');
    }
    
    const product = await stripe.products.create({
      name: productName,
      description: productDescription,
      metadata: productMetadata
    });

    productCache.set(cacheKey, product.id);
    console.log(`  ✅ Created product: ${productName} (${product.id})`);
    return product.id;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Failed to create product: ${productName}`, errorMsg);
    return null;
  }
}

async function createPriceForCountry(
  stripe: Stripe,
  countryPricing: any,
  planKey: keyof typeof PLAN_CONFIGS,
  productId: string
): Promise<string | null> {
  const config = PLAN_CONFIGS[planKey];
  const price = countryPricing.planPrices[planKey]?.price || 0;
  const currency = countryPricing.currency.toLowerCase();

  if (price <= 0) {
    console.log(`  ⚠️  Skipping ${planKey} - price is 0 or invalid`);
    return null;
  }

  // Check if price already exists
  try {
    const prices = await stripe.prices.list({
      product: productId,
      limit: 100,
      active: true
    });
    
      const existingPrice = prices.data.find(
        p => {
          const currencyMatch = p.currency === currency;
          const amountMatch = p.unit_amount === Math.round(price * 100);
          
          if (config.type === 'recurring') {
            const intervalMatch = p.recurring?.interval === config.interval;
            const intervalCountMatch = config.intervalCount 
              ? p.recurring?.interval_count === config.intervalCount
              : !p.recurring?.interval_count || p.recurring?.interval_count === 1;
            return currencyMatch && amountMatch && intervalMatch && intervalCountMatch;
          } else {
            // One-time payment
            return currencyMatch && amountMatch && !p.recurring;
          }
        }
      );
    
    if (existingPrice) {
      console.log(`  ✅ Found existing price: ${planKey} - ${currency.toUpperCase()} ${price} (${existingPrice.id})`);
      return existingPrice.id;
    }
  } catch (error) {
    console.error(`  ⚠️  Error checking for existing price:`, error);
  }

  // Create new price
  try {
    const priceParams: any = {
      product: productId,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: currency.toLowerCase()
    };

    // Add recurring configuration for subscription plans
    if (config.type === 'recurring') {
      priceParams.recurring = {
        interval: config.interval!
      };
      // Add interval_count for quarterly (every 3 months)
      if (config.intervalCount) {
        priceParams.recurring.interval_count = config.intervalCount;
      }
    }

    const priceObj = await stripe.prices.create(priceParams);

    console.log(`  ✅ Created price: ${planKey} - ${currency.toUpperCase()} ${price} (${priceObj.id})`);
    return priceObj.id;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Failed to create price: ${planKey} - ${currency.toUpperCase()} ${price}`, errorMsg);
    return null;
  }
}

async function bulkImportStripePrices() {
  try {
    console.log('🚀 Starting Stripe Products and Prices Bulk Import...\n');

    // Check Stripe configuration and create instance
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('❌ STRIPE_SECRET_KEY is not set in environment variables.');
      console.error('   Please ensure .env.local contains: STRIPE_SECRET_KEY=sk_test_... or sk_live_...');
      process.exit(1);
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });
    
    console.log(`✅ Stripe configured (Key: ${stripeKey.substring(0, 12)}...)\n`);

    // Connect to database
    console.log('🔌 Connecting to database...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Database connected\n');

    // Get all country pricing records
    console.log('📋 Fetching all CountryPricing records...');
    const allCountryPricing = await CountryPricing.find({}).lean();
    console.log(`✅ Found ${allCountryPricing.length} country pricing records\n`);

    if (allCountryPricing.length === 0) {
      console.log('⚠️  No country pricing records found. Please create CountryPricing records first.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Group by currency to optimize product creation
    const currencyGroups = new Map<string, any[]>();
    for (const pricing of allCountryPricing) {
      const currency = pricing.currency.toUpperCase();
      if (!currencyGroups.has(currency)) {
        currencyGroups.set(currency, []);
      }
      currencyGroups.get(currency)!.push(pricing);
    }

    console.log(`📊 Processing ${currencyGroups.size} unique currencies:\n`);

    const results = {
      productsCreated: 0,
      productsReused: new Set<string>(), // Track unique product IDs
      pricesCreated: 0,
      pricesReused: 0,
      countriesUpdated: 0,
      errors: [] as Array<{ country: string; plan: string; error: string }>
    };

    // Fetch plan features from database
    console.log('📋 Fetching plan features from database...');
    const plans = await PricingPlan.find({}).lean();
    const planFeaturesMap = new Map<string, string[]>();
    
    for (const plan of plans) {
      const key = plan.key;
      if (key === 'day_pass') {
        planFeaturesMap.set('dayPass', plan.features || []);
      } else if (key === 'pro_monthly') {
        planFeaturesMap.set('monthly', plan.features || []);
      } else if (key === 'pro_quarterly') {
        planFeaturesMap.set('quarterly', plan.features || []);
      } else if (key === 'pro_yearly') {
        planFeaturesMap.set('yearly', plan.features || []);
      }
    }
    console.log(`✅ Loaded features for ${planFeaturesMap.size} plans\n`);

    // Process each country
    for (const countryPricing of allCountryPricing) {
      const countryCode = countryPricing.countryCode;
      const countryName = countryPricing.countryName;
      const currency = countryPricing.currency.toUpperCase();
      
      console.log(`\n🌍 Processing ${countryName} (${countryCode}) - ${currency}`);

      const stripePriceIds: any = {};

      // Process each plan type
      for (const planKey of ['dayPass', 'monthly', 'quarterly', 'yearly'] as const) {
        try {
          // Get features for this plan
          const features = planFeaturesMap.get(planKey) || [];
          
          // Get or create product (with features)
          const productId = await getOrCreateProduct(stripe, currency, planKey, features);
          
          if (!productId) {
            results.errors.push({
              country: countryCode,
              plan: planKey,
              error: 'Failed to get or create product'
            });
            continue;
          }

          // Track product creation/reuse
          const cacheKey = `${currency}_${planKey}`;
          if (!productCache.has(cacheKey)) {
            // Product was just created
            results.productsCreated++;
            productCache.set(cacheKey, productId);
          } else {
            // Product was reused (found in cache or existing in Stripe)
            results.productsReused.add(productId);
          }

          // Create price
          const priceId = await createPriceForCountry(stripe, countryPricing, planKey, productId);
          
          if (priceId) {
            stripePriceIds[planKey] = priceId;
            // Check if it's a new price (we created it) or existing (we found it)
            // Since we check for existing prices first, if we get here and it's not in cache, it's new
            results.pricesCreated++;
          } else {
            results.errors.push({
              country: countryCode,
              plan: planKey,
              error: 'Failed to create price'
            });
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`  ❌ Error processing ${planKey}:`, errorMsg);
          results.errors.push({
            country: countryCode,
            plan: planKey,
            error: errorMsg
          });
        }
      }

      // Update CountryPricing record with Stripe price IDs
      if (Object.keys(stripePriceIds).length > 0) {
        try {
          await CountryPricing.findOneAndUpdate(
            { countryCode: countryCode },
            {
              $set: {
                stripePriceIds: stripePriceIds
              }
            }
          );
          results.countriesUpdated++;
          console.log(`  ✅ Updated database with Stripe price IDs`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`  ❌ Failed to update database:`, errorMsg);
          results.errors.push({
            country: countryCode,
            plan: 'database_update',
            error: errorMsg
          });
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Products created: ${results.productsCreated}`);
    console.log(`♻️  Products reused: ${results.productsReused.size} unique products`);
    console.log(`📦 Total unique products: ${results.productsCreated + results.productsReused.size}`);
    console.log(`✅ Prices created: ${results.pricesCreated}`);
    console.log(`♻️  Prices reused: ${results.pricesReused}`);
    console.log(`📊 Total prices: ${results.pricesCreated + results.pricesReused}`);
    console.log(`✅ Countries updated: ${results.countriesUpdated}`);
    console.log(`\n💡 Note: Products are shared per currency (one product per plan type per currency).`);
    console.log(`   Prices are created per country/plan combination.`);
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Errors: ${results.errors.length}`);
      results.errors.forEach(err => {
        console.log(`   - ${err.country}/${err.plan}: ${err.error}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();
    console.log('🔌 Database disconnected');

  } catch (error) {
    console.error('❌ Bulk import error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
bulkImportStripePrices()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

