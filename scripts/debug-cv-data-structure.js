require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Simple CV schema for debugging
const CVSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  firebaseUid: String,
  title: String,
  cvData: mongoose.Schema.Types.Mixed,
  templateData: mongoose.Schema.Types.Mixed,
  status: String,
  isMaster: Boolean
}, { timestamps: true });

const CV = mongoose.models.CV || mongoose.model('CV', CVSchema);

async function debugCVDataStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get the CV that was created for our Firebase user
    const firebaseUid = 'Pb2CeNSbxGYNJhKEQVGD6xYqKvs1';
    const userId = '68b3126add4f9e4d7922d8ec';
    
    console.log('🔍 Looking for CVs with Firebase UID:', firebaseUid);
    
    const cvsByFirebaseUid = await CV.find({ firebaseUid }).lean();
    console.log(`📊 Found ${cvsByFirebaseUid.length} CVs by Firebase UID`);
    
    console.log('\n🔍 Looking for CVs with user ID:', userId);
    const cvsByUserId = await CV.find({ userId }).lean();
    console.log(`📊 Found ${cvsByUserId.length} CVs by user ID`);
    
    // Examine the structure of the first CV found
    const allCVs = [...cvsByFirebaseUid, ...cvsByUserId];
    
    if (allCVs.length > 0) {
      const cv = allCVs[0];
      console.log('\n📋 CV Data Structure Analysis:');
      console.log('CV ID:', cv._id);
      console.log('Title:', cv.title);
      console.log('User ID:', cv.userId);
      console.log('Firebase UID:', cv.firebaseUid);
      console.log('Is Master:', cv.isMaster);
      console.log('Status:', cv.status);
      
      console.log('\n🔍 CV Data Field Structure:');
      if (cv.cvData) {
        console.log('cvData exists:', typeof cv.cvData);
        console.log('cvData keys:', Object.keys(cv.cvData));
        
        // Check if it follows CVDataStructure format
        if (cv.cvData.basics) {
          console.log('\n✅ Has basics section:');
          console.log('  basics keys:', Object.keys(cv.cvData.basics));
          console.log('  name:', cv.cvData.basics.name);
          console.log('  email:', cv.cvData.basics.email);
          
          if (cv.cvData.basics.location) {
            console.log('  location keys:', Object.keys(cv.cvData.basics.location));
          }
          
          if (cv.cvData.basics.profiles) {
            console.log('  profiles count:', cv.cvData.basics.profiles.length);
            if (cv.cvData.basics.profiles.length > 0) {
              console.log('  first profile:', cv.cvData.basics.profiles[0]);
            }
          }
        } else {
          console.log('❌ No basics section found');
        }
        
        // Check work section
        if (cv.cvData.work) {
          console.log('\n✅ Has work section:');
          console.log('  work type:', Array.isArray(cv.cvData.work) ? 'array' : typeof cv.cvData.work);
          console.log('  work length:', cv.cvData.work.length);
          if (cv.cvData.work.length > 0) {
            console.log('  first work item keys:', Object.keys(cv.cvData.work[0]));
            console.log('  first work item:', cv.cvData.work[0]);
          }
        } else {
          console.log('❌ No work section found');
        }
        
        // Check other sections
        const sections = ['education', 'skills', 'projects', 'certificates', 'languages'];
        sections.forEach(section => {
          if (cv.cvData[section]) {
            console.log(`\n✅ Has ${section} section:`, Array.isArray(cv.cvData[section]) ? `array(${cv.cvData[section].length})` : typeof cv.cvData[section]);
            if (Array.isArray(cv.cvData[section]) && cv.cvData[section].length > 0) {
              console.log(`  first ${section} item:`, cv.cvData[section][0]);
            }
          } else {
            console.log(`❌ No ${section} section found`);
          }
        });
      } else {
        console.log('❌ No cvData field found!');
      }
      
      // Check template data
      console.log('\n🎨 Template Data:');
      if (cv.templateData) {
        console.log('templateData exists:', typeof cv.templateData);
        console.log('templateData keys:', Object.keys(cv.templateData));
      } else {
        console.log('❌ No templateData field found');
      }
      
    } else {
      console.log('❌ No CVs found for this user');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Debug error:', error);
    process.exit(1);
  }
}

debugCVDataStructure();
