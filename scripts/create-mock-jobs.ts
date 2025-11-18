import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import User from '../src/models/User';
import { JobApplication } from '../src/models';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function createMockJobs() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB directly (avoiding server-only imports)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to database');
    } else {
      console.log('✅ Already connected to database');
    }

    const userEmail = 'amarjotasl@gmail.com';
    console.log(`🔍 Finding user: ${userEmail}`);
    
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`✅ User found: ${user._id} (${user.email})`);

    const userId = user._id;

    // Create a draft job
    const draftJobData = {
      userId,
      jobTitle: 'Senior Software Engineer',
      company: 'Tech Corp',
      jobUrl: 'https://example.com/jobs/senior-software-engineer',
      jobDescription: 'We are looking for a Senior Software Engineer to join our team. You will work on cutting-edge technologies and help build scalable applications.',
      location: 'San Francisco, CA',
      source: 'extension',
      status: 'draft',
      priority: 'high',
      salary: {
        min: 120000,
        max: 180000,
        currency: 'USD',
        period: 'yearly'
      },
      notes: 'This is a mock draft job created for testing',
      sponsorship: 'yes',
      tags: ['extension-saved', 'mock'],
      contactDetails: {
        name: 'John Doe',
        email: 'john.doe@techcorp.com',
        phone: '+1-555-0123',
        role: 'Hiring Manager'
      },
      contacts: [],
      interviews: [],
      followUps: [],
      attachments: [],
      isArchived: false
    };

    const draftJob = await JobApplication.create(draftJobData);
    console.log(`✅ Draft job created:`, {
      id: draftJob._id,
      status: draftJob.status,
      title: draftJob.jobTitle,
      company: draftJob.company
    });

    // Create a created job
    const createdJobData = {
      userId,
      jobTitle: 'Full Stack Developer',
      company: 'StartupXYZ',
      jobUrl: 'https://example.com/jobs/full-stack-developer',
      jobDescription: 'Join our fast-growing startup as a Full Stack Developer. You will work with React, Node.js, and modern cloud technologies.',
      location: 'Remote',
      source: 'extension',
      status: 'created',
      priority: 'medium',
      salary: {
        min: 100000,
        max: 150000,
        currency: 'USD',
        period: 'yearly'
      },
      notes: 'This is a mock created job for testing',
      sponsorship: 'unknown',
      tags: ['extension-saved', 'mock'],
      contactDetails: {
        name: 'Jane Smith',
        email: 'jane.smith@startupxyz.com',
        phone: '+1-555-0456',
        role: 'Recruiter'
      },
      contacts: [],
      interviews: [],
      followUps: [],
      attachments: [],
      isArchived: false
    };

    const createdJob = await JobApplication.create(createdJobData);
    console.log(`✅ Created job created:`, {
      id: createdJob._id,
      status: createdJob.status,
      title: createdJob.jobTitle,
      company: createdJob.company
    });

    console.log('\n✅ Mock jobs created successfully!');
    console.log(`   - Draft job: ${draftJob._id}`);
    console.log(`   - Created job: ${createdJob._id}`);

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating mock jobs:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

createMockJobs();

