/**
 * Script to create a test job that triggers follow-up notifications
 * This job will have:
 * - Status: 'applied'
 * - updatedAt: 7 days ago (to trigger follow-up)
 * - applicationDate: 7 days ago
 * - Contact information for email testing
 * 
 * Usage: 
 *   node scripts/create-test-followup-job.js [userEmail]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const mongoose = require('mongoose');
const path = require('path');

// Import using dynamic import for ES modules
let JobApplication, User, getConnection;

async function loadModules() {
  if (!JobApplication) {
    const dbModule = await import('../src/lib/database/index.js');
    getConnection = dbModule.getConnection || dbModule.default;
    
    const jobModel = await import('../src/models/JobApplication.js');
    JobApplication = jobModel.default;
    
    const userModel = await import('../src/models/User.js');
    User = userModel.default;
  }
}

async function createTestFollowUpJob() {
  try {
    // Load ES modules
    await loadModules();
    
    // Get user email from command line args or use default
    const userEmail = process.argv[2] || process.env.TEST_USER_EMAIL || 'jamie@gmail.com';
    
    console.log(`🔍 Creating test follow-up job for user: ${userEmail}`);
    
    // Connect to database
    await getConnection();
    console.log('✅ Connected to database');
    
    // Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      console.log('💡 Available users:');
      const users = await User.find({}, 'email').limit(10);
      users.forEach(u => console.log(`   - ${u.email}`));
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email} (${user._id})`);
    
    // Calculate dates
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Check if test job already exists
    const existingTestJob = await JobApplication.findOne({
      userId: user._id,
      jobTitle: 'Test Follow-Up Job - Software Engineer',
      company: 'Test Company Inc'
    });
    
    if (existingTestJob) {
      console.log('⚠️  Test job already exists. Updating it...');
      
      // Update existing job
      existingTestJob.status = 'applied';
      existingTestJob.applicationDate = sevenDaysAgo;
      existingTestJob.updatedAt = sevenDaysAgo; // This is key for triggering follow-up
      existingTestJob.contactDetails = {
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        phone: '+1-555-0123',
        role: 'HR Manager'
      };
      existingTestJob.contacts = [
        {
          name: 'John Doe',
          role: 'HR Manager',
          email: 'john.doe@testcompany.com',
          phone: '+1-555-0123'
        },
        {
          name: 'Jane Smith',
          role: 'Recruiter',
          email: 'jane.smith@testcompany.com',
          linkedin: 'https://linkedin.com/in/janesmith'
        }
      ];
      existingTestJob.deadline = new Date(now);
      existingTestJob.deadline.setDate(existingTestJob.deadline.getDate() + 14); // 2 weeks from now
      existingTestJob.notes = 'Test job for follow-up and email testing. This job was created 7 days ago to trigger follow-up notifications.';
      existingTestJob.priority = 'high';
      
      await existingTestJob.save();
      console.log(`✅ Updated existing test job: ${existingTestJob._id}`);
      console.log(`   Status: ${existingTestJob.status}`);
      console.log(`   Application Date: ${existingTestJob.applicationDate?.toLocaleDateString()}`);
      console.log(`   Updated At: ${existingTestJob.updatedAt.toLocaleDateString()} (${Math.floor((now.getTime() - existingTestJob.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
      console.log(`   Deadline: ${existingTestJob.deadline?.toLocaleDateString()}`);
      console.log(`   Contact: ${existingTestJob.contactDetails?.name} (${existingTestJob.contactDetails?.email})`);
    } else {
      // Create new test job
      const testJob = new JobApplication({
        userId: user._id,
        jobTitle: 'Test Follow-Up Job - Software Engineer',
        company: 'Test Company Inc',
        location: 'San Francisco, CA',
        jobUrl: 'https://testcompany.com/careers/software-engineer',
        jobDescription: 'This is a test job created to test follow-up notifications and email functionality. The job was created 7 days ago to trigger follow-up alerts.',
        status: 'applied',
        priority: 'high',
        applicationDate: sevenDaysAgo,
        deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        updatedAt: sevenDaysAgo, // Key: Set to 7 days ago to trigger follow-up
        createdAt: sevenDaysAgo,
        contactDetails: {
          name: 'John Doe',
          email: 'john.doe@testcompany.com',
          phone: '+1-555-0123',
          role: 'HR Manager'
        },
        contacts: [
          {
            name: 'John Doe',
            role: 'HR Manager',
            email: 'john.doe@testcompany.com',
            phone: '+1-555-0123'
          },
          {
            name: 'Jane Smith',
            role: 'Recruiter',
            email: 'jane.smith@testcompany.com',
            linkedin: 'https://linkedin.com/in/janesmith'
          }
        ],
        salary: {
          min: 120000,
          max: 180000,
          currency: 'USD',
          period: 'yearly'
        },
        notes: 'Test job for follow-up and email testing. This job was created 7 days ago to trigger follow-up notifications.',
        tags: ['test', 'follow-up', 'email-testing'],
        sponsorship: 'unknown',
        interviews: [],
        followUps: [],
        attachments: []
      });
      
      await testJob.save();
      console.log(`✅ Created test job: ${testJob._id}`);
      console.log(`   Status: ${testJob.status}`);
      console.log(`   Application Date: ${testJob.applicationDate?.toLocaleDateString()}`);
      console.log(`   Updated At: ${testJob.updatedAt.toLocaleDateString()} (${Math.floor((now.getTime() - testJob.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
      console.log(`   Deadline: ${testJob.deadline?.toLocaleDateString()}`);
      console.log(`   Contact: ${testJob.contactDetails?.name} (${testJob.contactDetails?.email})`);
    }
    
    console.log('\n📧 Follow-up should be triggered because:');
    console.log('   - Status is "applied"');
    console.log('   - Updated at is 7+ days ago');
    console.log('   - Contact information is available for email testing');
    console.log('\n✅ Test job ready for follow-up and email testing!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test job:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
createTestFollowUpJob();

