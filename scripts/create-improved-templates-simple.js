#!/usr/bin/env node

/**
 * Simple Template Creation Script
 * Creates improved template schemas directly via MongoDB operations
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

async function createTemplates() {
  console.log('\n🎨 Creating improved templates...');
  
  const db = mongoose.connection.db;
  const templatesCollection = db.collection('templates');
  
  // ATS Professional Template
  const atsTemplate = {
    name: "ATS Professional",
    description: "Clean, single-column design optimized for ATS scanning. High contrast, standard fonts, and clear section headers.",
    category: "cv",
    categories: ["Professional"],
    tier: "free",
    layoutType: "one-column",
    globalStyles: {
      fontFamily: "Calibri, Arial, sans-serif",
      primaryColor: "#000000", 
      secondaryColor: "#444444",
      backgroundColor: "#ffffff",
      fontSize: "12pt",
      lineHeight: "1.4",
      spacing: "20px",
      customCSS: ".cv-container { padding: 40px 60px; } .section-header { font-size: 16pt; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #000000; padding-bottom: 4px; }"
    },
    columnLayout: {
      main: {
        width: "100%",
        sections: [
          "personal_header",
          "education",
          "work_experience", 
          "skills_and_qualifications",
          "project_experience"
        ]
      }
    },
    sectionStyling: {
      personal_header: {
        "font-size": "20pt",
        "font-weight": "700",
        "text-transform": "uppercase",
        "text-align": "center",
        "margin-bottom": "10px"
      },
      education: {
        institution: { "font-weight": "700" },
        degree: { "font-style": "italic" },
        date: { "text-align": "right" }
      },
      work_experience: {
        name: { "font-weight": "700", "display": "inline-block" },
        position: { "font-weight": "400", "display": "inline-block", "margin-left": "8px" },
        date: { "text-align": "right" },
        highlights: { "list-style-type": "disc", "margin-left": "20px", "margin-top": "5px" }
      }
    },
    availableSections: [
      {
        key: "personal_header",
        displayName: "Personal Information",
        componentName: "PersonalHeaderSection",
        isList: false,
        defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" }
      },
      {
        key: "education",
        displayName: "Education",
        componentName: "EducationSection",
        isList: true,
        defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "", score: "" }
      },
      {
        key: "work_experience",
        displayName: "Work Experience", 
        componentName: "WorkExperienceSection",
        isList: true,
        defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] }
      },
      {
        key: "skills_and_qualifications",
        displayName: "Skills & Qualifications",
        componentName: "SkillsSection",
        isList: true,
        defaultItemContent: { name: "", level: "", keywords: [] }
      },
      {
        key: "project_experience",
        displayName: "Project Experience",
        componentName: "ProjectsSection",
        isList: true,
        defaultItemContent: { name: "", description: "", highlights: [], url: "" }
      }
    ],
    pageSettings: {
      format: "A4",
      orientation: "portrait", 
      margins: { top: "25mm", bottom: "25mm", left: "25mm", right: "25mm" },
      maxHeight: "270mm"
    },
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Modern UI/UX Template
  const modernTemplate = {
    name: "Modern UI/UX",
    description: "Two-column design with distinct sidebar. Clean, minimalist aesthetic perfect for creative professionals.",
    category: "cv",
    categories: ["Modern", "Creative"],
    tier: "free",
    layoutType: "two-column",
    globalStyles: {
      fontFamily: "Inter, sans-serif",
      primaryColor: "#5C2D91",
      secondaryColor: "#333333",
      backgroundColor: "#F5F5F5",
      fontSize: "10pt",
      lineHeight: "1.6",
      spacing: "20px",
      customCSS: ".cv-container { background: #EFEFEF; } .left-column { background: #FFFFFF; } .section-header { font-size: 14pt; font-weight: 600; text-transform: uppercase; color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 4px; }"
    },
    columnLayout: {
      leftColumn: {
        width: "30%",
        sections: ["personal_info", "contact_info", "profile", "most_proud_of", "languages"]
      },
      rightColumn: {
        width: "70%", 
        sections: ["professional_experience", "education", "tools", "awards", "skills", "favorite_books"]
      }
    },
    sectionStyling: {
      personal_info: {
        name: { "font-size": "30pt", "font-weight": "700", "color": "var(--primary-color)" },
        label: { "font-size": "16pt", "font-weight": "400", "color": "var(--secondary-color)" }
      },
      skills: {
        listItem: { "display": "flex", "justify-content": "space-between", "align-items": "center" },
        dots: { "color": "#999999" }
      },
      profile: { "font-style": "italic" }
    },
    availableSections: [
      {
        key: "personal_info",
        displayName: "Personal Info",
        componentName: "PersonalInfoSection",
        isList: false,
        defaultItemContent: { name: "", label: "" }
      },
      {
        key: "contact_info",
        displayName: "Contact Information",
        componentName: "ContactSection", 
        isList: false,
        defaultItemContent: { email: "", phone: "", location: "", website: "" }
      },
      {
        key: "profile",
        displayName: "Profile",
        componentName: "ProfileSection",
        isList: false,
        defaultItemContent: { summary: "" }
      },
      {
        key: "professional_experience",
        displayName: "Professional Experience",
        componentName: "WorkExperienceSection",
        isList: true,
        defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] }
      },
      {
        key: "education",
        displayName: "Education",
        componentName: "EducationSection",
        isList: true,
        defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" }
      },
      {
        key: "skills",
        displayName: "Skills",
        componentName: "SkillsSection",
        isList: true,
        defaultItemContent: { name: "", level: "" }
      }
    ],
    pageSettings: {
      format: "A4",
      orientation: "portrait",
      margins: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      maxHeight: "280mm"
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
    // Insert or update ATS Professional template
    const atsResult = await templatesCollection.replaceOne(
      { name: "ATS Professional" },
      atsTemplate,
      { upsert: true }
    );
    
    console.log(atsResult.upsertedCount > 0 ? 
      '✅ ATS Professional template created' : 
      '✅ ATS Professional template updated'
    );
    
    // Insert or update Modern UI/UX template
    const modernResult = await templatesCollection.replaceOne(
      { name: "Modern UI/UX" },
      modernTemplate,
      { upsert: true }
    );
    
    console.log(modernResult.upsertedCount > 0 ? 
      '✅ Modern UI/UX template created' : 
      '✅ Modern UI/UX template updated'
    );
    
    console.log('\n🎉 Template creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating templates:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Improved Template Creation\n');
  
  try {
    await connectDB();
    await createTemplates();
    
    console.log('\nTemplates created:');
    console.log('✅ ATS Professional (single-column, ATS-optimized)');
    console.log('✅ Modern UI/UX (two-column, creative design)');
    
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

module.exports = { main };
