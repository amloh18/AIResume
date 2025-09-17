#!/usr/bin/env node

/**
 * Add Test Jobs Script
 * 
 * This script adds test job data to the database for testing the job linking functionality.
 */

const fs = require('fs');
const path = require('path');

async function addTestJobs() {
  console.log('🚀 Adding test jobs to database...\n');
  
  try {
    // Set environment variable
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const uriMatch = envContent.match(/MONGODB_URI=(.+)/);
      if (uriMatch) {
        process.env.MONGODB_URI = uriMatch[1].trim();
        console.log('✅ Loaded MongoDB URI from .env.local');
      }
    }
    
    // Connect to MongoDB directly
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('cvcircle');
    
    // Test user ID (use the same one as in the app)
    const testUserId = '6889b151d17daa1eaee91a5c';
    
    // Test job data
    const testJobs = [
      {
        userId: testUserId,
        jobTitle: "Senior Software Engineer",
        company: "Google",
        jobUrl: "https://careers.google.com/jobs/results/123456",
        jobDescription: "We're looking for a Senior Software Engineer to join our team...",
        location: "Mountain View, CA",
        salary: {
          min: 150000,
          max: 200000,
          currency: "USD",
          period: "yearly"
        },
        status: "applied",
        priority: "high",
        applicationDate: new Date("2024-01-15"),
        notes: "Great opportunity at Google. Applied through referral.",
        contacts: [
          {
            name: "Sarah Johnson",
            role: "Hiring Manager",
            email: "sarah.johnson@google.com",
            linkedin: "https://linkedin.com/in/sarahjohnson"
          }
        ],
        tags: ["google", "senior", "software"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        jobTitle: "Full Stack Developer",
        company: "Netflix",
        jobUrl: "https://jobs.netflix.com/jobs/789012",
        jobDescription: "Join Netflix as a Full Stack Developer...",
        location: "Los Gatos, CA",
        salary: {
          min: 120000,
          max: 180000,
          currency: "USD",
          period: "yearly"
        },
        status: "screening",
        priority: "medium",
        applicationDate: new Date("2024-01-10"),
        notes: "Passed initial screening, waiting for technical interview.",
        interviews: [
          {
            type: "phone",
            date: new Date("2024-01-20"),
            duration: 30,
            interviewer: "Mike Chen",
            notes: "Good conversation about technical background",
            outcome: "completed",
            feedback: "Strong candidate, proceed to technical round"
          }
        ],
        tags: ["netflix", "full-stack", "streaming"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: testUserId,
        jobTitle: "Frontend Engineer",
        company: "Meta",
        jobUrl: "https://careers.meta.com/jobs/345678",
        jobDescription: "Join Meta as a Frontend Engineer...",
        location: "Menlo Park, CA",
        salary: {
          min: 130000,
          max: 190000,
          currency: "USD",
          period: "yearly"
        },
        status: "interviewing",
        priority: "high",
        applicationDate: new Date("2024-01-05"),
        notes: "Currently in interview process. Second round scheduled.",
        tags: ["meta", "frontend", "react"],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Clear existing jobs for this user
    console.log('🧹 Clearing existing jobs for test user...');
    await db.collection('jobapplications').deleteMany({ userId: testUserId });
    console.log('✅ Cleared existing jobs\n');
    
    // Insert test jobs
    console.log('💼 Adding test jobs...');
    const result = await db.collection('jobapplications').insertMany(testJobs);
    console.log(`✅ Added ${result.insertedCount} test jobs\n`);
    
    // Verify jobs were added
    const jobCount = await db.collection('jobapplications').countDocuments({ userId: testUserId });
    console.log(`📊 Total jobs for test user: ${jobCount}`);
    
    console.log('\n🎉 Test jobs added successfully!');
    console.log('\n📋 Test Jobs Added:');
    testJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.jobTitle} at ${job.company} (${job.status})`);
    });
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error adding test jobs:', error.message);
    
    if (error.message.includes('Could not connect to any servers')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your MongoDB Atlas IP whitelist');
      console.log('2. Verify your MongoDB URI is correct');
      console.log('3. Ensure your MongoDB cluster is running');
    }
  }
}

addTestJobs(); 