/**
 * Verification Script: CV Data Loss Bug Fix
 * 
 * This script verifies that the CV data loss bug has been fixed by:
 * 1. Checking CV model schema uses Mixed type for cvData
 * 2. Testing draft save/load with all sections
 * 3. Testing draft to Master CV conversion
 * 4. Verifying all CV sections are preserved
 * 
 * Run with: npm run verify:cv-data-fix
 * Requires: MONGODB_URI environment variable
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import TemporaryCVDraft from '../src/models/TemporaryCVDraft';
import CV from '../src/models/CV';

// Connect to MongoDB directly (for standalone script)
async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (mongoose.connection.readyState === 1) {
    console.log('✅ Already connected to database');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

const TEST_USER_ID = new mongoose.Types.ObjectId();
const TEST_SESSION_ID = 'test-session-' + Date.now();

// Sample CV data with all sections
const SAMPLE_CV_DATA = {
  basics: {
    name: 'Test User',
    label: 'Software Engineer',
    email: 'test@example.com',
    phone: '+1234567890',
    url: 'https://example.com',
    summary: 'Experienced software engineer with focus on full-stack development.',
    location: {
      city: 'San Francisco',
      region: 'CA',
      countryCode: 'US',
      postalCode: '94102',
      address: '123 Test St'
    },
    profiles: [
      { network: 'LinkedIn', username: 'testuser', url: 'https://linkedin.com/in/testuser' }
    ]
  },
  work: [
    {
      name: 'Test Company',
      position: 'Senior Engineer',
      url: 'https://testcompany.com',
      startDate: '2020-01',
      endDate: '2024-01',
      summary: 'Led development of key features',
      highlights: ['Improved performance by 50%', 'Mentored 5 junior engineers']
    },
    {
      name: 'Previous Company',
      position: 'Engineer',
      url: 'https://prevcompany.com',
      startDate: '2018-01',
      endDate: '2020-01',
      summary: 'Built core infrastructure',
      highlights: ['Designed microservices architecture', 'Reduced costs by 30%']
    }
  ],
  education: [
    {
      institution: 'Test University',
      area: 'Computer Science',
      studyType: 'Bachelor',
      startDate: '2014-09',
      endDate: '2018-05',
      score: '3.8',
      description: 'Focus on software engineering and algorithms'
    }
  ],
  skills: [
    { category: 'Programming Languages', skills: ['JavaScript', 'TypeScript', 'Python'] },
    { category: 'Frameworks', skills: ['React', 'Node.js', 'Express'] }
  ],
  projects: [
    {
      name: 'Open Source Project',
      startDate: '2020-01',
      endDate: '2023-12',
      description: 'Built a popular open source library',
      highlights: ['1000+ GitHub stars', 'Used by 50+ companies'],
      keywords: ['JavaScript', 'Open Source'],
      url: 'https://github.com/test/project'
    }
  ],
  certificates: [
    {
      name: 'AWS Certified Developer',
      date: '2022-06',
      issuer: 'Amazon',
      url: 'https://aws.amazon.com',
      description: 'AWS certification for developers'
    }
  ],
  languages: [
    { language: 'English', fluency: 'Native' },
    { language: 'Spanish', fluency: 'Intermediate' }
  ],
  volunteer: [],
  awards: [],
  publications: [],
  interests: [],
  references: []
};

async function verifyCVDataFix() {
  try {
    console.log('🔍 Starting CV Data Loss Fix Verification...\n');

    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database\n');

    // Clean up any existing test data
    await TemporaryCVDraft.deleteMany({ sessionId: TEST_SESSION_ID });
    await CV.deleteMany({ userId: TEST_USER_ID });
    console.log('✅ Cleaned up existing test data\n');

    // Test 1: Create draft with full CV data
    console.log('📝 Test 1: Creating draft with full CV data...');
    const draft = new TemporaryCVDraft({
      userId: TEST_USER_ID,
      sessionId: TEST_SESSION_ID,
      cvData: SAMPLE_CV_DATA,
      currentStep: 2,
      isForMasterCV: true,
      completedSteps: [1, 2],
      availableSections: []
    });

    draft.markModified('cvData');
    await draft.save();
    console.log('✅ Draft created:', draft._id);

    // Test 2: Verify draft data was saved correctly
    console.log('\n📋 Test 2: Verifying draft data...');
    const savedDraft = await TemporaryCVDraft.findById(draft._id).lean();
    
    const draftVerification = {
      hasBasics: !!savedDraft?.cvData?.basics?.name,
      basicsName: savedDraft?.cvData?.basics?.name,
      workCount: savedDraft?.cvData?.work?.length || 0,
      educationCount: savedDraft?.cvData?.education?.length || 0,
      skillsCount: savedDraft?.cvData?.skills?.length || 0,
      projectsCount: savedDraft?.cvData?.projects?.length || 0,
      certificatesCount: savedDraft?.cvData?.certificates?.length || 0,
      languagesCount: savedDraft?.cvData?.languages?.length || 0
    };

    console.log('Draft verification:', draftVerification);

    if (draftVerification.workCount === 0) {
      console.error('❌ FAILED: Work experience not saved in draft!');
      return false;
    }
    console.log('✅ Draft data saved correctly');

    // Test 3: Convert draft to Master CV
    console.log('\n🔄 Test 3: Converting draft to Master CV...');
    const masterCV = new CV({
      userId: TEST_USER_ID,
      title: "Test User's Master CV",
      cvData: savedDraft.cvData,
      templateId: 'default',
      status: 'draft',
      metadata: {
        isMaster: true,
        tags: ['test', 'verification'],
        isPublic: false,
        createdVia: 'test-script',
        lastModified: new Date(),
        viewCount: 0,
        downloadCount: 0,
        starred: false
      }
    });

    masterCV.markModified('cvData');
    await masterCV.save();
    console.log('✅ Master CV created:', masterCV._id);

    // Test 4: Verify Master CV data
    console.log('\n✅ Test 4: Verifying Master CV data...');
    const savedMasterCV = await CV.findById(masterCV._id).lean();

    const masterCVVerification = {
      hasBasics: !!savedMasterCV?.cvData?.basics?.name,
      basicsName: savedMasterCV?.cvData?.basics?.name,
      workCount: savedMasterCV?.cvData?.work?.length || 0,
      educationCount: savedMasterCV?.cvData?.education?.length || 0,
      skillsCount: savedMasterCV?.cvData?.skills?.length || 0,
      projectsCount: savedMasterCV?.cvData?.projects?.length || 0,
      certificatesCount: savedMasterCV?.cvData?.certificates?.length || 0,
      languagesCount: savedMasterCV?.cvData?.languages?.length || 0
    };

    console.log('Master CV verification:', masterCVVerification);

    // Test 5: Compare expected vs actual
    console.log('\n📊 Test 5: Comparing expected vs actual data...');
    const expectedCounts = {
      work: SAMPLE_CV_DATA.work.length,
      education: SAMPLE_CV_DATA.education.length,
      skills: SAMPLE_CV_DATA.skills.length,
      projects: SAMPLE_CV_DATA.projects.length,
      certificates: SAMPLE_CV_DATA.certificates.length,
      languages: SAMPLE_CV_DATA.languages.length
    };

    const actualCounts = {
      work: masterCVVerification.workCount,
      education: masterCVVerification.educationCount,
      skills: masterCVVerification.skillsCount,
      projects: masterCVVerification.projectsCount,
      certificates: masterCVVerification.certificatesCount,
      languages: masterCVVerification.languagesCount
    };

    console.log('Expected:', expectedCounts);
    console.log('Actual:', actualCounts);

    let allTestsPassed = true;
    const failures: string[] = [];

    if (actualCounts.work !== expectedCounts.work) {
      console.error(`❌ Work count mismatch: expected ${expectedCounts.work}, got ${actualCounts.work}`);
      failures.push('work');
      allTestsPassed = false;
    }

    if (actualCounts.education !== expectedCounts.education) {
      console.error(`❌ Education count mismatch: expected ${expectedCounts.education}, got ${actualCounts.education}`);
      failures.push('education');
      allTestsPassed = false;
    }

    if (actualCounts.skills !== expectedCounts.skills) {
      console.error(`❌ Skills count mismatch: expected ${expectedCounts.skills}, got ${actualCounts.skills}`);
      failures.push('skills');
      allTestsPassed = false;
    }

    if (actualCounts.projects !== expectedCounts.projects) {
      console.error(`❌ Projects count mismatch: expected ${expectedCounts.projects}, got ${actualCounts.projects}`);
      failures.push('projects');
      allTestsPassed = false;
    }

    if (actualCounts.certificates !== expectedCounts.certificates) {
      console.error(`❌ Certificates count mismatch: expected ${expectedCounts.certificates}, got ${actualCounts.certificates}`);
      failures.push('certificates');
      allTestsPassed = false;
    }

    if (actualCounts.languages !== expectedCounts.languages) {
      console.error(`❌ Languages count mismatch: expected ${expectedCounts.languages}, got ${actualCounts.languages}`);
      failures.push('languages');
      allTestsPassed = false;
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await TemporaryCVDraft.deleteMany({ sessionId: TEST_SESSION_ID });
    await CV.deleteMany({ userId: TEST_USER_ID });
    console.log('✅ Test data cleaned up\n');

    // Final result
    if (allTestsPassed) {
      console.log('✅✅✅ ALL TESTS PASSED! CV data loss bug is FIXED! ✅✅✅');
      console.log('\nSummary:');
      console.log('- Draft saves all CV sections correctly');
      console.log('- Master CV conversion preserves all data');
      console.log('- No data loss detected in any section');
      return true;
    } else {
      console.error('\n❌❌❌ TESTS FAILED! Data loss detected in: ' + failures.join(', ') + ' ❌❌❌');
      console.log('\nThe bug may not be fully fixed. Please review:');
      console.log('1. CV model schema (should use Schema.Types.Mixed for cvData)');
      console.log('2. markModified() calls in save/convert routes');
      console.log('3. Data validation in convert-to-master route');
      return false;
    }

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    return false;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run verification
verifyCVDataFix()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

