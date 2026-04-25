import mongoose from 'mongoose';
import User from '../src/models/User';
import Tenant from '../src/models/b2b/Tenant';
import ApiKey from '../src/models/b2b/ApiKey';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function setupAmarlB2B() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing');
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const email = 'amarl@cvcircle.io';
  let user = await User.findOne({ email });

  if (!user) {
    console.log(`User ${email} not found. Creating a new user...`);
    user = new User({
      email,
      name: 'Amar L',
      firstName: 'Amar',
      lastName: 'L',
      password: 'no-password-oauth-only',
      isEmailVerified: true,
      authProvider: 'nextauth',
      authProviderId: email,
    });
    await user.save();
  } else {
    // If the user exists but has an invalid authProvider, fix it
    if (user.authProvider === 'credentials' as any) {
      user.authProvider = 'nextauth';
    }
  }

  console.log(`Setting up B2B Tenant for user: ${user.email}`);

  // Create a Mock Tenant for this user
  const tenant = new Tenant({
    name: 'CVCircle Internal HR',
    contactEmail: user.email,
    subscriptionTier: 'enterprise',
    rateLimit: 6000,
    dataRetentionDays: 90,
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
  
  const hashedKey = crypto.createHash('sha256').update(apiKeyString).digest('hex');
  const prefix = apiKeyString.substring(0, 13);
  
  const apiKey = new ApiKey({
    tenantId: tenant._id,
    name: 'Internal Dev Key',
    keyHash: hashedKey,
    prefix,
    environment: 'live',
    permissions: ['parse', 'score', 'batch', 'webhooks'],
    isActive: true,
  });

  await apiKey.save();

  console.log('\n--- B2B SETUP COMPLETE FOR AMARL@CVCIRCLE.IO ---');
  console.log('You can now access the B2B Dashboard at: http://localhost:3000/b2b/dashboard');
  console.log('\nYour Sandbox/API Key is:');
  console.log(apiKeyString);
  console.log('\nSave this key! It will not be shown again.');
  
  process.exit(0);
}

setupAmarlB2B().catch((err) => {
  console.error(err);
  process.exit(1);
});