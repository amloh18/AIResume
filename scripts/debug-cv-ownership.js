require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Simple schemas for debugging
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

async function debugCVOwnership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all users
    const users = await User.find();
    console.log(`\nFound ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        id: user._id.toString(),
        email: user.email,
        firebaseUid: user.firebaseUid,
        name: `${user.firstName} ${user.lastName}`
      });
    });
    
    // Get all CVs
    const cvs = await CV.find();
    console.log(`\nFound ${cvs.length} CVs:`);
    cvs.forEach((cv, index) => {
      console.log(`CV ${index + 1}:`, {
        id: cv._id.toString(),
        title: cv.title,
        userId: cv.userId.toString(),
        userIdType: typeof cv.userId,
        isMaster: cv.isMaster,
        firebaseUid: cv.firebaseUid || 'NOT_SET'
      });
    });
    
    // Try to match CVs with users
    console.log('\n--- CV Ownership Analysis ---');
    for (const cv of cvs) {
      const cvOwner = users.find(user => user._id.toString() === cv.userId.toString());
      console.log(`CV "${cv.title}":`, {
        cvId: cv._id.toString(),
        ownerId: cv.userId.toString(),
        ownerFound: !!cvOwner,
        ownerEmail: cvOwner?.email || 'UNKNOWN',
        ownerFirebaseUid: cvOwner?.firebaseUid || 'NOT_SET',
        cvFirebaseUid: cv.firebaseUid || 'NOT_SET',
        needsMigration: !cv.firebaseUid && cvOwner?.firebaseUid
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Debug error:', error);
    process.exit(1);
  }
}

debugCVOwnership();
