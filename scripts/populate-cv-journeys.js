#!/usr/bin/env node

/**
 * CV Journey Population Script
 * 
 * This script creates CV journey records based on existing job applications.
 */

const fs = require('fs');
const path = require('path');

async function populateCVJourneys() {
  console.log('🚀 Populating CV Journeys from existing jobs...\n');
  
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
    
    // Get all existing job applications
    console.log('📋 Fetching existing job applications...');
    const jobs = await db.collection('jobapplications').find({}).toArray();
    console.log(`✅ Found ${jobs.length} job applications\n`);
    
    if (jobs.length === 0) {
      console.log('❌ No job applications found. Please create some jobs first.');
      return;
    }
    
    // Clear existing CV journeys
    console.log('🧹 Clearing existing CV journeys...');
    await db.collection('cvjourneys').deleteMany({});
    console.log('✅ Cleared existing CV journeys\n');
    
    // Create CV journeys for each job
    console.log('🎯 Creating CV journeys...');
    const cvJourneys = [];
    
    for (const job of jobs) {
      // Determine journey status and current step based on job data
      let status = 'in-progress';
      let currentStep = 1;
      let atsScore = null;
      
      // If job has CV linked, move to step 2
      if (job.cvId) {
        currentStep = 2;
      }
      
      // If job has cover letter, move to step 4
      if (job.coverLetterId) {
        currentStep = 4;
      }
      
      // If job is completed/accepted, mark as completed
      if (job.status === 'accepted' || job.status === 'completed') {
        status = 'completed';
        currentStep = 5;
      }
      
      // Create journey data
      const journeyData = {
        journeyId: `journey_${job._id.toString()}`, // Unique journey ID
        userId: job.userId,
        jobId: job._id.toString(),
        jobTitle: job.jobTitle || job.title || 'Untitled Job',
        company: job.company || 'Unknown Company',
        status: status,
        currentStep: currentStep,
        totalSteps: 5,
        atsScore: atsScore,
        cvId: job.cvId ? job.cvId.toString() : null,
        coverLetterId: job.coverLetterId || null,
        steps: [
          { 
            stepId: 1, 
            name: 'Add Job', 
            status: 'completed',
            completedAt: job.createdAt || new Date()
          },
          { 
            stepId: 2, 
            name: 'Create CV', 
            status: job.cvId ? 'completed' : 'pending',
            completedAt: job.cvId ? job.updatedAt : null
          },
          { 
            stepId: 3, 
            name: 'ATS Score', 
            status: 'pending',
            completedAt: null
          },
          { 
            stepId: 4, 
            name: 'Cover Letter', 
            status: job.coverLetterId ? 'completed' : 'pending',
            completedAt: job.coverLetterId ? job.updatedAt : null
          },
          { 
            stepId: 5, 
            name: 'Download', 
            status: status === 'completed' ? 'completed' : 'pending',
            completedAt: status === 'completed' ? job.updatedAt : null
          }
        ],
        metadata: {
          createdAt: job.createdAt || new Date(),
          updatedAt: job.updatedAt || new Date(),
          lastAccessedAt: new Date(),
          source: 'job-application'
        }
      };
      
      cvJourneys.push(journeyData);
    }
    
    // Insert CV journeys
    if (cvJourneys.length > 0) {
      const result = await db.collection('cvjourneys').insertMany(cvJourneys);
      console.log(`✅ Created ${result.insertedCount} CV journeys`);
      
      // Display summary
      console.log('\n📊 Journey Summary:');
      const statusCounts = cvJourneys.reduce((acc, journey) => {
        acc[journey.status] = (acc[journey.status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} journeys`);
      });
      
      console.log('\n🎯 Sample Journeys Created:');
      cvJourneys.slice(0, 3).forEach((journey, index) => {
        console.log(`  ${index + 1}. ${journey.jobTitle} at ${journey.company} (Step ${journey.currentStep}/5)`);
      });
    }
    
    console.log('\n✅ CV Journey population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error populating CV journeys:', error);
  } finally {
    if (typeof client !== 'undefined' && client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
populateCVJourneys().catch(console.error);
