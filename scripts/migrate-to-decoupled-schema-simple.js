#!/usr/bin/env node

/**
 * Simple Migration Script: Decouple CV Schema
 * 
 * This script migrates the existing CV schema to the new decoupled architecture.
 * It works directly with MongoDB without TypeScript models to avoid import issues.
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

async function createDefaultTemplate() {
  console.log('\n📝 Creating default template...');
  
  try {
    const db = mongoose.connection.db;
    const templatesCollection = db.collection('templates');
    
    // Check if default template already exists
    const existingTemplate = await templatesCollection.findOne({ 
      isDefault: true, 
      category: 'cv' 
    });
    
    if (existingTemplate) {
      console.log('✅ Default template already exists:', existingTemplate.name);
      return existingTemplate._id;
    }

    // Create default template
    const defaultTemplate = {
      name: 'Professional Modern',
      description: 'A clean, modern template perfect for professional applications',
      category: 'cv',
      tier: 'free',
      globalStyles: {
        fontFamily: 'Inter, system-ui, sans-serif',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        fontSize: '14px',
        lineHeight: '1.6',
        spacing: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      },
      availableSections: [
        {
          key: 'header',
          displayName: 'Personal Information',
          componentName: 'PersonalHeader',
          isList: false,
          defaultItemContent: {}
        },
        {
          key: 'work',
          displayName: 'Work Experience',
          componentName: 'WorkExperience',
          isList: true,
          defaultItemContent: {
            name: '',
            position: '',
            startDate: '',
            endDate: '',
            summary: '',
            highlights: []
          }
        },
        {
          key: 'education',
          displayName: 'Education',
          componentName: 'Education',
          isList: true,
          defaultItemContent: {
            institution: '',
            area: '',
            studyType: '',
            startDate: '',
            endDate: '',
            score: ''
          }
        },
        {
          key: 'skills',
          displayName: 'Skills',
          componentName: 'Skills',
          isList: true,
          defaultItemContent: {
            name: '',
            level: '',
            keywords: []
          }
        },
        {
          key: 'projects',
          displayName: 'Projects',
          componentName: 'Projects',
          isList: true,
          defaultItemContent: {
            name: '',
            description: '',
            url: '',
            highlights: []
          }
        }
      ],
      isActive: true,
      isDefault: true,
      isPublished: true,
      globalAccess: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await templatesCollection.insertOne(defaultTemplate);
    console.log('✅ Created default template:', defaultTemplate.name);
    return result.insertedId;
  } catch (error) {
    console.error('❌ Error creating default template:', error);
    throw error;
  }
}

async function validateUsers() {
  console.log('\n👥 Validating user data...');
  
  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find users with invalid firebaseUid (ObjectId format or missing)
    const invalidUsers = await usersCollection.find({
      $or: [
        { firebaseUid: { $exists: false } },
        { firebaseUid: null },
        { firebaseUid: { $regex: /^[0-9a-fA-F]{24}$/ } } // ObjectId pattern
      ]
    }).toArray();

    console.log(`Found ${invalidUsers.length} users with invalid/missing firebaseUid`);

    for (const user of invalidUsers) {
      // Generate a temporary Firebase UID for users without one
      if (!user.firebaseUid || user.firebaseUid.match(/^[0-9a-fA-F]{24}$/)) {
        const tempFirebaseUid = `temp_${user._id}_${Date.now()}`;
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              firebaseUid: tempFirebaseUid,
              updatedAt: new Date()
            } 
          }
        );
        console.log(`Updated user ${user.email} with temporary firebaseUid: ${tempFirebaseUid}`);
      }
    }

    console.log('✅ User validation completed');
  } catch (error) {
    console.error('❌ Error validating users:', error);
    throw error;
  }
}

async function migrateCVs(defaultTemplateId) {
  console.log('\n📄 Migrating CV documents...');
  
  try {
    const db = mongoose.connection.db;
    const cvsCollection = db.collection('cvs');
    const usersCollection = db.collection('users');
    
    // Get all CVs that need migration
    const cvs = await cvsCollection.find({}).toArray();
    console.log(`Found ${cvs.length} CVs to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const cv of cvs) {
      try {
        const updates = {};
        let needsUpdate = false;

        // 1. Ensure templateId is set
        if (!cv.templateId) {
          updates.templateId = defaultTemplateId;
          needsUpdate = true;
        }

        // 2. Ensure firebaseUid is set and valid
        if (!cv.firebaseUid) {
          // Try to get firebaseUid from user
          const user = await usersCollection.findOne({ _id: cv.userId });
          if (user && user.firebaseUid) {
            updates.firebaseUid = user.firebaseUid;
            needsUpdate = true;
          } else {
            console.log(`⚠️  CV ${cv._id} has no associated user firebaseUid`);
            continue;
          }
        }

        // 3. Ensure userId is ObjectId (convert string values)
        if (typeof cv.userId === 'string' && cv.userId.match(/^[0-9a-fA-F]{24}$/)) {
          updates.userId = new mongoose.Types.ObjectId(cv.userId);
          needsUpdate = true;
        }

        // 4. Clean journeyId if it's a string
        if (cv.journeyId && typeof cv.journeyId === 'string') {
          try {
            updates.journeyId = new mongoose.Types.ObjectId(cv.journeyId);
            needsUpdate = true;
          } catch {
            updates.journeyId = null;
            needsUpdate = true;
          }
        }

        // 5. Remove legacy fields and update timestamp
        const unsetFields = {};
        if (cv.template !== undefined) {
          unsetFields.template = "";
          needsUpdate = true;
        }
        if (cv.styling !== undefined) {
          unsetFields.styling = "";
          needsUpdate = true;
        }
        if (cv.templateData !== undefined) {
          unsetFields.templateData = "";
          needsUpdate = true;
        }
        if (cv.templateName !== undefined) {
          unsetFields.templateName = "";
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

    console.log(`✅ Migration completed: ${migratedCount} CVs migrated, ${errorCount} errors`);
  } catch (error) {
    console.error('❌ Error migrating CVs:', error);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    const db = mongoose.connection.db;
    
    // Check CVs
    const totalCVs = await db.collection('cvs').countDocuments();
    const cvsWithTemplate = await db.collection('cvs').countDocuments({ templateId: { $exists: true } });
    const cvsWithFirebaseUid = await db.collection('cvs').countDocuments({ firebaseUid: { $exists: true, $ne: null } });

    console.log(`Total CVs: ${totalCVs}`);
    console.log(`CVs with templateId: ${cvsWithTemplate}`);
    console.log(`CVs with firebaseUid: ${cvsWithFirebaseUid}`);

    // Check users
    const totalUsers = await db.collection('users').countDocuments();
    const usersWithFirebaseUid = await db.collection('users').countDocuments({ firebaseUid: { $exists: true, $ne: null } });

    console.log(`Total Users: ${totalUsers}`);
    console.log(`Users with firebaseUid: ${usersWithFirebaseUid}`);

    // Check templates
    const totalTemplates = await db.collection('templates').countDocuments();
    const defaultTemplates = await db.collection('templates').countDocuments({ isDefault: true });

    console.log(`Total Templates: ${totalTemplates}`);
    console.log(`Default Templates: ${defaultTemplates}`);

    if (cvsWithTemplate === totalCVs && cvsWithFirebaseUid === totalCVs && defaultTemplates > 0) {
      console.log('✅ Migration verification passed!');
      return true;
    } else {
      console.log('⚠️  Migration verification found issues');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting CV Schema Migration to Decoupled Architecture\n');
  
  try {
    await connectDB();
    
    // Step 1: Create default template
    const defaultTemplateId = await createDefaultTemplate();
    
    // Step 2: Validate and fix user data
    await validateUsers();
    
    // Step 3: Migrate CV documents
    await migrateCVs(defaultTemplateId);
    
    // Step 4: Verify migration
    const success = await verifyMigration();
    
    if (success) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Test API endpoints with new schema');
      console.log('2. Update frontend components to use templateId');
      console.log('3. Deploy changes to production');
    } else {
      console.log('\n❌ Migration completed with issues - please review');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
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

module.exports = { main, createDefaultTemplate, validateUsers, migrateCVs, verifyMigration };
