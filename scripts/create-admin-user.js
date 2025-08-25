const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('🔍 Current MONGODB_URI:', mongoUri);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  avatar: String,
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'pro', 'unlimited'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    seats: {
      type: Number,
      default: 3
    },
    storageUsed: {
      type: Number,
      default: 0
    }
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    await connectDB();
    
    const adminEmail = 'admin@cvcircle.com';
    const adminPassword = 'admin123456';
    
    // Check if admin user already exists
    const existingUser = await User.findOne({ email: adminEmail });
    
    if (existingUser) {
      console.log(`✅ Admin user ${adminEmail} already exists`);
      console.log(`Role: ${existingUser.role}`);
      
      // Update to admin if not already admin
      if (existingUser.role !== 'admin') {
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`✅ Updated ${adminEmail} to admin role`);
      }
      
      return;
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    // Create admin user
    const adminUser = new User({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
      subscription: {
        plan: 'unlimited',
        status: 'active',
        startDate: new Date(),
        seats: 10,
        storageUsed: 0
      },
      settings: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true
        }
      }
    });
    
    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ${adminUser.role}`);
    console.log('\n🔐 Login credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('\n🌐 Access admin dashboard at: http://localhost:3001/admin');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createAdminUser();
