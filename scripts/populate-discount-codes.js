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

// Define the DiscountCode schema (simplified version for the script)
const discountCodeSchema = new mongoose.Schema({
  code: String,
  description: String,
  discountType: String,
  discountValue: Number,
  currency: String,
  maxUses: Number,
  usedCount: Number,
  validFrom: Date,
  validUntil: Date,
  applicablePlans: [String],
  minimumOrderValue: Number,
  isActive: Boolean,
  createdBy: String
}, { timestamps: true });

const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);

// Sample discount codes data
const discountCodes = [
  {
    code: 'WELCOME20',
    description: 'Welcome discount for new users',
    discountType: 'percentage',
    discountValue: 20,
    currency: 'EUR',
    maxUses: 100,
    usedCount: 15,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    applicablePlans: [], // All plans
    minimumOrderValue: 10,
    isActive: true,
    createdBy: 'admin'
  },
  {
    code: 'SUMMER50',
    description: 'Summer sale discount',
    discountType: 'fixed',
    discountValue: 50,
    currency: 'EUR',
    maxUses: 50,
    usedCount: 8,
    validFrom: new Date('2024-06-01'),
    validUntil: new Date('2024-08-31'),
    applicablePlans: [], // All plans
    minimumOrderValue: 100,
    isActive: true,
    createdBy: 'admin'
  },
  {
    code: 'STUDENT15',
    description: 'Student discount',
    discountType: 'percentage',
    discountValue: 15,
    currency: 'EUR',
    maxUses: 200,
    usedCount: 45,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    applicablePlans: [], // All plans
    minimumOrderValue: 5,
    isActive: true,
    createdBy: 'admin'
  },
  {
    code: 'FLASH25',
    description: 'Flash sale - limited time',
    discountType: 'percentage',
    discountValue: 25,
    currency: 'EUR',
    maxUses: 30,
    usedCount: 30, // Fully used
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-01-31'),
    applicablePlans: [], // All plans
    minimumOrderValue: 20,
    isActive: true,
    createdBy: 'admin'
  },
  {
    code: 'PREMIUM10',
    description: 'Premium plan discount',
    discountType: 'percentage',
    discountValue: 10,
    currency: 'EUR',
    maxUses: 75,
    usedCount: 12,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    applicablePlans: [], // All plans
    minimumOrderValue: 50,
    isActive: true,
    createdBy: 'admin'
  }
];

async function populateDiscountCodes() {
  try {
    console.log('🔄 Starting discount codes population...');

    // Clear existing discount codes
    await DiscountCode.deleteMany({});
    console.log('🗑️  Cleared existing discount codes');

    // Insert new discount codes
    const createdCodes = await DiscountCode.insertMany(discountCodes);
    console.log(`✅ Successfully created ${createdCodes.length} discount codes`);

    // Display created codes
    console.log('\n📋 Created Discount Codes:');
    createdCodes.forEach((code, index) => {
      console.log(`${index + 1}. ${code.code} - ${code.discountType === 'percentage' ? code.discountValue + '%' : '€' + code.discountValue}`);
      console.log(`   Description: ${code.description}`);
      console.log(`   Usage: ${code.usedCount}/${code.maxUses} (${Math.floor((code.usedCount/code.maxUses)*100)}%)`);
      console.log(`   Valid: ${code.validFrom.toLocaleDateString()} - ${code.validUntil.toLocaleDateString()}`);
      console.log(`   Status: ${code.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log('');
    });

    console.log('🎉 Discount codes population completed successfully!');
  } catch (error) {
    console.error('❌ Error populating discount codes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    populateDiscountCodes();
  });
}

module.exports = { populateDiscountCodes };
