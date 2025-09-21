require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Simple CV schema for debugging
const CVSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  firebaseUid: String,
  title: String,
  isMaster: Boolean,
  status: String
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: String,
  firebaseUid: String,
  firstName: String,
  lastName: String
}, { timestamps: true });

const CV = mongoose.models.CV || mongoose.model('CV', CVSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function debugMasterCV() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const userId = '68b3126add4f9e4d7922d8ec';
    console.log('Debugging user:', userId);
    
    // Check if user exists
    const user = await User.findById(userId);
    console.log('User found:', !!user);
    if (user) {
      console.log('User details:', {
        id: user._id,
        email: user.email,
        firebaseUid: user.firebaseUid,
        firstName: user.firstName,
        lastName: user.lastName
      });
    }
    
    // Check CVs by userId (ObjectId)
    const cvsByUserId = await CV.find({ userId: new mongoose.Types.ObjectId(userId) });
    console.log('CVs by userId (ObjectId):', cvsByUserId.length);
    
    // Check CVs by userId (string)
    const cvsByUserIdString = await CV.find({ userId: userId });
    console.log('CVs by userId (string):', cvsByUserIdString.length);
    
    // Check all CVs for this user (any format)
    const allCVs = await CV.find({
      $or: [
        { userId: new mongoose.Types.ObjectId(userId) },
        { userId: userId }
      ]
    });
    console.log('All CVs (any format):', allCVs.length);
    
    // Show sample CVs
    allCVs.forEach((cv, index) => {
      console.log(`CV ${index + 1}:`, {
        id: cv._id,
        title: cv.title,
        userId: cv.userId,
        userIdType: typeof cv.userId,
        isMaster: cv.isMaster,
        firebaseUid: cv.firebaseUid
      });
    });
    
    // Check if there are ANY CVs in the database
    const totalCVs = await CV.countDocuments();
    console.log('Total CVs in database:', totalCVs);
    
    // Check first 5 CVs to see structure
    const sampleCVs = await CV.find().limit(5);
    console.log('Sample CVs:');
    sampleCVs.forEach((cv, index) => {
      console.log(`Sample CV ${index + 1}:`, {
        id: cv._id,
        title: cv.title,
        userId: cv.userId,
        userIdType: typeof cv.userId,
        isMaster: cv.isMaster,
        firebaseUid: cv.firebaseUid
      });
    });
    
    // If user has firebaseUid, check by that too
    if (user && user.firebaseUid) {
      const cvsByFirebaseUid = await CV.find({ firebaseUid: user.firebaseUid });
      console.log('CVs by firebaseUid:', cvsByFirebaseUid.length);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Debug error:', error);
    process.exit(1);
  }
}

debugMasterCV();
