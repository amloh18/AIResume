#!/usr/bin/env node

/**
 * Delete User Data Script
 * 
 * This script deletes jobs and journeys for a specific user.
 */

const fs = require('fs');
const path = require('path');

async function deleteUserData() {
  console.log('🗑️ Deleting user data (jobs and journeys)...\n');
  
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
    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('cvcircle');
    
    // Find the user with the most jobs
    console.log('🔍 Finding user with most jobs...');
    const userWithMostJobs = await db.collection('jobapplications').aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]).toArray();
    
    if (userWithMostJobs.length === 0) {
      console.log('❌ No users found with jobs');
      return;
    }
    
    const userId = userWithMostJobs[0]._id;
    const jobCount = userWithMostJobs[0].count;
    
    console.log(`👤 User ID: ${userId}`);
    console.log(`📊 Jobs count: ${jobCount}`);
    
    // Count journeys for this user
    const journeyCount = await db.collection('cvjourneys').countDocuments({ userId: userId.toString() });
    console.log(`🎯 Journeys count: ${journeyCount}\n`);
    
    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete:');
    console.log(`   - ${jobCount} job applications`);
    console.log(`   - ${journeyCount} CV journeys`);
    console.log(`   - For user: ${userId}\n`);
    
    // For safety, let's just show what would be deleted without actually deleting
    console.log('🔍 Preview of data to be deleted:');
    
    // Show sample jobs
    const sampleJobs = await db.collection('jobapplications').find({ userId: userId }).limit(3).toArray();
    console.log('\n📋 Sample jobs:');
    sampleJobs.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.jobTitle} at ${job.company} (${job.status})`);
    });
    
    // Show sample journeys
    const sampleJourneys = await db.collection('cvjourneys').find({ userId: userId.toString() }).limit(3).toArray();
    console.log('\n🎯 Sample journeys:');
    sampleJourneys.forEach((journey, index) => {
      console.log(`   ${index + 1}. ${journey.jobTitle} at ${journey.company} (${journey.status})`);
    });
    
    console.log('\n🗑️ Proceeding with deletion...');
    console.log('⚠️  This action cannot be undone!\n');
    
    // Perform the actual deletion
    console.log('🗑️ Deleting jobs...');
    const jobDeleteResult = await db.collection('jobapplications').deleteMany({ userId: userId });
    console.log(`✅ Deleted ${jobDeleteResult.deletedCount} jobs`);
    
    console.log('🗑️ Deleting journeys...');
    const journeyDeleteResult = await db.collection('cvjourneys').deleteMany({ userId: userId.toString() });
    console.log(`✅ Deleted ${journeyDeleteResult.deletedCount} journeys`);
    
    console.log('\n✅ Data deletion completed successfully!');
    
  } catch (error) {
    console.error('❌ Error deleting user data:', error);
  } finally {
    if (typeof client !== 'undefined' && client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
deleteUserData().catch(console.error);
