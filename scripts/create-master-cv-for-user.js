require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Simple schemas for debugging
const CVSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  firebaseUid: String,
  title: String,
  isMaster: Boolean,
  status: String,
  cvData: {
    basics: {
      name: String,
      email: String,
      phone: String,
      summary: String,
      location: {
        city: String,
        region: String
      }
    },
    work: [Object],
    education: [Object],
    skills: [Object],
    projects: [Object]
  },
  styling: {
    primaryColor: String,
    secondaryColor: String,
    fontFamily: String,
    fontSize: String,
    spacing: Number
  },
  metadata: {
    lastModified: Date,
    tags: [String],
    isPublic: Boolean,
    viewCount: Number,
    downloadCount: Number,
    starred: Boolean
  }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: String,
  firebaseUid: String,
  firstName: String,
  lastName: String
}, { timestamps: true });

const CV = mongoose.models.CV || mongoose.model('CV', CVSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createMasterCVForUser(userEmail) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }
    
    console.log('Found user:', {
      id: user._id.toString(),
      email: user.email,
      firebaseUid: user.firebaseUid,
      name: `${user.firstName} ${user.lastName}`
    });
    
    // Check if user already has a master CV
    const existingMasterCV = await CV.findOne({
      $or: [
        { userId: user._id, isMaster: true },
        { firebaseUid: user.firebaseUid, isMaster: true }
      ]
    });
    
    if (existingMasterCV) {
      console.log('User already has a master CV:', existingMasterCV.title);
      return;
    }
    
    // Create a master CV for the user
    const masterCV = new CV({
      userId: user._id,
      firebaseUid: user.firebaseUid,
      title: `${user.firstName} ${user.lastName}'s Master CV`,
      isMaster: true,
      status: 'draft',
      cvData: {
        basics: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: '',
          summary: 'Professional summary goes here...',
          location: {
            city: '',
            region: ''
          }
        },
        work: [],
        education: [],
        skills: [],
        projects: []
      },
      styling: {
        primaryColor: '#84cc16',
        secondaryColor: '#22c55e',
        fontFamily: 'Inter',
        fontSize: 'medium',
        spacing: 1.5
      },
      metadata: {
        lastModified: new Date(),
        tags: [],
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
        starred: false
      }
    });
    
    await masterCV.save();
    
    console.log('✅ Master CV created successfully:', {
      id: masterCV._id.toString(),
      title: masterCV.title,
      userId: masterCV.userId.toString(),
      firebaseUid: masterCV.firebaseUid,
      isMaster: masterCV.isMaster
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error creating master CV:', error);
    process.exit(1);
  }
}

// Get user email from command line argument
const userEmail = process.argv[2] || 'amarjotasl@gmail.com';
console.log(`Creating master CV for user: ${userEmail}`);
createMasterCVForUser(userEmail);
