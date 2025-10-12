#!/usr/bin/env node

/**
 * Create The Executive Accent Template
 * 
 * This template features:
 * - Header with personal info on left and round profile image on right
 * - Centered section headers with light blue background strips
 * - Professional, executive-friendly layout
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

async function createExecutiveAccentTemplate() {
  console.log('\n🎨 Creating The Executive Accent Template...');
  
  const db = mongoose.connection.db;
  const templatesCollection = db.collection('templates');
  
  const executiveAccentTemplate = {
    name: "The Executive Accent",
    description: "Sophisticated executive template with personal info on the left and profile image on the right. Features centered section headers with light blue accent strips.",
    thumbnail: "/templates/executive-accent-thumb.png",
    category: "cv",
    categories: ["Executive", "Professional"],
    tier: "premium",
    layoutType: "one-column",
    globalStyles: {
      fontFamily: "Calibri, Arial, sans-serif",
      primaryColor: "#1e3a8a", // Dark blue
      secondaryColor: "#334155", // Slate gray
      backgroundColor: "#ffffff",
      fontSize: "11pt",
      lineHeight: "1.5",
      spacing: "20px",
      customCSS: `
        .cv-container { 
          max-width: 8.5in; 
          margin: 0 auto; 
          background: white; 
          min-height: 11in; 
          padding: 0.6in 0.6in; 
        }
        
        /* Header Layout with Image on Right */
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          gap: 30px;
        }
        
        .header-content {
          flex: 1;
        }
        
        .header-image {
          flex-shrink: 0;
          width: 120px;
          height: 120px;
        }
        
        .profile-image {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e0f2fe;
        }
        
        /* Personal Information */
        .person-name { 
          font-size: 24pt; 
          font-weight: 700; 
          color: #1e3a8a; 
          margin: 0 0 6px 0; 
          line-height: 1.2; 
        }
        
        .person-title { 
          font-size: 14pt; 
          font-weight: 600; 
          color: #334155; 
          margin: 0 0 12px 0; 
        }
        
        .contact-info { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
          font-size: 10pt; 
          color: #334155; 
          margin-top: 12px;
        }
        
        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .contact-icon {
          width: 14px;
          height: 14px;
          color: #1e3a8a;
        }
        
        /* Section Headers - Centered with Light Blue Background */
        .section-header { 
          font-size: 13pt; 
          font-weight: 700; 
          text-transform: uppercase; 
          color: #1e3a8a; 
          text-align: center; 
          background-color: #e0f2fe;
          padding: 10px 20px; 
          margin: 24px 0 16px 0;
          width: 100%;
          letter-spacing: 0.5px;
        }
        
        /* Profile/Summary Section */
        .profile-summary { 
          margin-bottom: 20px; 
          line-height: 1.6; 
          text-align: justify; 
          color: #334155;
          font-size: 11pt;
        }
        
        /* Work Experience Items */
        .work-item, .education-item { 
          margin-bottom: 20px; 
          page-break-inside: avoid; 
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
        }
        
        .item-title { 
          font-weight: 700; 
          font-size: 12pt; 
          color: #1e3a8a; 
        }
        
        .item-date { 
          font-size: 10pt; 
          font-weight: 600; 
          color: #64748b; 
          white-space: nowrap; 
        }
        
        .item-subtitle { 
          font-size: 11pt; 
          font-weight: 600; 
          color: #334155; 
          margin-bottom: 6px;
        }
        
        .item-description { 
          margin: 6px 0; 
          color: #334155; 
          line-height: 1.5;
        }
        
        /* Bullet Points */
        .highlight-list { 
          margin: 6px 0; 
          padding-left: 20px; 
          list-style-type: disc; 
        }
        
        .highlight-list li { 
          margin-bottom: 4px; 
          line-height: 1.5; 
          color: #334155; 
        }
        
        /* Skills Section */
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 10px;
        }
        
        .skill-item {
          padding: 8px 12px;
          background: #f8fafc;
          border-left: 3px solid #1e3a8a;
          font-size: 10pt;
          color: #334155;
        }
        
        .skill-name {
          font-weight: 600;
          color: #1e3a8a;
        }
        
        /* Education Section */
        .degree { 
          font-weight: 700; 
          color: #1e3a8a; 
          font-size: 11pt;
        }
        
        .institution { 
          font-weight: 600; 
          color: #334155; 
          font-size: 11pt;
        }
        
        /* Projects Section */
        .project-item {
          margin-bottom: 18px;
          page-break-inside: avoid;
        }
        
        .project-title {
          font-weight: 700;
          color: #1e3a8a;
          font-size: 11pt;
          margin-bottom: 4px;
        }
        
        /* Awards & Certifications */
        .award-item {
          margin-bottom: 12px;
        }
        
        .award-title {
          font-weight: 600;
          color: #1e3a8a;
        }
        
        .award-issuer {
          color: #64748b;
          font-size: 10pt;
        }
        
        /* Languages */
        .language-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 6px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .language-name {
          font-weight: 600;
          color: #334155;
        }
        
        .language-level {
          color: #64748b;
          font-size: 10pt;
        }
      `
    },
    columnLayout: {
      main: {
        width: "100%",
        sections: [
          "personal_header",
          "profile",
          "work_experience",
          "education",
          "skills",
          "projects",
          "awards",
          "languages"
        ]
      }
    },
    sectionStyling: {
      personal_header: {
        name: { 
          "font-size": "24pt", 
          "font-weight": "700", 
          "color": "#1e3a8a" 
        },
        label: { 
          "font-size": "14pt", 
          "font-weight": "600", 
          "color": "#334155" 
        },
        contactInfo: { 
          "font-size": "10pt", 
          "color": "#334155" 
        }
      },
      profile: {
        "text-align": "justify",
        "line-height": "1.6",
        "color": "#334155"
      },
      work_experience: {
        jobTitle: { 
          "font-weight": "700", 
          "color": "#1e3a8a",
          "font-size": "12pt"
        },
        company: { 
          "font-weight": "600", 
          "color": "#334155" 
        },
        date: { 
          "font-weight": "600", 
          "color": "#64748b",
          "text-align": "right"
        }
      },
      education: {
        degree: { 
          "font-weight": "700", 
          "color": "#1e3a8a" 
        },
        institution: { 
          "font-weight": "600", 
          "color": "#334155" 
        },
        date: { 
          "color": "#64748b",
          "text-align": "right"
        }
      },
      skills: {
        skillName: {
          "font-weight": "600",
          "color": "#1e3a8a"
        }
      }
    },
    availableSections: [
      {
        key: "personal_header",
        displayName: "Personal Information",
        componentName: "PersonalHeaderSection",
        isList: false,
        defaultItemContent: { 
          name: "", 
          label: "", 
          email: "", 
          phone: "", 
          linkedin: "",
          location: "",
          image: ""
        }
      },
      {
        key: "profile",
        displayName: "Profile",
        componentName: "ProfileSection",
        isList: false,
        defaultItemContent: { 
          summary: "" 
        }
      },
      {
        key: "work_experience",
        displayName: "Professional Experience",
        componentName: "WorkExperienceSection",
        isList: true,
        defaultItemContent: { 
          name: "", 
          position: "", 
          startDate: "", 
          endDate: "", 
          summary: "", 
          highlights: [] 
        }
      },
      {
        key: "education",
        displayName: "Education",
        componentName: "EducationSection",
        isList: true,
        defaultItemContent: { 
          institution: "", 
          degree: "", 
          area: "", 
          startDate: "", 
          endDate: "",
          score: "" 
        }
      },
      {
        key: "skills",
        displayName: "Skills",
        componentName: "SkillsSection",
        isList: true,
        defaultItemContent: { 
          name: "", 
          level: "", 
          keywords: [] 
        }
      },
      {
        key: "projects",
        displayName: "Projects",
        componentName: "ProjectsSection",
        isList: true,
        defaultItemContent: { 
          name: "", 
          description: "", 
          highlights: [], 
          url: "" 
        }
      },
      {
        key: "awards",
        displayName: "Awards & Certifications",
        componentName: "AwardsSection",
        isList: true,
        defaultItemContent: { 
          title: "", 
          date: "", 
          awarder: "",
          summary: "" 
        }
      },
      {
        key: "languages",
        displayName: "Languages",
        componentName: "LanguagesSection",
        isList: true,
        defaultItemContent: { 
          language: "", 
          fluency: "" 
        }
      }
    ],
    pageSettings: {
      format: "A4",
      orientation: "portrait",
      margins: { 
        top: "0.6in", 
        bottom: "0.6in", 
        left: "0.6in", 
        right: "0.6in" 
      },
      maxHeight: "10.4in"
    },
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    // Insert or update The Executive Accent template
    const result = await templatesCollection.replaceOne(
      { name: "The Executive Accent" },
      executiveAccentTemplate,
      { upsert: true }
    );
    
    console.log(result.upsertedCount > 0 ? 
      '✅ The Executive Accent template created' : 
      '✅ The Executive Accent template updated'
    );
    
    console.log('\n🎉 Template creation completed successfully!');
    console.log('\n📋 Template Details:');
    console.log('   Name: The Executive Accent');
    console.log('   Tier: Premium');
    console.log('   Layout: One-column with header image');
    console.log('   Accent Color: Light Blue (#e0f2fe)');
    console.log('   Primary Color: Dark Blue (#1e3a8a)');
    console.log('\n✨ Key Features:');
    console.log('   - Personal info on left with round profile image on right');
    console.log('   - Centered section headers with light blue background strips');
    console.log('   - Professional typography and spacing');
    console.log('   - Executive-friendly design');
    
  } catch (error) {
    console.error('❌ Error creating template:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting The Executive Accent Template Creation\n');
  
  try {
    await connectDB();
    await createExecutiveAccentTemplate();
    
  } catch (error) {
    console.error('\n💥 Template creation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📔 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, createExecutiveAccentTemplate };

