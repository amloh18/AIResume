#!/usr/bin/env node

/**
 * Seed Improved Templates Script
 * 
 * Creates the new flexible template schemas with improved layout system:
 * 1. ATS Professional (single-column)
 * 2. Modern UI/UX (two-column)
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

async function createATSProfessionalTemplate() {
  console.log('\n📄 Creating ATS Professional Template...');
  
  // Dynamic import for ES modules
  const { Template } = await import('../src/models/index.ts');
  
  const atsTemplate = {
    name: "ATS Professional",
    description: "Clean, single-column design optimized for ATS scanning. High contrast, standard fonts, and clear section headers.",
    category: "cv",
    categories: ["Professional"],
    tier: "free",
    
    // Layout Configuration
    layoutType: "one-column",
    
    // Global styling
    globalStyles: {
      fontFamily: "Calibri, Arial, sans-serif",
      primaryColor: "#000000",
      secondaryColor: "#444444",
      backgroundColor: "#ffffff",
      fontSize: "12pt",
      lineHeight: "1.4",
      spacing: "20px",
      customCSS: `.cv-container { 
        padding: 40px 60px; 
      } 
      .section-header { 
        font-size: 16pt; 
        font-weight: 700; 
        text-transform: uppercase; 
        margin-bottom: 8px; 
        border-bottom: 1px solid #000000; 
        padding-bottom: 4px; 
      }`
    },
    
    // Column layout - single column
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
    
    // Section-specific styling
    sectionStyling: {
      personal_header: {
        "font-size": "20pt",
        "font-weight": "700",
        "text-transform": "uppercase",
        "text-align": "center",
        "margin-bottom": "10px"
      },
      education: {
        institution: {
          "font-weight": "700"
        },
        degree: {
          "font-style": "italic"
        },
        date: {
          "text-align": "right"
        }
      },
      work_experience: {
        name: {
          "font-weight": "700",
          "display": "inline-block"
        },
        position: {
          "font-weight": "400", 
          "display": "inline-block",
          "margin-left": "8px"
        },
        date: {
          "text-align": "right"
        },
        highlights: {
          "list-style-type": "disc",
          "margin-left": "20px",
          "margin-top": "5px"
        }
      },
      skills_and_qualifications: {
        heading: {
          "font-weight": "700",
          "text-transform": "uppercase"
        }
      },
      project_experience: {
        name: {
          "font-weight": "700"
        },
        description: {
          "margin-top": "5px"
        }
      }
    },
    
    // Available sections
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
          location: ""
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
        key: "work_experience",
        displayName: "Work Experience",
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
        key: "skills_and_qualifications",
        displayName: "Skills & Qualifications", 
        componentName: "SkillsSection",
        isList: true,
        defaultItemContent: {
          name: "",
          level: "",
          keywords: []
        }
      },
      {
        key: "project_experience",
        displayName: "Project Experience",
        componentName: "ProjectsSection",
        isList: true,
        defaultItemContent: {
          name: "",
          description: "",
          highlights: [],
          url: ""
        }
      }
    ],
    
    // Page settings
    pageSettings: {
      format: "A4",
      orientation: "portrait",
      margins: {
        top: "25mm",
        bottom: "25mm", 
        left: "25mm",
        right: "25mm"
      },
      maxHeight: "270mm"
    },
    
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1
  };
  
  try {
    const existingTemplate = await Template.findOne({ name: atsTemplate.name });
    if (existingTemplate) {
      console.log('⚠️ ATS Professional template already exists, updating...');
      await Template.findByIdAndUpdate(existingTemplate._id, atsTemplate);
    } else {
      await Template.create(atsTemplate);
      console.log('✅ ATS Professional template created successfully');
    }
  } catch (error) {
    console.error('❌ Error creating ATS Professional template:', error);
  }
}

async function createModernUIUXTemplate() {
  console.log('\n🎨 Creating Modern UI/UX Template...');
  
  // Dynamic import for ES modules
  const { Template } = await import('../src/models/index.ts');
  
  const modernTemplate = {
    name: "Modern UI/UX",
    description: "Two-column design with distinct sidebar. Clean, minimalist aesthetic perfect for creative professionals.",
    category: "cv", 
    categories: ["Modern", "Creative"],
    tier: "free",
    
    // Layout Configuration
    layoutType: "two-column",
    
    // Global styling
    globalStyles: {
      fontFamily: "Inter, sans-serif",
      primaryColor: "#5C2D91", // Deep purple for headings
      secondaryColor: "#333333", // Dark gray for body text
      backgroundColor: "#F5F5F5",
      fontSize: "10pt",
      lineHeight: "1.6",
      spacing: "20px",
      customCSS: `.cv-container { 
        background: #EFEFEF; 
      } 
      .left-column { 
        background: #FFFFFF; 
      } 
      .section-header { 
        font-size: 14pt; 
        font-weight: 600; 
        text-transform: uppercase; 
        color: var(--primary-color); 
        border-bottom: 2px solid var(--primary-color); 
        padding-bottom: 4px; 
      }`
    },
    
    // Column layout - two columns
    columnLayout: {
      leftColumn: {
        width: "30%",
        sections: [
          "personal_info",
          "contact_info", 
          "profile",
          "most_proud_of",
          "languages"
        ]
      },
      rightColumn: {
        width: "70%",
        sections: [
          "professional_experience",
          "education",
          "tools",
          "awards", 
          "skills",
          "favorite_books"
        ]
      }
    },
    
    // Section-specific styling
    sectionStyling: {
      personal_info: {
        name: {
          "font-size": "30pt",
          "font-weight": "700",
          "color": "var(--primary-color)"
        },
        label: {
          "font-size": "16pt",
          "font-weight": "400", 
          "color": "var(--secondary-color)"
        }
      },
      contact_info: {
        item: {
          "margin-bottom": "5px",
          "font-size": "9pt"
        }
      },
      profile: {
        "font-style": "italic",
        "margin-top": "10px"
      },
      professional_experience: {
        company: {
          "font-weight": "700",
          "font-size": "12pt"
        },
        position: {
          "font-weight": "500",
          "color": "var(--primary-color)"
        },
        date: {
          "font-size": "9pt",
          "color": "var(--secondary-color)"
        }
      },
      skills: {
        listItem: {
          "display": "flex",
          "justify-content": "space-between",
          "align-items": "center"
        },
        dots: {
          "color": "#999999"
        }
      },
      tools: {
        item: {
          "display": "inline-block",
          "background": "var(--primary-color)",
          "color": "white",
          "padding": "2px 8px",
          "border-radius": "3px",
          "font-size": "8pt",
          "margin": "2px"
        }
      },
      languages: {
        language: {
          "font-weight": "500"
        },
        level: {
          "font-size": "8pt",
          "color": "var(--secondary-color)"
        }
      }
    },
    
    // Available sections
    availableSections: [
      {
        key: "personal_info",
        displayName: "Personal Info",
        componentName: "PersonalInfoSection", 
        isList: false,
        defaultItemContent: {
          name: "",
          label: ""
        }
      },
      {
        key: "contact_info",
        displayName: "Contact Information",
        componentName: "ContactSection",
        isList: false,
        defaultItemContent: {
          email: "",
          phone: "",
          location: "",
          website: ""
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
        key: "professional_experience", 
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
          endDate: ""
        }
      },
      {
        key: "skills",
        displayName: "Skills",
        componentName: "SkillsSection",
        isList: true,
        defaultItemContent: {
          name: "",
          level: ""
        }
      },
      {
        key: "tools",
        displayName: "Tools & Technologies",
        componentName: "ToolsSection",
        isList: true,
        defaultItemContent: {
          name: "",
          category: ""
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
      },
      {
        key: "awards",
        displayName: "Awards & Recognition",
        componentName: "AwardsSection",
        isList: true,
        defaultItemContent: {
          title: "",
          date: "",
          awarder: ""
        }
      },
      {
        key: "most_proud_of",
        displayName: "Most Proud Of",
        componentName: "AccomplishmentsSection",
        isList: true,
        defaultItemContent: {
          title: "",
          description: ""
        }
      },
      {
        key: "favorite_books",
        displayName: "Favorite Books",
        componentName: "BooksSection",
        isList: true,
        defaultItemContent: {
          title: "",
          author: ""
        }
      }
    ],
    
    // Page settings
    pageSettings: {
      format: "A4",
      orientation: "portrait",
      margins: {
        top: "15mm",
        bottom: "15mm",
        left: "15mm", 
        right: "15mm"
      },
      maxHeight: "280mm"
    },
    
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1
  };
  
  try {
    const existingTemplate = await Template.findOne({ name: modernTemplate.name });
    if (existingTemplate) {
      console.log('⚠️ Modern UI/UX template already exists, updating...');
      await Template.findByIdAndUpdate(existingTemplate._id, modernTemplate);
    } else {
      await Template.create(modernTemplate);
      console.log('✅ Modern UI/UX template created successfully');
    }
  } catch (error) {
    console.error('❌ Error creating Modern UI/UX template:', error);
  }
}

async function main() {
  console.log('🚀 Starting Improved Template Seeding\n');
  
  try {
    await connectDB();
    
    await createATSProfessionalTemplate();
    await createModernUIUXTemplate();
    
    console.log('\n🎉 Template seeding completed successfully!');
    console.log('\nTemplates created:');
    console.log('✅ ATS Professional (single-column, ATS-optimized)');
    console.log('✅ Modern UI/UX (two-column, creative design)');
    
  } catch (error) {
    console.error('\n💥 Template seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📔 Database connection closed');
  }
}

// Run seeding if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, createATSProfessionalTemplate, createModernUIUXTemplate };
