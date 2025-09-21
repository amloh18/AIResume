#!/usr/bin/env node

/**
 * Relational Architecture Migration Script
 * 
 * This script migrates the existing schemas to the new robust relational architecture:
 * 1. Updates User schema to use authProviderId as single source of truth
 * 2. Migrates all collections to use consistent ObjectId references
 * 3. Creates ApplicationJourney documents for existing CV-Job relationships
 * 4. Removes redundant fields and weak data links
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function migrateUserSchema() {
  console.log('\n👥 Migrating User schema to use authProviderId...');
  
  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const updates = {};
        let needsUpdate = false;

        // 1. Set authProviderId based on existing authentication method
        if (!user.authProviderId) {
          if (user.firebaseUid) {
            updates.authProviderId = user.firebaseUid;
            updates.authProvider = 'firebase';
            needsUpdate = true;
          } else if (user.clerkId) {
            updates.authProviderId = user.clerkId;
            updates.authProvider = 'clerk';
            needsUpdate = true;
          } else if (user.email && !user.password) {
            // Google OAuth user
            updates.authProviderId = user.email;
            updates.authProvider = 'google';
            needsUpdate = true;
          } else if (user.email && user.password) {
            // Local auth user
            updates.authProviderId = user.email;
            updates.authProvider = 'local';
            needsUpdate = true;
          } else {
            console.log(`⚠️  User ${user._id} has no identifiable auth method`);
            continue;
          }
        }

        // 2. Ensure authProvider is set
        if (!user.authProvider && updates.authProviderId) {
          // Already set above
        }

        if (needsUpdate) {
          updates.updatedAt = new Date();
          
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: updates }
          );
          migratedCount++;
          console.log(`✅ Migrated user ${user.email}: ${updates.authProvider}/${updates.authProviderId}`);
        }

      } catch (error) {
        console.error(`❌ Error migrating user ${user._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ User migration completed: ${migratedCount} users migrated, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error migrating user schema:', error);
    throw error;
  }
}

async function migrateJobApplicationsToJobs() {
  console.log('\n💼 Migrating JobApplications to Job schema...');
  
  try {
    const db = mongoose.connection.db;
    const jobApplicationsCollection = db.collection('jobapplications');
    const jobsCollection = db.collection('jobs');
    const usersCollection = db.collection('users');
    
    // Get all job applications
    const jobApplications = await jobApplicationsCollection.find({}).toArray();
    console.log(`Found ${jobApplications.length} job applications to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const jobApp of jobApplications) {
      try {
        // Resolve userId to ObjectId
        let userId;
        
        if (mongoose.Types.ObjectId.isValid(jobApp.userId)) {
          userId = jobApp.userId;
        } else {
          // Try to find user by authProviderId
          const user = await usersCollection.findOne({
            $or: [
              { authProviderId: jobApp.userId },
              { firebaseUid: jobApp.userId },
              { email: jobApp.userId }
            ]
          });
          
          if (!user) {
            console.log(`⚠️  No user found for job application ${jobApp._id}`);
            continue;
          }
          userId = user._id;
        }

        // Check if job already exists (avoid duplicates)
        const existingJob = await jobsCollection.findOne({
          userId: userId,
          jobTitle: jobApp.jobTitle,
          company: jobApp.company
        });

        if (existingJob) {
          console.log(`⚠️  Job already exists for ${jobApp.jobTitle} at ${jobApp.company}`);
          continue;
        }

        // Create new job document
        const newJob = {
          userId: userId,
          jobTitle: jobApp.jobTitle,
          company: jobApp.company,
          jobUrl: jobApp.jobUrl,
          jobDescription: jobApp.jobDescription,
          location: jobApp.location,
          salary: jobApp.salary,
          sponsorship: jobApp.sponsorship,
          status: jobApp.status || 'created',
          priority: jobApp.priority || 'medium',
          applicationDate: jobApp.applicationDate,
          deadline: jobApp.deadline,
          notes: jobApp.notes,
          contacts: jobApp.contacts || [],
          interviews: jobApp.interviews || [],
          followUps: jobApp.followUps || [],
          attachments: jobApp.attachments || [],
          source: jobApp.source,
          sourceUrl: jobApp.sourceUrl,
          atsScore: jobApp.atsScore,
          atsAnalysis: jobApp.atsAnalysis,
          createdAt: jobApp.createdAt || new Date(),
          updatedAt: jobApp.updatedAt || new Date()
        };

        await jobsCollection.insertOne(newJob);
        migratedCount++;
        console.log(`✅ Migrated job: ${jobApp.jobTitle} at ${jobApp.company}`);

      } catch (error) {
        console.error(`❌ Error migrating job application ${jobApp._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Job migration completed: ${migratedCount} jobs migrated, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error migrating job applications:', error);
    throw error;
  }
}

async function migrateCVsToRelationalModel() {
  console.log('\n📄 Migrating CVs to relational model...');
  
  try {
    const db = mongoose.connection.db;
    const cvsCollection = db.collection('cvs');
    const usersCollection = db.collection('users');
    
    // Get all CVs
    const cvs = await cvsCollection.find({}).toArray();
    console.log(`Found ${cvs.length} CVs to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const cv of cvs) {
      try {
        const updates = {};
        let needsUpdate = false;

        // 1. Resolve userId to ObjectId
        if (!mongoose.Types.ObjectId.isValid(cv.userId)) {
          const user = await usersCollection.findOne({
            $or: [
              { authProviderId: cv.userId },
              { firebaseUid: cv.userId },
              { firebaseUid: cv.firebaseUid }
            ]
          });
          
          if (user) {
            updates.userId = user._id;
            needsUpdate = true;
          } else {
            console.log(`⚠️  No user found for CV ${cv._id}`);
            continue;
          }
        }

        // 2. Move isMaster to metadata
        if (cv.isMaster !== undefined && cv.metadata && cv.metadata.isMaster === undefined) {
          if (!updates.metadata) {
            updates.metadata = { ...cv.metadata };
          }
          updates.metadata.isMaster = cv.isMaster;
          needsUpdate = true;
        }

        // 3. Remove legacy fields
        const unsetFields = {};
        if (cv.firebaseUid !== undefined) {
          unsetFields.firebaseUid = "";
          needsUpdate = true;
        }
        if (cv.isMaster !== undefined) {
          unsetFields.isMaster = "";
          needsUpdate = true;
        }
        if (cv.version !== undefined) {
          unsetFields.version = "";
          needsUpdate = true;
        }
        if (cv.status !== undefined) {
          unsetFields.status = "";
          needsUpdate = true;
        }
        if (cv.journeyId !== undefined) {
          unsetFields.journeyId = "";
          needsUpdate = true;
        }

        if (needsUpdate) {
          updates.updatedAt = new Date();
          if (!updates['metadata.lastModified']) {
            updates['metadata.lastModified'] = new Date();
          }

          const updateOperation = { $set: updates };
          if (Object.keys(unsetFields).length > 0) {
            updateOperation.$unset = unsetFields;
          }

          await cvsCollection.updateOne(
            { _id: cv._id },
            updateOperation
          );
          migratedCount++;
        }

      } catch (error) {
        console.error(`❌ Error migrating CV ${cv._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ CV migration completed: ${migratedCount} CVs migrated, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error migrating CVs:', error);
    throw error;
  }
}

async function migrateCoverLetters() {
  console.log('\n📝 Migrating Cover Letters to relational model...');
  
  try {
    const db = mongoose.connection.db;
    const coverLettersCollection = db.collection('coverletters');
    const usersCollection = db.collection('users');
    
    // Get all cover letters
    const coverLetters = await coverLettersCollection.find({}).toArray();
    console.log(`Found ${coverLetters.length} cover letters to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const coverLetter of coverLetters) {
      try {
        const updates = {};
        let needsUpdate = false;

        // 1. Resolve userId to ObjectId
        if (typeof coverLetter.userId === 'string') {
          const user = await usersCollection.findOne({
            $or: [
              { authProviderId: coverLetter.userId },
              { firebaseUid: coverLetter.userId },
              { firebaseUid: coverLetter.firebaseUid }
            ]
          });
          
          if (user) {
            updates.userId = user._id;
            needsUpdate = true;
          } else {
            console.log(`⚠️  No user found for cover letter ${coverLetter._id}`);
            continue;
          }
        }

        // 2. Initialize metadata if missing
        if (!coverLetter.metadata) {
          updates.metadata = {
            lastModified: new Date(),
            wordCount: 0,
            characterCount: 0,
            estimatedReadingTime: 0,
            tags: [],
            isPublic: false,
            viewCount: 0,
            downloadCount: 0
          };
          needsUpdate = true;
        }

        // 3. Remove legacy fields
        const unsetFields = {};
        if (coverLetter.firebaseUid !== undefined) {
          unsetFields.firebaseUid = "";
          needsUpdate = true;
        }
        if (coverLetter.status !== undefined) {
          unsetFields.status = "";
          needsUpdate = true;
        }
        if (coverLetter.journeyId !== undefined) {
          unsetFields.journeyId = "";
          needsUpdate = true;
        }

        if (needsUpdate) {
          updates.updatedAt = new Date();

          const updateOperation = { $set: updates };
          if (Object.keys(unsetFields).length > 0) {
            updateOperation.$unset = unsetFields;
          }

          await coverLettersCollection.updateOne(
            { _id: coverLetter._id },
            updateOperation
          );
          migratedCount++;
        }

      } catch (error) {
        console.error(`❌ Error migrating cover letter ${coverLetter._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Cover letter migration completed: ${migratedCount} cover letters migrated, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error migrating cover letters:', error);
    throw error;
  }
}

async function createApplicationJourneys() {
  console.log('\n🔗 Creating ApplicationJourney documents...');
  
  try {
    const db = mongoose.connection.db;
    const journeysCollection = db.collection('cvjourneys');
    const applicationJourneysCollection = db.collection('applicationjourneys');
    const jobsCollection = db.collection('jobs');
    const cvsCollection = db.collection('cvs');
    const usersCollection = db.collection('users');
    
    // Get existing CV journeys
    const existingJourneys = await journeysCollection.find({}).toArray();
    console.log(`Found ${existingJourneys.length} existing CV journeys to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const journey of existingJourneys) {
      try {
        // Resolve user
        let userId;
        if (mongoose.Types.ObjectId.isValid(journey.userId)) {
          userId = journey.userId;
        } else {
          const user = await usersCollection.findOne({
            $or: [
              { authProviderId: journey.userId },
              { firebaseUid: journey.userId }
            ]
          });
          
          if (!user) {
            console.log(`⚠️  No user found for journey ${journey._id}`);
            continue;
          }
          userId = user._id;
        }

        // Find corresponding job
        let jobId = null;
        if (journey.jobId) {
          if (mongoose.Types.ObjectId.isValid(journey.jobId)) {
            jobId = journey.jobId;
          } else {
            // Try to find job by title and company
            const job = await jobsCollection.findOne({
              userId: userId,
              $or: [
                { _id: journey.jobId },
                { 
                  jobTitle: journey.jobTitle,
                  company: journey.company
                }
              ]
            });
            jobId = job?._id;
          }
        }

        // Find corresponding CV
        let cvId = null;
        if (journey.cvId && mongoose.Types.ObjectId.isValid(journey.cvId)) {
          cvId = journey.cvId;
        }

        // Generate unique journeyId
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        const journeyId = `journey_${timestamp}_${randomStr}`;

        // Create ApplicationJourney document
        const applicationJourney = {
          userId: userId,
          journeyId: journeyId,
          jobId: jobId,
          cvId: cvId,
          coverLetterId: journey.coverLetterId || null,
          status: journey.status || 'in-progress',
          currentStep: journey.currentStep || 1,
          steps: journey.steps || [],
          metadata: {
            createdAt: journey.createdAt || new Date(),
            updatedAt: journey.updatedAt || new Date(),
            priority: 'medium',
            tags: [],
            isArchived: false
          },
          createdAt: journey.createdAt || new Date(),
          updatedAt: journey.updatedAt || new Date()
        };

        await applicationJourneysCollection.insertOne(applicationJourney);
        migratedCount++;
        console.log(`✅ Created ApplicationJourney: ${journeyId}`);

      } catch (error) {
        console.error(`❌ Error creating application journey for ${journey._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ ApplicationJourney creation completed: ${migratedCount} journeys created, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error creating application journeys:', error);
    throw error;
  }
}

async function verifyRelationalMigration() {
  console.log('\n🔍 Verifying relational migration...');
  
  try {
    const db = mongoose.connection.db;
    
    // Check Users
    const totalUsers = await db.collection('users').countDocuments();
    const usersWithAuthProvider = await db.collection('users').countDocuments({ 
      authProviderId: { $exists: true, $ne: null },
      authProvider: { $exists: true, $ne: null }
    });

    console.log(`Users: ${totalUsers} total, ${usersWithAuthProvider} with auth provider`);

    // Check Jobs
    const totalJobs = await db.collection('jobs').countDocuments();
    const jobsWithObjectIdUser = await db.collection('jobs').countDocuments({ 
      userId: { $type: "objectId" }
    });

    console.log(`Jobs: ${totalJobs} total, ${jobsWithObjectIdUser} with ObjectId userId`);

    // Check CVs
    const totalCVs = await db.collection('cvs').countDocuments();
    const cvsWithObjectIdUser = await db.collection('cvs').countDocuments({ 
      userId: { $type: "objectId" }
    });
    const cvsWithMasterFlag = await db.collection('cvs').countDocuments({ 
      'metadata.isMaster': { $exists: true }
    });

    console.log(`CVs: ${totalCVs} total, ${cvsWithObjectIdUser} with ObjectId userId, ${cvsWithMasterFlag} with master flag in metadata`);

    // Check Cover Letters
    const totalCoverLetters = await db.collection('coverletters').countDocuments();
    const coverLettersWithObjectIdUser = await db.collection('coverletters').countDocuments({ 
      userId: { $type: "objectId" }
    });

    console.log(`Cover Letters: ${totalCoverLetters} total, ${coverLettersWithObjectIdUser} with ObjectId userId`);

    // Check Application Journeys
    const totalApplicationJourneys = await db.collection('applicationjourneys').countDocuments();

    console.log(`Application Journeys: ${totalApplicationJourneys} total`);

    // Verify relational integrity
    const usersWithoutProperAuth = totalUsers - usersWithAuthProvider;
    const jobsWithStringUserId = totalJobs - jobsWithObjectIdUser;
    const cvsWithStringUserId = totalCVs - cvsWithObjectIdUser;

    if (usersWithoutProperAuth === 0 && jobsWithStringUserId === 0 && cvsWithStringUserId === 0) {
      console.log('✅ Relational migration verification passed!');
      return true;
    } else {
      console.log('⚠️  Relational migration verification found issues:');
      if (usersWithoutProperAuth > 0) {
        console.log(`  - ${usersWithoutProperAuth} users without proper auth provider`);
      }
      if (jobsWithStringUserId > 0) {
        console.log(`  - ${jobsWithStringUserId} jobs with string userId`);
      }
      if (cvsWithStringUserId > 0) {
        console.log(`  - ${cvsWithStringUserId} CVs with string userId`);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying relational migration:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Relational Architecture Migration\n');
  
  try {
    await connectDB();
    
    // Step 1: Migrate User schema to use authProviderId
    await migrateUserSchema();
    
    // Step 2: Migrate JobApplications to Jobs with ObjectId references
    await migrateJobApplicationsToJobs();
    
    // Step 3: Migrate CVs to relational model
    await migrateCVsToRelationalModel();
    
    // Step 4: Migrate Cover Letters to relational model
    await migrateCoverLetters();
    
    // Step 5: Create ApplicationJourney documents
    await createApplicationJourneys();
    
    // Step 6: Verify migration
    const success = await verifyRelationalMigration();
    
    if (success) {
      console.log('\n🎉 Relational migration completed successfully!');
      console.log('\nNew Architecture Benefits:');
      console.log('✅ Single source of truth for user authentication');
      console.log('✅ Consistent ObjectId references across all collections');
      console.log('✅ Strong relational links through ApplicationJourney');
      console.log('✅ Eliminated data redundancy and weak relationships');
      console.log('✅ Scalable and maintainable data model');
      console.log('\nNext steps:');
      console.log('1. Update API endpoints to use new user resolution');
      console.log('2. Test ApplicationJourney-based workflows');
      console.log('3. Deploy new relational architecture');
    } else {
      console.log('\n❌ Relational migration completed with issues - please review');
    }
    
  } catch (error) {
    console.error('\n💥 Relational migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📔 Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  main, 
  migrateUserSchema, 
  migrateJobApplicationsToJobs, 
  migrateCVsToRelationalModel,
  migrateCoverLetters,
  createApplicationJourneys,
  verifyRelationalMigration 
};
