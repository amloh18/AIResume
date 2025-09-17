// Simple script to test CV data loading
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/circle-cv-app');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// CV Schema (simplified)
const cvSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  title: String,
  cvData: mongoose.Schema.Types.Mixed,
  status: { type: String, default: 'draft' },
  isMaster: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CV = mongoose.model('CV', cvSchema);

const testCVData = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Checking CV data...');
    
    // Get all CVs
    const allCVs = await CV.find({}).lean();
    console.log('📊 Total CVs in database:', allCVs.length);
    
    if (allCVs.length > 0) {
      console.log('📋 CV Details:');
      allCVs.forEach((cv, index) => {
        console.log(`  ${index + 1}. ID: ${cv._id}`);
        console.log(`     Title: ${cv.title}`);
        console.log(`     User ID: ${cv.userId}`);
        console.log(`     Status: ${cv.status}`);
        console.log(`     Is Master: ${cv.isMaster}`);
        console.log(`     Created: ${cv.createdAt}`);
        console.log('     ---');
      });
      
      // Group by user
      const userGroups = {};
      allCVs.forEach(cv => {
        const userId = cv.userId.toString();
        if (!userGroups[userId]) {
          userGroups[userId] = [];
        }
        userGroups[userId].push(cv);
      });
      
      console.log('👥 CVs by User:');
      Object.keys(userGroups).forEach(userId => {
        console.log(`  User ${userId}: ${userGroups[userId].length} CVs`);
        userGroups[userId].forEach(cv => {
          console.log(`    - ${cv.title} (Master: ${cv.isMaster})`);
        });
      });
    } else {
      console.log('❌ No CVs found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testCVData();
