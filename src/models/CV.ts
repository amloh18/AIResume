import mongoose, { Document, Schema } from 'mongoose';
import { UnifiedCVDataStructure, UnifiedCVDocument } from '@/types/unified-cv-schema';

export interface ICV extends Document {
  userId: mongoose.Types.ObjectId; // MongoDB ObjectId linking to User collection
  title: string;
  cvData: UnifiedCVDataStructure; // Using unified schema
  templateId: mongoose.Types.ObjectId; // Reference to Template collection
  journeyId?: mongoose.Types.ObjectId; // Optional link to an application journey
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    isMaster: boolean; // A boolean to mark a user's primary CV
    lastModified: Date;
    createdFrom?: mongoose.Types.ObjectId; // Reference to source CV if duplicated
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    atsScore?: number;
    atsScoreDate?: Date;
    thumbnailUrl?: string; // URL to PNG snapshot for card preview
    thumbnailGeneratedAt?: Date; // When the thumbnail was last generated
    starred: boolean;
    aiAnalysis?: any; // AI career analysis data
    createdVia?: string; // How the CV was created (e.g., 'ai-career-report', 'manual')
  };
}

const cvSchema = new Schema<ICV>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'CV title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  templateId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and String for hardcoded templates
    ref: 'Template',
    required: true
  },
  journeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApplicationJourney',
    required: false
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
  cvData: {
    // Structure and Content Map (new architecture) - Optional for backward compatibility
    structure: {
      type: Schema.Types.Mixed, // Use Mixed to allow flexible structure
      required: false
    },
    content: { 
      type: Schema.Types.Mixed, 
      required: false 
    }, // Content map keyed by section IDs
    templateId: { 
      type: Schema.Types.Mixed, 
      required: false 
    }, // Template ID for structure initialization
    
    // Legacy arrays kept for backward compatibility during migration
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
      courses: [{ type: String }],  // Optional field
      description: { type: String }
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
      url: { type: String },
      description: { type: String }
    }],
    publications: [{
      name: { type: String },
      publisher: { type: String },
      releaseDate: { type: String },
      url: { type: String },
      summary: { type: String }
    }],
    skills: [{
      category: { type: String },
      skills: [{ type: String }]
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
      highlights: [{ type: String }],  // Optional field
      keywords: [{ type: String }],
      url: { type: String }
    }]
  },
  metadata: {
    isMaster: { type: Boolean, default: false },
    lastModified: { type: Date, default: Date.now },
    createdFrom: { type: Schema.Types.ObjectId, ref: 'CV' },
    tags: [{ type: String, trim: true }],
    isPublic: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    atsScore: { type: Number, min: 0, max: 100 },
    atsScoreDate: { type: Date },
    thumbnailUrl: { type: String, trim: true },
    thumbnailGeneratedAt: { type: Date },
    starred: { type: Boolean, default: false },
    aiAnalysis: { type: Schema.Types.Mixed },
    createdVia: { type: String, trim: true }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
cvSchema.index({ userId: 1, createdAt: -1 }); // User's CVs by date
cvSchema.index({ userId: 1, 'metadata.isMaster': 1 }); // Index for master CV queries
cvSchema.index({ journeyId: 1, userId: 1 }); // Unique CV per journey (prevents duplicates)
cvSchema.index({ templateId: 1 }); // Index for template-based queries
cvSchema.index({ 'metadata.tags': 1 }); // Tag-based searches
cvSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 }); // Public CVs

// Update lastModified on save and ensure only one master CV per user
cvSchema.pre('save', async function(next) {
  this.metadata.lastModified = new Date();
  
    // If this CV is being set as master, unset any existing master CV for this user
    if (this.metadata.isMaster && (this.isModified('metadata.isMaster') || this.isNew)) {
      const CVModel = this.constructor as any;
      await CVModel.updateMany(
        { userId: this.userId, _id: { $ne: this._id } },
        { $set: { 'metadata.isMaster': false } }
      );
    }
  
  next();
});

export default mongoose.models.CV || mongoose.model<ICV>('CV', cvSchema);
