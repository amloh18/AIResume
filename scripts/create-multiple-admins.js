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

// Admin users to create
const adminUsers = [
  {
    email: 'admin@cvcircle.io',
    password: 'admin123456',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  {
    email: 'superadmin@cvcircle.io',
    password: 'superadmin123',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'admin'
  },
  {
    email: 'manager@cvcircle.io',
    password: 'manager123',
    firstName: 'Manager',
    lastName: 'User',
    role: 'admin'
  },
  {
    email: 'support@cvcircle.io',
    password: 'support123',
    firstName: 'Support',
    lastName: 'Team',
    role: 'admin'
  },
  {
    email: 'dev@cvcircle.io',
    password: 'dev123456',
    firstName: 'Developer',
    lastName: 'User',
    role: 'admin'
  }
];

async function createAdminUsers() {
  try {
    await connectDB();
    
    console.log('🚀 Creating admin users...\n');
    
    for (const adminData of adminUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: adminData.email });
        
        if (existingUser) {
          console.log(`✅ User ${adminData.email} already exists`);
          
          // Update to admin if not already admin
          if (existingUser.role !== 'admin') {
            existingUser.role = 'admin';
            await existingUser.save();
            console.log(`   ↳ Updated to admin role`);
          } else {
            console.log(`   ↳ Already admin role`);
          }
        } else {
          // Hash password
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);
          
          // Create admin user
          const adminUser = new User({
            email: adminData.email,
            password: hashedPassword,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            role: adminData.role,
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
          console.log(`✅ Created admin user: ${adminData.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error creating ${adminData.email}:`, error.message);
      }
    }
    
    console.log('\n📋 Admin Account Summary:');
    console.log('========================');
    
    for (const adminData of adminUsers) {
      console.log(`📧 Email: ${adminData.email}`);
      console.log(`🔐 Password: ${adminData.password}`);
      console.log(`👤 Name: ${adminData.firstName} ${adminData.lastName}`);
      console.log(`🎭 Role: ${adminData.role}`);
      console.log('---');
    }
    
    console.log('\n🌐 Access admin dashboard at: http://localhost:3001/admin');
    console.log('🔐 Use any of the above credentials to login');
    
  } catch (error) {
    console.error('❌ Error creating admin users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createAdminUsers();
