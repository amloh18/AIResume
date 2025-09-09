import mongoose, { Document, Schema } from 'mongoose';
import { CVDataStructure } from '@/types/cv';

export interface ICV extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  cvData: CVDataStructure;
  status: 'draft' | 'published' | 'archived';
  version: number;
  isMaster: boolean; // Master CV flag
  // Legacy fields for backward compatibility
  template?: string;
  sections?: {
    personalInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      location?: string;
      website?: string;
      linkedin?: string;
      github?: string;
      summary: string;
    };
    experience: Array<{
      company: string;
      position: string;
      location?: string;
      startDate: Date;
      endDate?: Date;
      current: boolean;
      description: string;
      achievements: string[];
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      location?: string;
      startDate: Date;
      endDate?: Date;
      current: boolean;
      gpa?: number;
      description?: string;
    }>;
    skills: Array<{
      category: string;
      skills: string[];
    }>;
    projects: Array<{
      title: string;
      description: string;
      technologies: string[];
      url?: string;
      github?: string;
      startDate?: Date;
      endDate?: Date;
      current: boolean;
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      date: Date;
      expiryDate?: Date;
      url?: string;
    }>;
    languages: Array<{
      language: string;
      proficiency: 'basic' | 'intermediate' | 'advanced' | 'native';
    }>;
    customSections: Array<{
      title: string;
      content: string;
      order: number;
    }>;
  };
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: string;
    spacing: number;
    customCSS?: string;
  };
  metadata: {
    lastModified: Date;
    createdFrom?: mongoose.Types.ObjectId;
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    atsScore?: number;
    atsScoreDate?: Date;
    atsScoreJobId?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const cvSchema = new Schema<ICV>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'CV title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'Template'
  },
  templateName: {
    type: String,
    trim: true
  },
  templateData: {
    display: {
      layout: {
        type: String,
        enum: ['single-column', 'two-column', 'absolute'],
        default: 'single-column'
      },
      padding: { type: String, default: '32px' },
      fontFamily: { type: String, default: 'Segoe UI, Roboto, sans-serif' },
      sectionSpacing: { type: String, default: '24px' }
    },
    sections: [{
      id: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['header', 'section'], 
        required: true 
      },
      title: { type: String },
      content: {
        name: { type: String },
        contact: [{ type: String }],
        summary: { type: String }
      },
      entries: [{
        degree: { type: String },
        institution: { type: String },
        duration: { type: String },
        details: [{ type: String }],
        title: { type: String },
        company: { type: String },
        organization: { type: String }
      }],
      details: [{ type: String }],
      styleSnippetId: { type: String, required: true }
    }],
    snippetStyles: [{
      id: { type: String, required: true },
      category: { type: String, required: true },
      style: {
        fontWeight: { type: String },
        fontSize: { type: String },
        color: { type: String },
        marginBottom: { type: String },
        titleFontSize: { type: String },
        entrySpacing: { type: String },
        bulletIndent: { type: String },
        entryBorderLeft: { type: String },
        paddingLeft: { type: String },
        lineSpacing: { type: String },
        entryHighlightColor: { type: String },
        titleFontWeight: { type: String },
        entryBackground: { type: String },
        padding: { type: String },
        columns: { type: Number },
        fontStyle: { type: String }
      }
    }]
  },
  cvData: {
    basics: {
      name: { type: String, default: '' },
      label: { type: String, default: '' },
      image: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      url: { type: String, default: '' },
      summary: { type: String, default: '' },
      location: {
        address: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        city: { type: String, default: '' },
        countryCode: { type: String, default: '' },
        region: { type: String, default: '' }
      },
      profiles: [{
        network: { type: String },
        username: { type: String },
        url: { type: String }
      }]
    },
    work: [{
      name: { type: String },
      position: { type: String },
      url: { type: String },
      startDate: { type: String },
      endDate: { type: String },
      summary: { type: String },
      highlights: [{ type: String }]
    }],
    volunteer: [{
      organization: { type: String },
      position: { type: String },
      url: { type: String },
      startDate: { type: String },
      endDate: { type: String },
      summary: { type: String },
      highlights: [{ type: String }]
    }],
    education: [{
      institution: { type: String },
      url: { type: String },
      area: { type: String },
      studyType: { type: String },
      startDate: { type: String },
      endDate: { type: String },
      score: { type: String },
      courses: [{ type: String }]
    }],
    awards: [{
      title: { type: String },
      date: { type: String },
      awarder: { type: String },
      summary: { type: String }
    }],
    certificates: [{
      name: { type: String },
      date: { type: String },
      issuer: { type: String },
      url: { type: String }
    }],
    publications: [{
      name: { type: String },
      publisher: { type: String },
      releaseDate: { type: String },
      url: { type: String },
      summary: { type: String }
    }],
    skills: [{
      name: { type: String },
      level: { type: String },
      keywords: [{ type: String }]
    }],
    languages: [{
      language: { type: String },
      fluency: { type: String }
    }],
    interests: [{
      name: { type: String },
      keywords: [{ type: String }]
    }],
    references: [{
      name: { type: String },
      reference: { type: String }
    }],
    projects: [{
      name: { type: String },
      startDate: { type: String },
      endDate: { type: String },
      description: { type: String },
      highlights: [{ type: String }],
      url: { type: String }
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  version: {
    type: Number,
    default: 1
  },
  isMaster: {
    type: Boolean,
    default: false
  },
  // Legacy fields for backward compatibility
  template: {
    type: String,
    default: 'modern'
  },
  sections: {
    personalInfo: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
      website: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      summary: { type: String, trim: true, maxlength: 500 }
    },
    experience: [{
      company: { type: String, trim: true },
      position: { type: String, trim: true },
      location: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      current: { type: Boolean, default: false },
      description: { type: String, trim: true },
      achievements: [{ type: String, trim: true }]
    }],
    education: [{
      institution: { type: String, trim: true },
      degree: { type: String, trim: true },
      field: { type: String, trim: true },
      location: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      current: { type: Boolean, default: false },
      gpa: { type: Number, min: 0, max: 4 },
      description: { type: String, trim: true }
    }],
    skills: [{
      category: { type: String, trim: true },
      skills: [{ type: String, trim: true }]
    }],
    projects: [{
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      technologies: [{ type: String, trim: true }],
      url: { type: String, trim: true },
      github: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      current: { type: Boolean, default: false }
    }],
    certifications: [{
      name: { type: String, trim: true },
      issuer: { type: String, trim: true },
      date: { type: Date },
      expiryDate: { type: Date },
      url: { type: String, trim: true }
    }],
    languages: [{
      language: { type: String, trim: true },
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'native']
      }
    }],
    customSections: [{
      title: { type: String, trim: true },
      content: { type: String, trim: true },
      order: { type: Number }
    }]
  },
  styling: {
    primaryColor: { type: String, default: '#84cc16' },
    secondaryColor: { type: String, default: '#22c55e' },
    fontFamily: { type: String, default: 'Inter' },
    fontSize: { type: String, default: 'medium' },
    spacing: { type: Number, default: 1.5, min: 0.5, max: 3 },
    customCSS: { type: String, trim: true }
  },
  metadata: {
    lastModified: { type: Date, default: Date.now },
    createdFrom: { type: Schema.Types.ObjectId, ref: 'CV' },
    tags: [{ type: String, trim: true }],
    isPublic: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    atsScore: { type: Number, min: 0, max: 100 },
    atsScoreDate: { type: Date },
    atsScoreJobId: { type: Schema.Types.ObjectId, ref: 'JobApplication' }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
cvSchema.index({ userId: 1, status: 1 });
cvSchema.index({ userId: 1, createdAt: -1 });
cvSchema.index({ userId: 1, isMaster: 1 }); // Index for master CV queries
cvSchema.index({ 'metadata.tags': 1 });
cvSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 });
cvSchema.index({ templateId: 1 });

// Update lastModified on save and ensure only one master CV per user
cvSchema.pre('save', async function(next) {
  this.metadata.lastModified = new Date();
  
  // If this CV is being set as master, unset any existing master CV for this user
  if (this.isMaster && this.isModified('isMaster')) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isMaster: false } }
    );
  }
  
  next();
});

export default mongoose.models.CV || mongoose.model<ICV>('CV', cvSchema); 