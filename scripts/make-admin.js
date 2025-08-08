const mongoose = require('mongoose');
require('dotenv').config();

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

// User Schema (simplified for the script)
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function makeAdmin(email) {
  try {
    await connectDB();
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }
    
    // Update user role to admin
    user.role = 'admin';
    await user.save();
    
    console.log(`✅ Successfully made ${email} an admin`);
    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    
  } catch (error) {
    console.error('❌ Error making user admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node scripts/make-admin.js <email>');
  console.log('Example: node scripts/make-admin.js admin@example.com');
  process.exit(1);
}

makeAdmin(email); 