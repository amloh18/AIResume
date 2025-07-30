import mongoose, { Document, Schema } from 'mongoose';
import { ICVSection, IStyleSnippet } from './Template';

export interface ICV extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  templateId?: mongoose.Types.ObjectId; // Reference to Template model
  templateName?: string; // Name of the template (e.g., "ATS Friendly Finance CV")
  templateData?: {
    display: {
      layout: 'single-column' | 'two-column' | 'absolute';
      padding: string;
      fontFamily: string;
      sectionSpacing: string;
    };
    sections: ICVSection[];
    snippetStyles: IStyleSnippet[];
  };
  cvData: {
    personal_info?: {
      name?: string;
      contact0?: string;
      contact1?: string;
      contact2?: string;
      summary?: string;
    };
    education?: Record<string, any>;
    experience?: Record<string, any>;
    leadership?: Record<string, any>;
    project?: Record<string, any>;
    skills?: Record<string, any>;
    [key: string]: any; // Allow for dynamic section data
  };
  status: 'draft' | 'published' | 'archived';
  version: number;
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
    type: Schema.Types.Mixed,
    default: {}
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
    downloadCount: { type: Number, default: 0 }
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
cvSchema.index({ 'metadata.tags': 1 });
cvSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 });
cvSchema.index({ templateId: 1 });

// Update lastModified on save
cvSchema.pre('save', function(next) {
  this.metadata.lastModified = new Date();
  next();
});

export default mongoose.models.CV || mongoose.model<ICV>('CV', cvSchema); 