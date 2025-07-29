import mongoose, { Document, Schema } from 'mongoose';

export interface ICV extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  template: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  sections: {
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
  template: {
    type: String,
    required: [true, 'Template is required'],
    default: 'modern'
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
  sections: {
    personalInfo: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
      website: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      summary: { type: String, required: true, trim: true, maxlength: 500 }
    },
    experience: [{
      company: { type: String, required: true, trim: true },
      position: { type: String, required: true, trim: true },
      location: { type: String, trim: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      current: { type: Boolean, default: false },
      description: { type: String, required: true, trim: true },
      achievements: [{ type: String, trim: true }]
    }],
    education: [{
      institution: { type: String, required: true, trim: true },
      degree: { type: String, required: true, trim: true },
      field: { type: String, required: true, trim: true },
      location: { type: String, trim: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      current: { type: Boolean, default: false },
      gpa: { type: Number, min: 0, max: 4 },
      description: { type: String, trim: true }
    }],
    skills: [{
      category: { type: String, required: true, trim: true },
      skills: [{ type: String, trim: true }]
    }],
    projects: [{
      title: { type: String, required: true, trim: true },
      description: { type: String, required: true, trim: true },
      technologies: [{ type: String, trim: true }],
      url: { type: String, trim: true },
      github: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      current: { type: Boolean, default: false }
    }],
    certifications: [{
      name: { type: String, required: true, trim: true },
      issuer: { type: String, required: true, trim: true },
      date: { type: Date, required: true },
      expiryDate: { type: Date },
      url: { type: String, trim: true }
    }],
    languages: [{
      language: { type: String, required: true, trim: true },
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'native'],
        required: true
      }
    }],
    customSections: [{
      title: { type: String, required: true, trim: true },
      content: { type: String, required: true, trim: true },
      order: { type: Number, required: true }
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

// Update lastModified on save
cvSchema.pre('save', function(next) {
  this.metadata.lastModified = new Date();
  next();
});

export default mongoose.models.CV || mongoose.model<ICV>('CV', cvSchema); 