#!/usr/bin/env node

/**
 * Simple test script to debug Master CV creation
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const CV = require('./src/models/CV');
const Template = require('./src/models/Template');

async function testMasterCVCreation() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a test user
    console.log('👤 Creating test user...');
    const testUser = new User({
      email: 'test@cvcircle.io',
      firstName: 'Test',
      lastName: 'User',
      authProviderId: 'test-user-' + Date.now(),
      authProvider: 'nextauth',
      isEmailVerified: true,
      role: 'user',
      currentPlanKey: 'free',
      usage: {
        cvJourneyCount: 0,
        cvCreatedCount: 0,
        journeysCreated: 0,
        exportCount: 0,
        atsCheckCount: 0,
        lastResetDate: new Date(),
      },
      subscription: {
        planKey: 'free',
        status: 'active',
        startDate: new Date(),
        provider: 'stripe',
        interval: 'monthly',
        seats: 3,
        storageUsed: 0,
      },
      settings: {
        theme: 'auto',
        notifications: {
          email: true,
          push: true,
        },
        timezone: 'UTC',
        languagePreference: 'en',
      }
    });

    await testUser.save();
    console.log('✅ Test user created:', testUser._id);

    // Get a template
    console.log('📋 Getting template...');
    const template = await Template.findOne({ isDefault: true });
    if (!template) {
      console.log('❌ No default template found');
      return;
    }
    console.log('✅ Template found:', template.name);

    // Test CV creation
    console.log('📝 Creating Master CV...');
    const cvData = {
      basics: {
        name: 'John Doe',
        label: 'Software Engineer',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        summary: 'Experienced software engineer with 5+ years of experience.'
      },
      work: [
        {
          name: 'Tech Corp',
          position: 'Senior Software Engineer',
          startDate: '2022-01',
          endDate: 'present',
          summary: 'Led development of microservices architecture'
        }
      ],
      education: [
        {
          institution: 'University of California',
          area: 'Computer Science',
          studyType: 'Bachelor',
          startDate: '2016-09',
          endDate: '2020-05'
        }
      ]
    };

    const masterCV = new CV({
      userId: testUser._id,
      title: 'Test Master CV',
      cvData,
      templateId: template._id,
      metadata: {
        isMaster: true,
        lastModified: new Date(),
        tags: ['master-cv', 'test'],
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
        starred: false
      }
    });

    await masterCV.save();
    console.log('✅ Master CV created successfully:', masterCV._id);

    // Test the API endpoint
    console.log('🌐 Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/cvs/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'API Test Master CV',
        cvData,
        metadata: {
          isMaster: true,
          tags: ['master-cv', 'api-test']
        },
        authProviderId: testUser.authProviderId,
        authProvider: 'nextauth'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API test passed:', result);
    } else {
      const error = await response.text();
      console.log('❌ API test failed:', response.status, error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testMasterCVCreation();
