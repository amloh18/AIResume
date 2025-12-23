import mongoose from 'mongoose';
import PricingPlan from '@/models/PricingPlan';
import { generatePlanFeatures, generateNotIncludedFeatures } from '@/lib/utils/plan-features-generator';
import { getConnection } from '@/lib/database';

async function updatePricingPlanFeatures() {
  await getConnection();
  
  const plans = await PricingPlan.find({ status: 'active' });
  
  for (const plan of plans) {
    const features = generatePlanFeatures(plan.key);
    const notIncluded = generateNotIncludedFeatures(plan.key);
    
    plan.features = features.map(f => f.text);
    plan.notIncludedFeatures = notIncluded;
    
    await plan.save();
    console.log(`Updated features for ${plan.key}: ${plan.features.length} features`);
  }
  
  console.log('All pricing plan features updated!');
  mongoose.connection.close();
}

updatePricingPlanFeatures().catch(console.error);

