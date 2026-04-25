import mongoose from 'mongoose';
import User from '../src/models/User';
import Tenant from '../src/models/b2b/Tenant';
import ApiKey from '../src/models/b2b/ApiKey';
import crypto from 'crypto';

// Ensure we have dotenv loaded
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setupTestTenant() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing');
  }
  await mongoose.connect(process.env.MONGODB_URI);

  // Find a user to assign as the B2B Admin
  const user = await User.findOne({}).sort({ createdAt: -1 });

  if (!user) {
    console.error('No users found in the database. Please create an account via the UI first.');
    process.exit(1);
  }

  console.log(`Setting up B2B Tenant for user: ${user.email}`);

  // Create a Mock Tenant
  const tenant = new Tenant({
    name: 'Acme Corp (Test B2B)',
    contactEmail: user.email,
    subscriptionTier: 'pro',
    rateLimit: 600,
    dataRetentionDays: 60,
    isActive: true,
  });

  await tenant.save();
  console.log(`Created Tenant: ${tenant.name} with ID: ${tenant._id}`);

  // Assign user to tenant
  user.b2b = {
    tenantId: tenant._id,
    role: 'admin',
  };
  await user.save();
  console.log(`User ${user.email} is now a B2B Admin for ${tenant.name}`);

  // Generate an API Key
  const rawKey = crypto.randomBytes(32).toString('hex');
  const apiKeyString = `cvc_live_${rawKey}`;
  
  // We use SHA-256 to hash the key before saving it
  const hashedKey = crypto.createHash('sha256').update(apiKeyString).digest('hex');
  const prefix = apiKeyString.substring(0, 13); // cvc_live_XXXX
  
  const apiKey = new ApiKey({
    tenantId: tenant._id,
    name: 'Development Key',
    keyHash: hashedKey,
    prefix,
    environment: 'live',
    permissions: ['parse', 'score', 'batch', 'webhooks'],
    isActive: true,
  });

  await apiKey.save();

  console.log('\n--- TEST B2B SETUP COMPLETE ---');
  console.log('You can now access the B2B Dashboard at: http://localhost:3000/b2b/dashboard');
  console.log('\nYour Sandbox/API Key is:');
  console.log(apiKeyString);
  console.log('\nSave this key! It will not be shown again.');
  
  process.exit(0);
}

setupTestTenant().catch((err) => {
  console.error(err);
  process.exit(1);
});