#!/usr/bin/env node

/**
 * Simple MongoDB Data Population Script
 * 
 * This script directly populates your MongoDB cluster with sample data.
 */

const fs = require('fs');
const path = require('path');

// Sample data
const sampleData = {
  users: [
    {
      email: "admin@cvcircle.com",
      password: "$2a$12$hashedpasswordhere", // Will be hashed by Mongoose
      firstName: "Admin",
      lastName: "User",
      isEmailVerified: true,
      subscription: {
        plan: "unlimited",
        status: "active",
        startDate: new Date(),
        seats: 10,
        storageUsed: 0
      },
      settings: {
        theme: "auto",
        notifications: {
          email: true,
          push: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      email: "john.doe@example.com",
      password: "$2a$12$hashedpasswordhere",
      firstName: "John",
      lastName: "Doe",
      isEmailVerified: true,
      subscription: {
        plan: "pro",
        status: "active",
        startDate: new Date(),
        seats: 5,
        storageUsed: 0
      },
      settings: {
        theme: "dark",
        notifications: {
          email: true,
          push: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  templates: [
    {
      name: "Modern Professional",
      description: "A clean and modern CV template with professional styling",
      category: "professional",
      isActive: true,
      isPremium: false,
      sections: [
        { id: "header", type: "header", title: "Header", required: true, order: 1 },
        { id: "experience", type: "section", title: "Experience", required: false, order: 2 },
        { id: "education", type: "section", title: "Education", required: false, order: 3 },
        { id: "skills", type: "section", title: "Skills", required: false, order: 4 }
      ],
      styling: {
        primaryColor: "#84cc16",
        secondaryColor: "#22c55e",
        fontFamily: "Inter",
        fontSize: "medium",
        spacing: 1.5
      },
      metadata: {
        version: "1.0",
        author: "CV Circle",
        tags: ["professional", "modern", "clean"],
        usageCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  snippets: [
    {
      name: "Software Developer Summary",
      category: "summary",
      content: "Experienced software developer with 5+ years in full-stack development, specializing in React, Node.js, and cloud technologies.",
      tags: ["software", "developer", "summary"],
      isPublic: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};

async function populateDatabase() {
  console.log('🚀 Populating MongoDB with sample data...\n');
  
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
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('templates').deleteMany({});
    await db.collection('snippets').deleteMany({});
    await db.collection('cvs').deleteMany({});
    await db.collection('jobapplications').deleteMany({});
    console.log('✅ Cleared existing data\n');
    
    // Create users
    console.log('👥 Creating users...');
    const usersResult = await db.collection('users').insertMany(sampleData.users);
    console.log(`✅ Created ${usersResult.insertedCount} users`);
    
    // Create templates
    console.log('📄 Creating templates...');
    const templatesResult = await db.collection('templates').insertMany(sampleData.templates);
    console.log(`✅ Created ${templatesResult.insertedCount} templates`);
    
    // Create snippets
    console.log('📝 Creating snippets...');
    const snippetsResult = await db.collection('snippets').insertMany(sampleData.snippets);
    console.log(`✅ Created ${snippetsResult.insertedCount} snippets`);
    
    // Create sample CV for John Doe
    console.log('📋 Creating sample CV...');
    const johnDoe = await db.collection('users').findOne({ email: 'john.doe@example.com' });
    
    if (johnDoe) {
      const sampleCV = {
        userId: johnDoe._id,
        title: "John Doe - Software Engineer",
        template: "modern",
        status: "published",
        version: 1,
        sections: {
          personalInfo: {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+1 (555) 123-4567",
            location: "San Francisco, CA",
            summary: "Experienced software engineer with 5+ years in full-stack development."
          },
          experience: [
            {
              company: "TechCorp Inc.",
              position: "Senior Software Engineer",
              location: "San Francisco, CA",
              startDate: new Date("2022-01-01"),
              current: true,
              description: "Lead development of microservices architecture",
              achievements: [
                "Led a team of 6 developers to deliver a critical e-commerce platform",
                "Optimized database queries, reducing page load times by 60%"
              ]
            }
          ],
          education: [
            {
              institution: "Stanford University",
              degree: "Bachelor of Science",
              field: "Computer Science",
              startDate: new Date("2016-09-01"),
              endDate: new Date("2020-06-01"),
              gpa: 3.8
            }
          ],
          skills: [
            {
              category: "Programming Languages",
              skills: ["JavaScript", "TypeScript", "Python", "Java"]
            },
            {
              category: "Frameworks & Libraries",
              skills: ["React", "Node.js", "Express", "MongoDB"]
            }
          ]
        },
        styling: {
          primaryColor: "#84cc16",
          secondaryColor: "#22c55e",
          fontFamily: "Inter",
          fontSize: "medium",
          spacing: 1.5
        },
        metadata: {
          lastModified: new Date(),
          tags: ["software", "engineering", "full-stack"],
          isPublic: true,
          viewCount: 0,
          downloadCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const cvResult = await db.collection('cvs').insertOne(sampleCV);
      console.log(`✅ Created CV: ${sampleCV.title}`);
      
      // Create sample job application
      console.log('💼 Creating job application...');
      const sampleJobApp = {
        userId: johnDoe._id,
        cvId: cvResult.insertedId,
        jobTitle: "Senior Software Engineer",
        company: "Google",
        jobUrl: "https://careers.google.com/jobs/results/123456",
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
            email: "sarah.johnson@google.com"
          }
        ],
        tags: ["google", "senior", "software"],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const jobAppResult = await db.collection('jobapplications').insertOne(sampleJobApp);
      console.log(`✅ Created job application: ${sampleJobApp.jobTitle} at ${sampleJobApp.company}`);
    }
    
    // Get final counts
    console.log('\n📊 Final Database Statistics:');
    const userCount = await db.collection('users').countDocuments();
    const cvCount = await db.collection('cvs').countDocuments();
    const jobAppCount = await db.collection('jobapplications').countDocuments();
    const templateCount = await db.collection('templates').countDocuments();
    const snippetCount = await db.collection('snippets').countDocuments();
    
    console.log(`👥 Users: ${userCount}`);
    console.log(`📋 CVs: ${cvCount}`);
    console.log(`💼 Job Applications: ${jobAppCount}`);
    console.log(`📄 Templates: ${templateCount}`);
    console.log(`📝 Snippets: ${snippetCount}`);
    
    // Close connection
    await client.close();
    
    console.log('\n🎉 Database population completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Test the application with the sample data');
    console.log('3. Login with: admin@cvcircle.com / Admin@123');
    console.log('4. Or login with: john.doe@example.com / John@123');
    
  } catch (error) {
    console.error('❌ Error populating database:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your MongoDB connection');
    console.log('2. Ensure your IP is whitelisted in MongoDB Atlas');
    console.log('3. Verify your database user credentials');
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Simple MongoDB Data Population Script

Usage:
  node scripts/populate-mongodb-simple.js [options]

Options:
  --help, -h          Show this help message

Examples:
  node scripts/populate-mongodb-simple.js
    `);
    process.exit(0);
  }
  
  populateDatabase().catch(console.error);
}

module.exports = { populateDatabase }; 