#!/usr/bin/env node

/**
 * MongoDB Data Population Script
 * 
 * This script populates your MongoDB cluster with sample data for CV Circle.
 */

const fs = require('fs');
const path = require('path');

// Sample data for CV Circle application
const sampleData = {
  users: [
    {
      email: "admin@cvcircle.com",
      password: "Admin@123",
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
      }
    },
    {
      email: "john.doe@example.com",
      password: "John@123",
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
      }
    },
    {
      email: "jane.smith@example.com",
      password: "Jane@123",
      firstName: "Jane",
      lastName: "Smith",
      isEmailVerified: true,
      subscription: {
        plan: "basic",
        status: "active",
        startDate: new Date(),
        seats: 3,
        storageUsed: 0
      },
      settings: {
        theme: "light",
        notifications: {
          email: true,
          push: true
        }
      }
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
        { id: "skills", type: "section", title: "Skills", required: false, order: 4 },
        { id: "projects", type: "section", title: "Projects", required: false, order: 5 }
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
      }
    },
    {
      name: "Creative Portfolio",
      description: "A creative template perfect for designers and artists",
      category: "creative",
      isActive: true,
      isPremium: true,
      sections: [
        { id: "header", type: "header", title: "Header", required: true, order: 1 },
        { id: "portfolio", type: "section", title: "Portfolio", required: false, order: 2 },
        { id: "experience", type: "section", title: "Experience", required: false, order: 3 },
        { id: "skills", type: "section", title: "Skills", required: false, order: 4 }
      ],
      styling: {
        primaryColor: "#8b5cf6",
        secondaryColor: "#a855f7",
        fontFamily: "Poppins",
        fontSize: "medium",
        spacing: 1.8
      },
      metadata: {
        version: "1.0",
        author: "CV Circle",
        tags: ["creative", "portfolio", "design"],
        usageCount: 0
      }
    },
    {
      name: "Minimal Clean",
      description: "A minimal and clean template for a professional look",
      category: "minimal",
      isActive: true,
      isPremium: false,
      sections: [
        { id: "header", type: "header", title: "Header", required: true, order: 1 },
        { id: "summary", type: "section", title: "Summary", required: false, order: 2 },
        { id: "experience", type: "section", title: "Experience", required: false, order: 3 },
        { id: "education", type: "section", title: "Education", required: false, order: 4 },
        { id: "skills", type: "section", title: "Skills", required: false, order: 5 }
      ],
      styling: {
        primaryColor: "#374151",
        secondaryColor: "#6b7280",
        fontFamily: "Inter",
        fontSize: "medium",
        spacing: 1.2
      },
      metadata: {
        version: "1.0",
        author: "CV Circle",
        tags: ["minimal", "clean", "professional"],
        usageCount: 0
      }
    }
  ],
  
  snippets: [
    {
      name: "Software Developer Summary",
      category: "summary",
      content: "Experienced software developer with 5+ years in full-stack development, specializing in React, Node.js, and cloud technologies. Passionate about creating scalable solutions and mentoring junior developers.",
      tags: ["software", "developer", "summary"],
      isPublic: true
    },
    {
      name: "Project Manager Summary",
      category: "summary",
      content: "Results-driven project manager with 8+ years of experience leading cross-functional teams and delivering complex projects on time and within budget. Expert in Agile methodologies and stakeholder management.",
      tags: ["project", "manager", "summary"],
      isPublic: true
    },
    {
      name: "Designer Summary",
      category: "summary",
      content: "Creative designer with 6+ years of experience in UI/UX design, branding, and digital marketing. Skilled in Figma, Adobe Creative Suite, and user-centered design principles.",
      tags: ["designer", "creative", "summary"],
      isPublic: true
    },
    {
      name: "Leadership Achievement",
      category: "achievement",
      content: "Led a team of 8 developers to deliver a critical e-commerce platform 2 weeks ahead of schedule, resulting in 25% increase in online sales within the first quarter.",
      tags: ["leadership", "achievement", "team"],
      isPublic: true
    },
    {
      name: "Technical Achievement",
      category: "achievement",
      content: "Optimized database queries and implemented caching strategies, reducing page load times by 60% and improving user experience scores by 40%.",
      tags: ["technical", "optimization", "performance"],
      isPublic: true
    }
  ]
};

// Sample CV data for John Doe
const johnDoeCV = {
  userId: null, // Will be set after user creation
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
      website: "https://johndoe.dev",
      linkedin: "https://linkedin.com/in/johndoe",
      github: "https://github.com/johndoe",
      summary: "Experienced software engineer with 5+ years in full-stack development, specializing in React, Node.js, and cloud technologies. Passionate about creating scalable solutions and mentoring junior developers."
    },
    experience: [
      {
        company: "TechCorp Inc.",
        position: "Senior Software Engineer",
        location: "San Francisco, CA",
        startDate: new Date("2022-01-01"),
        endDate: null,
        current: true,
        description: "Lead development of microservices architecture and mentor junior developers",
        achievements: [
          "Led a team of 6 developers to deliver a critical e-commerce platform",
          "Optimized database queries, reducing page load times by 60%",
          "Implemented CI/CD pipeline, reducing deployment time by 80%"
        ]
      },
      {
        company: "StartupXYZ",
        position: "Full Stack Developer",
        location: "San Francisco, CA",
        startDate: new Date("2020-03-01"),
        endDate: new Date("2021-12-31"),
        current: false,
        description: "Developed and maintained web applications using React and Node.js",
        achievements: [
          "Built responsive web applications serving 10,000+ users",
          "Reduced bug reports by 40% through improved testing practices",
          "Mentored 3 junior developers"
        ]
      }
    ],
    education: [
      {
        institution: "Stanford University",
        degree: "Bachelor of Science",
        field: "Computer Science",
        location: "Stanford, CA",
        startDate: new Date("2016-09-01"),
        endDate: new Date("2020-06-01"),
        current: false,
        gpa: 3.8,
        description: "Focused on software engineering and algorithms"
      }
    ],
    skills: [
      {
        category: "Programming Languages",
        skills: ["JavaScript", "TypeScript", "Python", "Java", "SQL"]
      },
      {
        category: "Frameworks & Libraries",
        skills: ["React", "Node.js", "Express", "MongoDB", "PostgreSQL"]
      },
      {
        category: "Tools & Technologies",
        skills: ["Git", "Docker", "AWS", "Jenkins", "Jest"]
      }
    ],
    projects: [
      {
        title: "E-commerce Platform",
        description: "Full-stack e-commerce platform with payment integration and admin dashboard",
        technologies: ["React", "Node.js", "MongoDB", "Stripe"],
        url: "https://github.com/johndoe/ecommerce",
        github: "https://github.com/johndoe/ecommerce",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-06-01"),
        current: false
      },
      {
        title: "Task Management App",
        description: "Real-time task management application with collaborative features",
        technologies: ["React", "Socket.io", "Express", "MongoDB"],
        url: "https://taskapp.johndoe.dev",
        github: "https://github.com/johndoe/taskapp",
        startDate: new Date("2022-08-01"),
        endDate: new Date("2022-12-01"),
        current: false
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
  }
};

// Sample job applications
const sampleJobApplications = [
  {
    userId: null, // Will be set after user creation
    cvId: null, // Will be set after CV creation
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
    tags: ["google", "senior", "software"]
  },
  {
    userId: null,
    cvId: null,
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
    tags: ["netflix", "full-stack", "streaming"]
  }
];

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
      }
    }
    
    // Import database and services
    const { connectDB } = require('../src/lib/database.ts');
    const { userService, cvService, jobApplicationService, templateService, snippetService } = require('../src/lib/services/index.ts');
    
    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Clear existing data (optional)
    console.log('🧹 Clearing existing data...');
    await userService.bulkUpdate({}, { deletedAt: new Date() });
    await cvService.bulkUpdate({}, { deletedAt: new Date() });
    await jobApplicationService.bulkUpdate({}, { deletedAt: new Date() });
    await templateService.bulkUpdate({}, { deletedAt: new Date() });
    await snippetService.bulkUpdate({}, { deletedAt: new Date() });
    console.log('✅ Cleared existing data\n');
    
    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of sampleData.users) {
      try {
        const user = await userService.create(userData);
        createdUsers.push(user);
        console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
      } catch (error) {
        console.log(`⚠️ User ${userData.email} might already exist`);
      }
    }
    console.log(`✅ Created ${createdUsers.length} users\n`);
    
    // Create templates
    console.log('📄 Creating templates...');
    const createdTemplates = [];
    for (const templateData of sampleData.templates) {
      try {
        const template = await templateService.create(templateData);
        createdTemplates.push(template);
        console.log(`✅ Created template: ${template.name}`);
      } catch (error) {
        console.log(`⚠️ Template ${templateData.name} might already exist`);
      }
    }
    console.log(`✅ Created ${createdTemplates.length} templates\n`);
    
    // Create snippets
    console.log('📝 Creating snippets...');
    const createdSnippets = [];
    for (const snippetData of sampleData.snippets) {
      try {
        const snippet = await snippetService.create(snippetData);
        createdSnippets.push(snippet);
        console.log(`✅ Created snippet: ${snippet.name}`);
      } catch (error) {
        console.log(`⚠️ Snippet ${snippetData.name} might already exist`);
      }
    }
    console.log(`✅ Created ${createdSnippets.length} snippets\n`);
    
    // Create CV for John Doe
    console.log('📋 Creating sample CV...');
    const johnDoe = createdUsers.find(user => user.email === 'john.doe@example.com');
    if (johnDoe) {
      const cvData = { ...johnDoeCV, userId: johnDoe._id };
      try {
        const cv = await cvService.create(cvData);
        console.log(`✅ Created CV: ${cv.title}`);
        
        // Create job applications for John Doe
        console.log('💼 Creating job applications...');
        for (const jobData of sampleJobApplications) {
          const jobApplicationData = { ...jobData, userId: johnDoe._id, cvId: cv._id };
          try {
            const jobApp = await jobApplicationService.create(jobApplicationData);
            console.log(`✅ Created job application: ${jobApp.jobTitle} at ${jobApp.company}`);
          } catch (error) {
            console.log(`⚠️ Job application might already exist`);
          }
        }
      } catch (error) {
        console.log(`⚠️ CV might already exist`);
      }
    }
    
    // Get final counts
    console.log('\n📊 Final Database Statistics:');
    const userCount = await userService.count();
    const cvCount = await cvService.count();
    const jobAppCount = await jobApplicationService.count();
    const templateCount = await templateService.count();
    const snippetCount = await snippetService.count();
    
    console.log(`👥 Users: ${userCount}`);
    console.log(`📋 CVs: ${cvCount}`);
    console.log(`💼 Job Applications: ${jobAppCount}`);
    console.log(`📄 Templates: ${templateCount}`);
    console.log(`📝 Snippets: ${snippetCount}`);
    
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
MongoDB Data Population Script

Usage:
  node scripts/populate-mongodb.js [options]

Options:
  --help, -h          Show this help message
  --clear-only        Only clear existing data
  --users-only        Only populate users
  --templates-only    Only populate templates

Examples:
  node scripts/populate-mongodb.js
  node scripts/populate-mongodb.js --users-only
    `);
    process.exit(0);
  }
  
  populateDatabase().catch(console.error);
}

module.exports = { populateDatabase, sampleData }; 