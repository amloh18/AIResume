import mongoose, { Document, Schema } from 'mongoose';
import { CVDataStructure } from '@/types/cv';

export interface ICV extends Document {
  userId: mongoose.Types.ObjectId | string;
  firebaseUid?: string; // Firebase UID for user identification
  title: string;
  cvData: CVDataStructure;
  status: 'draft' | 'published' | 'archived';
  version: number;
  isMaster: boolean; // Master CV flag
  journeyId?: mongoose.Types.ObjectId | string; // Links tailored CV to specific CV Journey (Application Package)
  // Legacy fields for backward compatibility
  template?: string;
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
    thumbnailUrl?: string; // URL to PNG snapshot for card preview
    thumbnailGeneratedAt?: Date; // When the thumbnail was last generated
  };
  createdAt: Date;
  updatedAt: Date;
}

const cvSchema = new Schema<ICV>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: true,
    index: true
  },
  firebaseUid: {
    type: String,
    sparse: true, // Allows multiple null values
    index: true // Index for efficient Firebase UID queries
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
  journeyId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    index: true, // Index for efficient journey-based queries
    default: null // null means CV is freestanding (not part of an application package)
  },
  // Legacy fields for backward compatibility
  template: {
    type: String,
    default: 'modern'
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
    atsScoreJobId: { type: Schema.Types.ObjectId, ref: 'JobApplication' },
    thumbnailUrl: { type: String, trim: true },
    thumbnailGeneratedAt: { type: Date }
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
  if (this.isMaster && (this.isModified('isMaster') || this.isNew)) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isMaster: false } }
    );
  }
  
  // Enforce Application Package Model constraints:
  // 1. Master CVs cannot have journeyId (they are templates)
  if (this.isMaster && this.journeyId) {
    throw new Error('Master CVs cannot be linked to a journey. Master CVs must remain as templates.');
  }
  
  // 2. Tailored CVs with journeyId cannot be changed to master
  if (this.journeyId && this.isMaster) {
    throw new Error('A CV linked to a journey cannot be set as master. Tailored CVs belong to specific application packages.');
  }
  
  next();
});

export default mongoose.models.CV || mongoose.model<ICV>('CV', cvSchema); 