#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Template Schema (simplified for the script)
const templateSchema = new mongoose.Schema({
  name: String,
  category: [String],
  description: String,
  thumbnail: String,
  isDefault: Boolean,
  isPremium: Boolean,
  display: {
    layout: String,
    padding: String,
    fontFamily: String,
    sectionSpacing: String
  },
  styles: {
    layout: String,
    paddingX: Number,
    paddingY: Number,
    lineHeight: Number,
    sectionGap: Number,
    subsectionGap: Number,
    bulletGap: Number,
    titleBottomMargin: Number,
    highlightColor: String,
    baseFontSize: Number,
    fontFamily: String,
    contactAlignment: String,
    showProfilePicture: Boolean,
    leftColumnWidth: Number,
    itemStyle: String,
    showSectionLine: Boolean,
    canvas: Object,
    grid: Object,
    sections: Array,
    elements: Array
  },
  sectionTitles: Object,
  metadata: {
    usageCount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5 },
    tags: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

const Template = mongoose.model('Template', templateSchema);

// Template data
const templates = [
  {
    name: "ATS Finance CV",
    category: ["ATS-Friendly", "Finance", "Professional"],
    description: "Optimized for Applicant Tracking Systems with clean, structured layout perfect for finance professionals.",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "single-column",
      padding: "32px",
      fontFamily: "Arial, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "single-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.4,
      sectionGap: 2.2,
      subsectionGap: 1.2,
      bulletGap: 0.6,
      titleBottomMargin: 0.8,
      highlightColor: "#000000",
      baseFontSize: 11,
      fontFamily: "Arial",
      contactAlignment: "left",
      showProfilePicture: false,
      itemStyle: "simple-list",
      showSectionLine: true,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        header: { x: 6, y: 6, w: 88, h: 12 },
        body: { x: 6, y: 20, w: 88, h: 74 }
      },
      sections: [
        { key: "header_name", box: { x: 6, y: 6, w: 60, h: 6 }, zIndex: 10 },
        { key: "header_contacts", box: { x: 6, y: 12, w: 88, h: 6 }, zIndex: 10 },
        { key: "profile", box: { x: 6, y: 20, w: 88, h: 12 }, zIndex: 5 },
        { key: "experience", box: { x: 6, y: 34, w: 88, h: 30 }, zIndex: 5 },
        { key: "education", box: { x: 6, y: 66, w: 88, h: 20 }, zIndex: 5 },
        { key: "skills", box: { x: 6, y: 88, w: 88, h: 6 }, zIndex: 5 }
      ],
      elements: []
    },
    sectionTitles: {
      profile: "Professional Summary",
      experience: "Relevant Work Experience",
      education: "Education",
      skills: "Skills & Qualifications"
    },
    metadata: {
      usageCount: 0,
      rating: 4.8,
      tags: ["ATS-Friendly", "Finance", "Professional", "Single-Column"]
    }
  },
  {
    name: "ProfessionalClassic",
    category: ["Minimalist", "Professional"],
    description: "Clean two-column layout with no photo, perfect for professional applications",
    thumbnail: "/api/placeholder/300/400",
    isDefault: true,
    isPremium: false,
    display: {
      layout: "two-column",
      padding: "32px",
      fontFamily: "Libre Baskerville, serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "two-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.4,
      sectionGap: 2.2,
      subsectionGap: 1.2,
      bulletGap: 0.6,
      titleBottomMargin: 0.8,
      highlightColor: "#000000",
      baseFontSize: 11,
      fontFamily: "Libre Baskerville",
      contactAlignment: "right",
      showProfilePicture: false,
      leftColumnWidth: 42,
      itemStyle: "simple-list",
      showSectionLine: false,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        left: { x: 6, y: 20, w: 42, h: 74 },
        right: { x: 52, y: 20, w: 42, h: 74 },
        header: { x: 6, y: 6, w: 88, h: 12 }
      },
      sections: [
        { key: "header_name", box: { x: 6, y: 6, w: 60, h: 6 }, zIndex: 10 },
        { key: "header_contacts", box: { x: 66, y: 6, w: 28, h: 6 }, zIndex: 10 },
        { key: "profile", box: { x: 52, y: 20, w: 42, h: 12 }, zIndex: 5 },
        { key: "experience", box: { x: 52, y: 34, w: 42, h: 60 }, zIndex: 5 },
        { key: "education", box: { x: 6, y: 20, w: 42, h: 20 }, zIndex: 5 },
        { key: "skills", box: { x: 6, y: 42, w: 42, h: 18 }, zIndex: 5 },
        { key: "languages", box: { x: 6, y: 62, w: 42, h: 12 }, zIndex: 5 }
      ],
      elements: []
    },
    sectionTitles: {
      profile: "Profile",
      experience: "Work Experience",
      education: "Education",
      skills: "Skills",
      languages: "Languages"
    },
    metadata: {
      usageCount: 0,
      rating: 4.5,
      tags: ["Minimalist", "Professional", "Two-Column", "Clean"]
    }
  },
  {
    name: "MinimalClassic",
    category: ["Minimalist", "Professional"],
    description: "Minimalist design with subtle icon row and clean typography",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "two-column",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "two-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.4,
      sectionGap: 2.2,
      subsectionGap: 1.2,
      bulletGap: 0.6,
      titleBottomMargin: 0.8,
      highlightColor: "#000000",
      baseFontSize: 11,
      fontFamily: "Montserrat",
      contactAlignment: "center",
      showProfilePicture: false,
      leftColumnWidth: 42,
      itemStyle: "simple-list",
      showSectionLine: false,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        header: { x: 6, y: 6, w: 88, h: 10 },
        left: { x: 6, y: 20, w: 42, h: 74 },
        right: { x: 52, y: 20, w: 42, h: 74 }
      },
      sections: [
        { key: "header_name", box: { x: 6, y: 6, w: 88, h: 4 }, zIndex: 10 },
        { key: "header_contacts", box: { x: 6, y: 10, w: 88, h: 4 }, zIndex: 10 },
        { key: "education", box: { x: 6, y: 20, w: 42, h: 24 }, zIndex: 5 },
        { key: "skills", box: { x: 6, y: 46, w: 42, h: 18 }, zIndex: 5 },
        { key: "profile", box: { x: 52, y: 20, w: 42, h: 14 }, zIndex: 5 },
        { key: "experience", box: { x: 52, y: 36, w: 42, h: 58 }, zIndex: 5 }
      ],
      elements: []
    },
    sectionTitles: {
      profile: "Profile",
      experience: "Work Experience",
      education: "Education",
      skills: "Skills"
    },
    metadata: {
      usageCount: 0,
      rating: 4.3,
      tags: ["Minimalist", "Professional", "Two-Column", "Clean"]
    }
  },
  {
    name: "ModernTimeline",
    category: ["Modern", "Timeline"],
    description: "Modern timeline design with left rail and timeline dots on right",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "two-column",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "two-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.35,
      sectionGap: 2,
      subsectionGap: 1.2,
      bulletGap: 0.5,
      titleBottomMargin: 0.8,
      highlightColor: "#111111",
      baseFontSize: 10.5,
      fontFamily: "Montserrat",
      contactAlignment: "left",
      showProfilePicture: false,
      leftColumnWidth: 30,
      itemStyle: "timeline",
      showSectionLine: true,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        header: { x: 6, y: 6, w: 88, h: 8 },
        left: { x: 6, y: 16, w: 30, h: 78 },
        right: { x: 38, y: 16, w: 56, h: 78 }
      },
      sections: [
        { key: "header_name_role", box: { x: 6, y: 6, w: 40, h: 8 }, zIndex: 10 },
        { key: "monogram", box: { x: 82, y: 6, w: 12, h: 8 }, zIndex: 10 },
        { key: "education", box: { x: 6, y: 16, w: 30, h: 18 }, zIndex: 5 },
        { key: "reference", box: { x: 6, y: 36, w: 30, h: 18 }, zIndex: 5 },
        { key: "awards", box: { x: 6, y: 56, w: 30, h: 12 }, zIndex: 5 },
        { key: "contact", box: { x: 6, y: 70, w: 30, h: 10 }, zIndex: 5 },
        { key: "skills", box: { x: 6, y: 82, w: 30, h: 12 }, zIndex: 5 },
        { key: "about", box: { x: 38, y: 16, w: 56, h: 12 }, zIndex: 5 },
        { key: "experience", box: { x: 38, y: 30, w: 56, h: 64 }, zIndex: 5 }
      ],
      elements: [
        { type: "line", x1: 38, y1: 30, x2: 38, y2: 94, strokeWidth: 0.2, zIndex: 2 }
      ]
    },
    sectionTitles: {
      about: "About Me",
      experience: "Work Experience",
      education: "Education",
      reference: "Reference",
      awards: "Awards",
      skills: "Skills",
      contact: "Contact"
    },
    metadata: {
      usageCount: 0,
      rating: 4.6,
      tags: ["Modern", "Timeline", "Two-Column", "Professional"]
    }
  },
  {
    name: "GreenAccentSidebar",
    category: ["Sidebar", "Colored"],
    description: "Sidebar design with photo and green accent colors",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "two-column",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "two-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.35,
      sectionGap: 2,
      subsectionGap: 1.2,
      bulletGap: 0.5,
      titleBottomMargin: 0.8,
      highlightColor: "#2BAA4A",
      baseFontSize: 10.5,
      fontFamily: "Montserrat",
      contactAlignment: "left",
      showProfilePicture: true,
      leftColumnWidth: 35,
      itemStyle: "bar-skill",
      showSectionLine: true,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        left: { x: 6, y: 10, w: 35, h: 84 },
        right: { x: 45, y: 10, w: 49, h: 84 },
        header: { x: 6, y: 6, w: 88, h: 4 }
      },
      sections: [
        { key: "header_name_role", box: { x: 6, y: 6, w: 70, h: 4 }, zIndex: 10 },
        { key: "photo", box: { x: 6, y: 10, w: 12, h: 12 }, zIndex: 12 },
        { key: "about", box: { x: 6, y: 24, w: 35, h: 12 }, zIndex: 5 },
        { key: "contact", box: { x: 6, y: 38, w: 35, h: 12 }, zIndex: 5 },
        { key: "skills", box: { x: 6, y: 52, w: 35, h: 16 }, zIndex: 5 },
        { key: "reference", box: { x: 6, y: 70, w: 35, h: 24 }, zIndex: 5 },
        { key: "experience", box: { x: 45, y: 10, w: 49, h: 54 }, zIndex: 5 },
        { key: "education", box: { x: 45, y: 66, w: 49, h: 28 }, zIndex: 5 }
      ],
      elements: [
        { type: "line", x1: 45, y1: 10, x2: 94, y2: 10, strokeWidth: 0.2, color: "#2BAA4A", zIndex: 3 },
        { type: "line", x1: 6, y1: 24, x2: 41, y2: 24, strokeWidth: 0.2, color: "#2BAA4A", zIndex: 3 }
      ]
    },
    sectionTitles: {
      about: "About Me",
      experience: "Experiences",
      education: "Education",
      skills: "Skills",
      reference: "Reference",
      contact: "Contact"
    },
    metadata: {
      usageCount: 0,
      rating: 4.4,
      tags: ["Sidebar", "Colored", "Photo", "Modern"]
    }
  },
  {
    name: "CirclePhotoSoft",
    category: ["Minimalist", "Photo"],
    description: "Wide header band with circle photo and three-column bottom layout",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "single-column",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "single-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.4,
      sectionGap: 2,
      subsectionGap: 1.2,
      bulletGap: 0.5,
      titleBottomMargin: 0.8,
      highlightColor: "#000000",
      baseFontSize: 11,
      fontFamily: "Montserrat",
      contactAlignment: "right",
      showProfilePicture: true,
      itemStyle: "bar-skill",
      showSectionLine: false,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        header: { x: 6, y: 6, w: 88, h: 10 },
        body: { x: 6, y: 18, w: 88, h: 72 },
        footer: { x: 6, y: 92, w: 88, h: 8 }
      },
      sections: [
        { key: "photo", box: { x: 6, y: 6, w: 8, h: 8 }, zIndex: 12, mask: "circle" },
        { key: "header_name", box: { x: 16, y: 6, w: 40, h: 6 }, zIndex: 10 },
        { key: "header_contacts", box: { x: 60, y: 6, w: 34, h: 6 }, zIndex: 10 },
        { key: "profile", box: { x: 6, y: 18, w: 88, h: 10 }, zIndex: 5 },
        { key: "experience", box: { x: 6, y: 30, w: 88, h: 34 }, zIndex: 5 },
        { key: "education", box: { x: 6, y: 66, w: 42, h: 24 }, zIndex: 5 },
        { key: "skills", box: { x: 52, y: 66, w: 42, h: 24 }, zIndex: 5 },
        { key: "references", box: { x: 6, y: 92, w: 88, h: 8 }, zIndex: 5 }
      ],
      elements: [
        { type: "line", x1: 6, y1: 18, x2: 94, y2: 18, strokeWidth: 0.2, zIndex: 2 }
      ]
    },
    sectionTitles: {
      profile: "Profile",
      experience: "Experience",
      education: "Education",
      skills: "Skills",
      references: "References"
    },
    metadata: {
      usageCount: 0,
      rating: 4.7,
      tags: ["Minimalist", "Photo", "Single-Column", "Modern"]
    }
  },
  {
    name: "ElegantTwoRail",
    category: ["Elegant", "Minimalist"],
    description: "Elegant two-rail design with circular photo",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "two-column",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "two-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.4,
      sectionGap: 2,
      subsectionGap: 1.2,
      bulletGap: 0.5,
      titleBottomMargin: 0.8,
      highlightColor: "#000000",
      baseFontSize: 11,
      fontFamily: "Montserrat",
      contactAlignment: "right",
      showProfilePicture: true,
      leftColumnWidth: 60,
      itemStyle: "simple-list",
      showSectionLine: true,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        header: { x: 6, y: 6, w: 88, h: 8 },
        left: { x: 6, y: 16, w: 60, h: 78 },
        right: { x: 68, y: 16, w: 26, h: 78 }
      },
      sections: [
        { key: "photo", box: { x: 82, y: 6, w: 12, h: 12 }, zIndex: 12, mask: "circle" },
        { key: "header_name", box: { x: 6, y: 6, w: 60, h: 8 }, zIndex: 10 },
        { key: "experience", box: { x: 6, y: 16, w: 60, h: 60 }, zIndex: 5 },
        { key: "references", box: { x: 6, y: 78, w: 60, h: 16 }, zIndex: 5 },
        { key: "contact", box: { x: 68, y: 16, w: 26, h: 18 }, zIndex: 5 },
        { key: "education", box: { x: 68, y: 36, w: 26, h: 22 }, zIndex: 5 },
        { key: "expertise", box: { x: 68, y: 60, w: 26, h: 34 }, zIndex: 5 }
      ],
      elements: [
        { type: "line", x1: 6, y1: 16, x2: 94, y2: 16, strokeWidth: 0.15, zIndex: 2 }
      ]
    },
    sectionTitles: {
      experience: "Work Experience",
      contact: "Contact",
      education: "Education",
      expertise: "Expertise",
      references: "References",
      about: "About Me"
    },
    metadata: {
      usageCount: 0,
      rating: 4.8,
      tags: ["Elegant", "Minimalist", "Two-Column", "Photo"]
    }
  },
  {
    name: "SlateSidebar",
    category: ["Sidebar", "Dark"],
    description: "Dark left sidebar with modern styling",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "sidebar-left",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "sidebar-left",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.35,
      sectionGap: 2,
      subsectionGap: 1.2,
      bulletGap: 0.5,
      titleBottomMargin: 0.8,
      highlightColor: "#0F1C2C",
      baseFontSize: 10.5,
      fontFamily: "Montserrat",
      contactAlignment: "left",
      showProfilePicture: true,
      sidebarWidth: 28,
      itemStyle: "dot-timeline",
      showSectionLine: true,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        sidebar: { x: 6, y: 6, w: 28, h: 88 },
        main: { x: 36, y: 6, w: 58, h: 88 },
        footer: { x: 6, y: 94, w: 88, h: 4 }
      },
      sections: [
        { key: "photo", box: { x: 8, y: 8, w: 24, h: 12 }, zIndex: 12, mask: "circle" },
        { key: "contact", box: { x: 8, y: 22, w: 24, h: 16 }, zIndex: 11 },
        { key: "education", box: { x: 8, y: 40, w: 24, h: 16 }, zIndex: 11 },
        { key: "skills", box: { x: 8, y: 58, w: 24, h: 30 }, zIndex: 11 },
        { key: "header", box: { x: 36, y: 6, w: 58, h: 6 }, zIndex: 10 },
        { key: "profile", box: { x: 36, y: 14, w: 58, h: 10 }, zIndex: 5 },
        { key: "experience", box: { x: 36, y: 26, w: 58, h: 52 }, zIndex: 5 },
        { key: "references", box: { x: 36, y: 80, w: 58, h: 14 }, zIndex: 5 }
      ],
      elements: [
        { type: "rect", x: 6, y: 6, w: 28, h: 88, fill: "#1F2B3A", zIndex: 1 },
        { type: "line", x1: 36, y1: 12, x2: 94, y2: 12, strokeWidth: 0.15, zIndex: 2 }
      ]
    },
    sectionTitles: {
      contact: "Contact",
      education: "Education",
      skills: "Skills",
      profile: "Profile",
      experience: "Work Experience",
      references: "References"
    },
    metadata: {
      usageCount: 0,
      rating: 4.6,
      tags: ["Sidebar", "Dark", "Modern", "Photo"]
    }
  },
  {
    name: "EngineerPrecision",
    category: ["Professional", "Engineer"],
    description: "Precision engineering layout with left info rail and dense content",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "two-column",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "two-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.35,
      sectionGap: 2,
      subsectionGap: 1.2,
      bulletGap: 0.5,
      titleBottomMargin: 0.8,
      highlightColor: "#000000",
      baseFontSize: 10.5,
      fontFamily: "Montserrat",
      contactAlignment: "left",
      showProfilePicture: true,
      leftColumnWidth: 30,
      itemStyle: "simple-list",
      showSectionLine: true,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        header: { x: 6, y: 6, w: 88, h: 10 },
        left: { x: 6, y: 18, w: 30, h: 78 },
        right: { x: 38, y: 18, w: 56, h: 78 }
      },
      sections: [
        { key: "photo", box: { x: 6, y: 6, w: 8, h: 8 }, zIndex: 12, mask: "circle" },
        { key: "header_name_role", box: { x: 16, y: 6, w: 40, h: 8 }, zIndex: 10 },
        { key: "contact", box: { x: 6, y: 18, w: 30, h: 16 }, zIndex: 5 },
        { key: "education", box: { x: 6, y: 36, w: 30, h: 18 }, zIndex: 5 },
        { key: "skills", box: { x: 6, y: 56, w: 30, h: 40 }, zIndex: 5 },
        { key: "profile", box: { x: 38, y: 18, w: 56, h: 10 }, zIndex: 5 },
        { key: "experience", box: { x: 38, y: 30, w: 56, h: 66 }, zIndex: 5 }
      ],
      elements: [
        { type: "line", x1: 38, y1: 18, x2: 94, y2: 18, strokeWidth: 0.15, zIndex: 2 }
      ]
    },
    sectionTitles: {
      profile: "Profile",
      experience: "Work Experience",
      education: "Education",
      skills: "Skills",
      contact: "Contact"
    },
    metadata: {
      usageCount: 0,
      rating: 4.4,
      tags: ["Professional", "Engineer", "Two-Column", "Technical"]
    }
  },
  {
    name: "MonoBand",
    category: ["Minimalist", "Monochrome"],
    description: "Minimalist monochrome design with thin black band and slim left icon rail",
    thumbnail: "/api/placeholder/300/400",
    isDefault: false,
    isPremium: false,
    display: {
      layout: "two-column",
      padding: "32px",
      fontFamily: "Montserrat, sans-serif",
      sectionSpacing: "24px"
    },
    styles: {
      layout: "two-column",
      paddingX: 6,
      paddingY: 6,
      lineHeight: 1.35,
      sectionGap: 2,
      subsectionGap: 1.2,
      bulletGap: 0.5,
      titleBottomMargin: 0.8,
      highlightColor: "#000000",
      baseFontSize: 10.5,
      fontFamily: "Montserrat",
      contactAlignment: "left",
      showProfilePicture: false,
      leftColumnWidth: 32,
      itemStyle: "bar-skill",
      showSectionLine: true,
      canvas: { paperSize: "A4", orientation: "portrait", units: "percent" },
      grid: {
        header: { x: 6, y: 6, w: 88, h: 8 },
        left: { x: 6, y: 16, w: 32, h: 78 },
        right: { x: 40, y: 16, w: 54, h: 78 }
      },
      sections: [
        { key: "header_name_role", box: { x: 6, y: 6, w: 88, h: 8 }, zIndex: 10 },
        { key: "skills", box: { x: 6, y: 16, w: 32, h: 22 }, zIndex: 5 },
        { key: "award", box: { x: 6, y: 40, w: 32, h: 8 }, zIndex: 5 },
        { key: "interests", box: { x: 6, y: 50, w: 32, h: 10 }, zIndex: 5 },
        { key: "language", box: { x: 6, y: 62, w: 32, h: 8 }, zIndex: 5 },
        { key: "reference", box: { x: 6, y: 72, w: 32, h: 22 }, zIndex: 5 },
        { key: "profile", box: { x: 40, y: 16, w: 54, h: 10 }, zIndex: 5 },
        { key: "experience", box: { x: 40, y: 28, w: 54, h: 40 }, zIndex: 5 },
        { key: "education", box: { x: 40, y: 70, w: 54, h: 24 }, zIndex: 5 }
      ],
      elements: [
        { type: "rect", x: 6, y: 6, w: 1, h: 88, fill: "#000000", zIndex: 2 }
      ]
    },
    sectionTitles: {
      profile: "Profile",
      experience: "Experience",
      education: "Education",
      skills: "Skills",
      award: "Award",
      interests: "Interests",
      language: "Language",
      reference: "Reference"
    },
    metadata: {
      usageCount: 0,
      rating: 4.2,
      tags: ["Minimalist", "Monochrome", "Two-Column", "Clean"]
    }
  }
];

async function populateTemplates() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing templates...');
    await Template.deleteMany({});
    console.log('✅ Cleared existing templates');

    console.log('📝 Inserting new templates...');
    const result = await Template.insertMany(templates);
    console.log(`✅ Successfully inserted ${result.length} templates`);

    console.log('📊 Template summary:');
    result.forEach(template => {
      console.log(`  • ${template.name} (${template.category.join(', ')})`);
    });

    console.log('\n🎉 Template population completed successfully!');
  } catch (error) {
    console.error('❌ Error populating templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
populateTemplates(); 