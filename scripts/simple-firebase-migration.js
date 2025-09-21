require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Simple schemas
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

async function migrateFirebaseUIDs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🚀 Starting Firebase UID migration...');
    
    // Get all users with Firebase UIDs
    const firebaseUsers = await User.find({ 
      firebaseUid: { $exists: true, $ne: null, $ne: '' } 
    });
    
    console.log(`📊 Found ${firebaseUsers.length} users with Firebase UIDs`);
    
    // Create mapping of MongoDB userId to Firebase UID
    const userIdToFirebaseUid = {};
    firebaseUsers.forEach(user => {
      userIdToFirebaseUid[user._id.toString()] = user.firebaseUid;
      console.log(`   ${user.email}: ${user._id.toString()} -> ${user.firebaseUid}`);
    });
    
    // Find CVs that don't have firebaseUid but have a userId that maps to a Firebase user
    const cvsToUpdate = await CV.find({
      firebaseUid: { $exists: false },
      userId: { $exists: true }
    });
    
    console.log(`📊 Found ${cvsToUpdate.length} CVs to potentially migrate`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const cv of cvsToUpdate) {
      const userIdString = cv.userId.toString();
      const firebaseUid = userIdToFirebaseUid[userIdString];
      
      if (firebaseUid) {
        console.log(`🔄 Updating CV "${cv.title}" (${cv._id}) with Firebase UID: ${firebaseUid}`);
        
        await CV.updateOne(
          { _id: cv._id },
          { $set: { firebaseUid } }
        );
        updatedCount++;
      } else {
        console.log(`⏭️  Skipping CV "${cv.title}" (${cv._id}) - user has no Firebase UID`);
        skippedCount++;
      }
    }
    
    console.log('\n✅ Migration complete:');
    console.log(`   📈 Updated: ${updatedCount} CVs`);
    console.log(`   ⏭️  Skipped: ${skippedCount} CVs`);
    
    // Verify migration
    console.log('\n🔍 Verification:');
    const totalCVs = await CV.countDocuments({});
    const cvsWithFirebaseUid = await CV.countDocuments({
      firebaseUid: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log(`📊 CVs with Firebase UID: ${cvsWithFirebaseUid}/${totalCVs}`);
    
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateFirebaseUIDs();
