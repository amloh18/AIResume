#!/usr/bin/env node

/**
 * Seed Admin Templates Script
 * 
 * Creates 10 professional CV templates in the cvcircle_admin database
 * These templates will be used across the entire platform
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function connectAdminDB() {
  try {
    // Connect to admin database instead of main app database
    const adminMongoUri = process.env.ADMIN_MONGODB_URI || process.env.MONGODB_URI;
    if (!adminMongoUri) {
      throw new Error('ADMIN_MONGODB_URI or MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(adminMongoUri);
    console.log('✅ Connected to Admin MongoDB');
  } catch (error) {
    console.error('❌ Admin MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function createAdminTemplates() {
  console.log('\n🎨 Creating admin templates...');
  
  const db = mongoose.connection.db;
  const templatesCollection = db.collection('templates');
  
  const templates = [
    // 1. The Modern Professional
    {
      name: "The Modern Professional",
      description: "Clean, professional single-column design with classic blue accents. Perfect for corporate and business roles.",
      category: "cv",
      categories: ["Professional", "Modern"],
      tier: "free",
      layoutType: "one-column",
      globalStyles: {
        fontFamily: "Inter, sans-serif",
        primaryColor: "#007BFF",
        secondaryColor: "#212529",
        backgroundColor: "#ffffff",
        fontSize: "11pt",
        lineHeight: "1.5",
        spacing: "20px",
        customCSS: ".cv-container { padding: 40px; } .section-header { font-size: 14pt; font-weight: 600; text-transform: uppercase; color: var(--secondary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 4px; }"
      },
      columnLayout: {
        main: {
          width: "100%",
          sections: ["personal_header", "summary", "work_experience", "education", "skills", "projects"]
        }
      },
      sectionStyling: {
        personal_header: {
          name: { "font-size": "28pt", "font-weight": "700", "color": "var(--secondary-color)" },
          label: { "font-size": "14pt", "font-weight": "400", "color": "var(--primary-color)" },
          contactInfo: { "font-size": "10pt", "color": "var(--secondary-color)" }
        },
        work_experience: {
          jobTitle: { "font-weight": "600", "color": "var(--secondary-color)" },
          company: { "font-style": "italic", "color": "var(--secondary-color)" }
        }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "", score: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } },
        { key: "projects", displayName: "Projects", componentName: "ProjectsSection", isList: true, defaultItemContent: { name: "", description: "", highlights: [], url: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" }, maxHeight: "277mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 2. The Two-Column Sidebar
    {
      name: "The Two-Column Sidebar",
      description: "Modern two-column layout with a distinct sidebar for personal info. Features deep purple accents for creative professionals.",
      category: "cv",
      categories: ["Modern", "Creative"],
      tier: "free",
      layoutType: "two-column",
      globalStyles: {
        fontFamily: "Inter, sans-serif",
        primaryColor: "#5C2D91",
        secondaryColor: "#333333",
        backgroundColor: "#EFEFEF",
        fontSize: "10pt",
        lineHeight: "1.6",
        spacing: "20px",
        customCSS: ".left-column { background: #FFFFFF; padding: 30px; } .right-column { padding: 30px; } .section-header { font-size: 14pt; font-weight: 600; text-transform: uppercase; color: var(--secondary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 4px; }"
      },
      columnLayout: {
        leftColumn: { width: "30%", sections: ["personal_info", "contact_info", "profile", "languages"] },
        rightColumn: { width: "70%", sections: ["professional_experience", "education", "skills", "projects", "awards"] }
      },
      sectionStyling: {
        personal_info: {
          name: { "font-size": "24pt", "font-weight": "700", "color": "var(--secondary-color)" },
          label: { "font-size": "14pt", "font-weight": "400", "color": "var(--primary-color)" }
        },
        contact_info: { icon: { "color": "var(--primary-color)" } }
      },
      availableSections: [
        { key: "personal_info", displayName: "Personal Info", componentName: "PersonalInfoSection", isList: false, defaultItemContent: { name: "", label: "" } },
        { key: "contact_info", displayName: "Contact Information", componentName: "ContactSection", isList: false, defaultItemContent: { email: "", phone: "", location: "", website: "" } },
        { key: "profile", displayName: "Profile", componentName: "ProfileSection", isList: false, defaultItemContent: { summary: "" } },
        { key: "professional_experience", displayName: "Professional Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "" } },
        { key: "projects", displayName: "Projects", componentName: "ProjectsSection", isList: true, defaultItemContent: { name: "", description: "", highlights: [], url: "" } },
        { key: "awards", displayName: "Awards", componentName: "AwardsSection", isList: true, defaultItemContent: { title: "", date: "", awarder: "" } },
        { key: "languages", displayName: "Languages", componentName: "LanguagesSection", isList: true, defaultItemContent: { language: "", fluency: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" }, maxHeight: "282mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 3. The Timeline
    {
      name: "The Timeline",
      description: "Elegant timeline-based design with visual progression indicators. Perfect for showcasing career progression with crimson red accents.",
      category: "cv",
      categories: ["Creative", "Modern"],
      tier: "free",
      layoutType: "one-column",
      globalStyles: {
        fontFamily: "Georgia, serif",
        primaryColor: "#DC3545",
        secondaryColor: "#212529",
        backgroundColor: "#ffffff",
        fontSize: "11pt",
        lineHeight: "1.6",
        spacing: "20px",
        customCSS: ".cv-container { padding: 40px 60px; position: relative; } .timeline-line { position: absolute; left: 30px; top: 0; bottom: 0; width: 2px; background: #E9ECEF; }"
      },
      columnLayout: {
        main: { width: "100%", sections: ["personal_header", "summary", "work_experience", "education", "projects", "awards"] }
      },
      sectionStyling: {
        work_experience: {
          "timeline-dot": { "background": "var(--primary-color)", "width": "10px", "height": "10px", "border-radius": "50%" },
          date: { "color": "var(--primary-color)", "font-weight": "600" }
        },
        education: {
          "timeline-dot": { "background": "var(--primary-color)", "width": "10px", "height": "10px", "border-radius": "50%" },
          date: { "color": "var(--primary-color)", "font-weight": "600" }
        }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "TimelineWorkSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "TimelineEducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "projects", displayName: "Projects", componentName: "ProjectsSection", isList: true, defaultItemContent: { name: "", description: "", highlights: [], url: "" } },
        { key: "awards", displayName: "Awards", componentName: "AwardsSection", isList: true, defaultItemContent: { title: "", date: "", awarder: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "20mm", bottom: "20mm", left: "25mm", right: "20mm" }, maxHeight: "277mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 4. The Stacked Blocks
    {
      name: "The Stacked Blocks",
      description: "Modern block-based design with amber yellow accents. Each section is visually separated for clear information hierarchy.",
      category: "cv",
      categories: ["Modern", "Creative"],
      tier: "free",
      layoutType: "one-column",
      globalStyles: {
        fontFamily: "Poppins, sans-serif",
        primaryColor: "#FFC107",
        secondaryColor: "#343a40",
        backgroundColor: "#F8F9FA",
        fontSize: "11pt",
        lineHeight: "1.7",
        spacing: "20px",
        customCSS: ".cv-container { padding: 30px; background: var(--backgroundColor); } .section-block { background: #FFFFFF; border-left: 5px solid var(--primary-color); padding: 20px; margin-bottom: 20px; }"
      },
      columnLayout: {
        main: { width: "100%", sections: ["personal_header", "summary", "work_experience", "education", "skills", "projects"] }
      },
      sectionStyling: {
        personal_header: {
          name: { "font-size": "30pt", "font-weight": "700", "color": "var(--secondary-color)" },
          label: { "font-size": "16pt", "color": "var(--secondary-color)" }
        },
        section_header: { "font-weight": "700", "color": "var(--secondary-color)" }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } },
        { key: "projects", displayName: "Projects", componentName: "ProjectsSection", isList: true, defaultItemContent: { name: "", description: "", highlights: [], url: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" }, maxHeight: "282mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 5. The Hybrid
    {
      name: "The Hybrid",
      description: "Unique hybrid layout combining single and split sections. Forest green accents for environmental and tech professionals.",
      category: "cv",
      categories: ["Modern", "Creative"],
      tier: "premium",
      layoutType: "custom",
      globalStyles: {
        fontFamily: "Roboto, sans-serif",
        primaryColor: "#28A745",
        secondaryColor: "#333333",
        backgroundColor: "#FFFFFF",
        fontSize: "11pt",
        lineHeight: "1.5",
        spacing: "20px",
        customCSS: ".cv-container { padding: 40px; } .split-section { display: flex; }"
      },
      columnLayout: {
        main: { width: "100%", sections: ["personal_header", "summary"] },
        split_left: { width: "30%", sections: ["skills", "languages"] },
        split_right: { width: "70%", sections: ["work_experience", "education", "projects"] }
      },
      sectionStyling: {
        personal_header: {
          name: { "font-size": "32pt", "font-weight": "700", "color": "var(--secondary-color)" },
          label: { "font-size": "18pt", "color": "var(--secondary-color)" }
        },
        work_experience: { date: { "color": "var(--primary-color)", "font-weight": "600", "text-align": "right" } }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } },
        { key: "projects", displayName: "Projects", componentName: "ProjectsSection", isList: true, defaultItemContent: { name: "", description: "", highlights: [], url: "" } },
        { key: "languages", displayName: "Languages", componentName: "LanguagesSection", isList: true, defaultItemContent: { language: "", fluency: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" }, maxHeight: "277mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 6. The Minimalist
    {
      name: "The Minimalist",
      description: "Clean, sophisticated design with elegant typography and minimal styling. Slate gray accents for maximum readability.",
      category: "cv",
      categories: ["Professional", "Minimal"],
      tier: "free",
      layoutType: "one-column",
      globalStyles: {
        fontFamily: "Garamond, serif",
        primaryColor: "#6C757D",
        secondaryColor: "#212529",
        backgroundColor: "#ffffff",
        fontSize: "12pt",
        lineHeight: "1.8",
        spacing: "30px",
        customCSS: ".cv-container { padding: 50px 80px; } .section-header { font-size: 16pt; font-weight: 700; color: var(--secondary-color); margin-bottom: 15px; }"
      },
      columnLayout: {
        main: { width: "100%", sections: ["personal_header", "summary", "work_experience", "education", "skills", "languages"] }
      },
      sectionStyling: {
        personal_header: {
          name: { "font-size": "26pt", "font-weight": "700", "text-align": "center", "color": "var(--secondary-color)" },
          contactInfo: { "font-size": "11pt", "text-align": "center", "color": "var(--secondary-color)" }
        }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } },
        { key: "languages", displayName: "Languages", componentName: "LanguagesSection", isList: true, defaultItemContent: { language: "", fluency: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "25mm", bottom: "25mm", left: "30mm", right: "30mm" }, maxHeight: "267mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 7. The Infographic
    {
      name: "The Infographic",
      description: "Visual-focused design with skill bars and icons. Turquoise accents perfect for designers and creative professionals.",
      category: "cv",
      categories: ["Creative", "Modern"],
      tier: "premium",
      layoutType: "two-column",
      globalStyles: {
        fontFamily: "Montserrat, sans-serif",
        primaryColor: "#17A2B8",
        secondaryColor: "#343a40",
        backgroundColor: "#FFFFFF",
        fontSize: "10pt",
        lineHeight: "1.5",
        spacing: "20px",
        customCSS: ".left-column { background: #E9F6F8; padding: 25px; } .right-column { padding: 25px; } .section-header { font-size: 12pt; font-weight: 600; text-transform: uppercase; color: var(--secondary-color); }"
      },
      columnLayout: {
        leftColumn: { width: "35%", sections: ["personal_header", "skills", "languages"] },
        rightColumn: { width: "65%", sections: ["summary", "work_experience", "education", "projects"] }
      },
      sectionStyling: {
        skills: {
          icon: { "color": "var(--primary-color)" },
          bar: { "height": "8px", "background": "#E9ECEF" },
          fill: { "background": "var(--primary-color)" }
        },
        languages: { icon: { "color": "var(--primary-color)" } }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsBarSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } },
        { key: "projects", displayName: "Projects", componentName: "ProjectsSection", isList: true, defaultItemContent: { name: "", description: "", highlights: [], url: "" } },
        { key: "languages", displayName: "Languages", componentName: "LanguagesSection", isList: true, defaultItemContent: { language: "", fluency: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" }, maxHeight: "282mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 8. The Classic
    {
      name: "The Classic",
      description: "Traditional academic and corporate design with timeless typography. Classic black styling for maximum professionalism.",
      category: "cv",
      categories: ["Professional", "Traditional"],
      tier: "free",
      layoutType: "one-column",
      globalStyles: {
        fontFamily: "Times New Roman, serif",
        primaryColor: "#000000",
        secondaryColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "12pt",
        lineHeight: "1.4",
        spacing: "20px",
        customCSS: ".cv-container { padding: 40px 60px; } .section-header { font-size: 14pt; font-weight: 700; text-transform: uppercase; color: var(--secondary-color); border-bottom: 1px solid var(--secondary-color); padding-bottom: 2px; margin-bottom: 10px; }"
      },
      columnLayout: {
        main: { width: "100%", sections: ["personal_header", "summary", "work_experience", "education", "awards", "skills"] }
      },
      sectionStyling: {
        personal_header: {
          name: { "font-size": "24pt", "font-weight": "700", "text-align": "center", "color": "var(--secondary-color)" },
          label: { "font-size": "14pt", "font-weight": "400", "text-align": "center", "color": "var(--secondary-color)" }
        },
        work_experience: { date: { "font-style": "italic" } }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "awards", displayName: "Awards", componentName: "AwardsSection", isList: true, defaultItemContent: { title: "", date: "", awarder: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "20mm", bottom: "20mm", left: "25mm", right: "25mm" }, maxHeight: "277mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 9. The Bubble
    {
      name: "The Bubble",
      description: "Playful design with rounded elements and bubble-style section headers. Orange accents for creative and startup professionals.",
      category: "cv",
      categories: ["Creative", "Modern"],
      tier: "free",
      layoutType: "one-column",
      globalStyles: {
        fontFamily: "Open Sans, sans-serif",
        primaryColor: "#FD7E14",
        secondaryColor: "#343a40",
        backgroundColor: "#f8f9fa",
        fontSize: "10pt",
        lineHeight: "1.6",
        spacing: "25px",
        customCSS: ".cv-container { padding: 40px; } .section-header { background: #FFFFFF; border-radius: 20px; padding: 10px 20px; display: inline-block; margin-bottom: 15px; color: var(--primary-color); }"
      },
      columnLayout: {
        main: { width: "100%", sections: ["personal_header", "summary", "work_experience", "education", "skills", "languages"] }
      },
      sectionStyling: {
        personal_header: { name: { "font-size": "26pt", "font-weight": "700", "color": "var(--secondary-color)" } },
        skills: { dot: { "background": "var(--primary-color)", "width": "8px", "height": "8px", "border-radius": "50%" } }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "PersonalHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } },
        { key: "languages", displayName: "Languages", componentName: "LanguagesSection", isList: true, defaultItemContent: { language: "", fluency: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" }, maxHeight: "277mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    },

    // 10. The Bold Header
    {
      name: "The Bold Header",
      description: "Eye-catching design with a prominent colored header section. Vivid purple for modern professionals who want to stand out.",
      category: "cv",
      categories: ["Modern", "Creative"],
      tier: "premium",
      layoutType: "one-column",
      globalStyles: {
        fontFamily: "Helvetica, sans-serif",
        primaryColor: "#6610F2",
        secondaryColor: "#212529",
        backgroundColor: "#ffffff",
        fontSize: "11pt",
        lineHeight: "1.5",
        spacing: "20px",
        customCSS: ".header-section { background: var(--primary-color); color: #FFFFFF; padding: 30px; } .header-section * { color: #FFFFFF !important; } .section-header { font-size: 14pt; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid var(--secondary-color); padding-bottom: 4px; }"
      },
      columnLayout: {
        main: { width: "100%", sections: ["personal_header", "summary", "work_experience", "education", "skills", "projects"] }
      },
      sectionStyling: {
        personal_header: {
          name: { "font-size": "36pt", "font-weight": "700" },
          label: { "font-size": "20pt", "font-weight": "400" },
          contactInfo: { "font-size": "11pt" }
        }
      },
      availableSections: [
        { key: "personal_header", displayName: "Personal Header", componentName: "BoldHeaderSection", isList: false, defaultItemContent: { name: "", label: "", email: "", phone: "", location: "" } },
        { key: "summary", displayName: "Professional Summary", componentName: "SummarySection", isList: false, defaultItemContent: { summary: "" } },
        { key: "work_experience", displayName: "Work Experience", componentName: "WorkExperienceSection", isList: true, defaultItemContent: { name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] } },
        { key: "education", displayName: "Education", componentName: "EducationSection", isList: true, defaultItemContent: { institution: "", degree: "", area: "", startDate: "", endDate: "" } },
        { key: "skills", displayName: "Skills", componentName: "SkillsSection", isList: true, defaultItemContent: { name: "", level: "", keywords: [] } },
        { key: "projects", displayName: "Projects", componentName: "ProjectsSection", isList: true, defaultItemContent: { name: "", description: "", highlights: [], url: "" } }
      ],
      pageSettings: { format: "A4", orientation: "portrait", margins: { top: "10mm", bottom: "20mm", left: "20mm", right: "20mm" }, maxHeight: "287mm" },
      isActive: true, isDefault: false, isPublished: true, globalAccess: true, version: 1, createdAt: new Date(), updatedAt: new Date()
    }
  ];

  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const template of templates) {
      const result = await templatesCollection.replaceOne(
        { name: template.name },
        template,
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        createdCount++;
        console.log(`✅ Created template: ${template.name}`);
      } else {
        updatedCount++;
        console.log(`✅ Updated template: ${template.name}`);
      }
    }
    
    console.log(`\n🎉 Template seeding completed!`);
    console.log(`📊 Results: ${createdCount} created, ${updatedCount} updated`);
    
  } catch (error) {
    console.error('❌ Error creating templates:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Admin Template Seeding\n');
  
  try {
    await connectAdminDB();
    await createAdminTemplates();
    
    console.log('\n📋 All 10 professional templates created in admin database:');
    console.log('1. ✅ The Modern Professional (Classic Blue)');
    console.log('2. ✅ The Two-Column Sidebar (Deep Purple)');
    console.log('3. ✅ The Timeline (Crimson Red)');
    console.log('4. ✅ The Stacked Blocks (Amber Yellow)');
    console.log('5. ✅ The Hybrid (Forest Green)');
    console.log('6. ✅ The Minimalist (Slate Gray)');
    console.log('7. ✅ The Infographic (Turquoise)');
    console.log('8. ✅ The Classic (Classic Black)');
    console.log('9. ✅ The Bubble (Orange)');
    console.log('10. ✅ The Bold Header (Vivid Purple)');
    
  } catch (error) {
    console.error('\n💥 Admin template seeding failed:', error);
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

module.exports = { main };

