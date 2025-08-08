import mongoose, { Document, Schema } from 'mongoose';

// Represents one user-added section in the final document
export interface ISectionContent {
  sectionKey: string; // Links back to the 'key' in the template's 'availableSections'
  styles?: any; // Override template's global styles for this specific section
  items: any[]; // Array of items - if isList=false, this will only have one element
  order?: number; // Optional explicit ordering
  isVisible?: boolean; // Optional visibility toggle
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: mongoose.Types.ObjectId;
  };
}

// Document interface
export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  content: ISectionContent[]; // Ordered array of sections
  status: 'draft' | 'published' | 'archived';
  version: number;
  metadata: {
    lastModified: Date;
    createdFrom?: mongoose.Types.ObjectId;
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    shareToken?: string;
    expiresAt?: Date;
  };
  settings: {
    allowComments: boolean;
    allowDownloads: boolean;
    password?: string;
    customDomain?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Section Content Schema
const SectionContentSchema = new Schema<ISectionContent>({
  sectionKey: { 
    type: String, 
    required: true,
    trim: true
  },
  styles: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  items: [{ 
    type: Schema.Types.Mixed,
    required: true
  }],
  order: { 
    type: Number, 
    default: 0 
  },
  isVisible: { 
    type: Boolean, 
    default: true 
  },
  metadata: {
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }
  }
});

// Document Schema
const documentSchema = new Schema<IDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'Template',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  content: [SectionContentSchema],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  version: {
    type: Number,
    default: 1
  },
  metadata: {
    lastModified: { 
      type: Date, 
      default: Date.now 
    },
    createdFrom: { 
      type: Schema.Types.ObjectId, 
      ref: 'Document' 
    },
    tags: [{ 
      type: String, 
      trim: true 
    }],
    isPublic: { 
      type: Boolean, 
      default: false 
    },
    viewCount: { 
      type: Number, 
      default: 0 
    },
    downloadCount: { 
      type: Number, 
      default: 0 
    },
    shareToken: { 
      type: String, 
      trim: true 
    },
    expiresAt: { 
      type: Date 
    }
  },
  settings: {
    allowComments: { 
      type: Boolean, 
      default: false 
    },
    allowDownloads: { 
      type: Boolean, 
      default: true 
    },
    password: { 
      type: String, 
      trim: true 
    },
    customDomain: { 
      type: String, 
      trim: true 
    }
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
documentSchema.index({ userId: 1, status: 1 });
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ templateId: 1, status: 1 });
documentSchema.index({ 'metadata.tags': 1 });
documentSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 });
documentSchema.index({ 'metadata.shareToken': 1 });
documentSchema.index({ 'metadata.expiresAt': 1 }, { expireAfterSeconds: 0 });

// Update lastModified and section metadata on save
documentSchema.pre('save', function(next) {
  this.metadata.lastModified = new Date();
  
  // Update section metadata
  if (this.content) {
    this.content.forEach((section, index) => {
      if (!section.metadata) {
        section.metadata = {
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        section.metadata.updatedAt = new Date();
      }
      
      // Set order if not provided
      if (section.order === undefined) {
        section.order = index;
      }
    });
  }
  
  next();
});

// Generate share token if not exists
documentSchema.pre('save', function(next) {
  if (this.metadata.isPublic && !this.metadata.shareToken) {
    this.metadata.shareToken = Math.random().toString(36).substring(2, 15) + 
                               Math.random().toString(36).substring(2, 15);
  }
  next();
});

// Virtual for getting template
documentSchema.virtual('template', {
  ref: 'Template',
  localField: 'templateId',
  foreignField: '_id',
  justOne: true
});

// Virtual for getting user
documentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON output
documentSchema.set('toJSON', { virtuals: true });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema); 