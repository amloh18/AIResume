const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

const User = mongoose.model('User', userSchema);

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const users = await User.find({}, 'email firstName lastName role');
    console.log('📋 All users in database:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.firstName} ${user.lastName}) - Role: ${user.role}`);
    });
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

listUsers(); 