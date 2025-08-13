const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Define the User schema (simplified version for the script)
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  currentPlanKey: {
    type: String,
    enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'],
    default: 'free'
  },
  subscription: {
    planKey: {
      type: String,
      enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'inactive'
    },
    startDate: Date,
    endDate: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    provider: {
      type: String,
      enum: ['stripe', 'razorpay', 'none'],
      default: 'none'
    },
    providerSubscriptionId: String,
    providerCustomerId: String,
    interval: {
      type: String,
      enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    seats: {
      type: Number,
      default: 3
    },
    storageUsed: {
      type: Number,
      default: 0
    }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function migrateUsersToNewPlans() {
  try {
    console.log('🔄 Starting user migration to new plan structure...');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Check if user already has currentPlanKey
        if (user.currentPlanKey) {
          console.log(`⏭️  User ${user.email} already has currentPlanKey: ${user.currentPlanKey}`);
          skippedCount++;
          continue;
        }

        // Map old subscription plan to new plan key
        let newPlanKey = 'free';
        let newInterval = 'monthly';
        let newProvider = 'none';

        if (user.subscription) {
          const oldPlan = user.subscription.plan;
          const oldStatus = user.subscription.status;

          // Map old plan names to new keys
          if (oldPlan === 'basic' || oldPlan === 'Free Plan') {
            newPlanKey = 'free';
            newInterval = 'one-time';
          } else if (oldPlan === 'pro' || oldPlan === 'Pro Plan') {
            newPlanKey = 'pro_monthly';
            newInterval = 'monthly';
          } else if (oldPlan === 'unlimited' || oldPlan === 'Unlimited Plan') {
            newPlanKey = 'pro_yearly';
            newInterval = 'yearly';
          }

          // Determine provider
          if (user.subscription.paymentMethod === 'stripe') {
            newProvider = 'stripe';
          } else if (user.subscription.paymentMethod === 'razorpay') {
            newProvider = 'razorpay';
          }
        }

        // Update user with new plan structure
        const updateData = {
          currentPlanKey: newPlanKey,
          subscription: {
            planKey: newPlanKey,
            status: user.subscription?.status || 'inactive',
            startDate: user.subscription?.startDate || new Date(),
            endDate: user.subscription?.endDate,
            currentPeriodStart: user.subscription?.startDate || new Date(),
            currentPeriodEnd: user.subscription?.endDate,
            provider: newProvider,
            providerSubscriptionId: user.subscription?.providerSubscriptionId,
            providerCustomerId: user.subscription?.providerCustomerId,
            interval: newInterval,
            seats: user.subscription?.seats || 3,
            storageUsed: user.subscription?.storageUsed || 0
          }
        };

        await User.findByIdAndUpdate(user._id, updateData);
        
        console.log(`✅ Migrated user ${user.email}: ${user.subscription?.plan || 'no plan'} → ${newPlanKey}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error);
      }
    }

    console.log('\n📋 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped (already migrated): ${skippedCount} users`);
    console.log(`📊 Total users processed: ${users.length}`);

    console.log('\n🎉 User migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during user migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    migrateUsersToNewPlans();
  });
}

module.exports = { migrateUsersToNewPlans };
