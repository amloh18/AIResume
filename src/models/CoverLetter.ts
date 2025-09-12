import mongoose, { Document, Schema } from 'mongoose';

export interface ICoverLetter extends Document {
  userId: string;
  title: string;
  content: string;
  status: 'draft' | 'final' | 'archived';
  // cvId and jobId removed - relationships now managed through CVJourney
  metadata: {
    targetCompany?: string;
    targetPosition?: string;
    keywords?: string[];
    wordCount?: number;
    isPublic?: boolean;
    lastModified?: Date;
    version?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const coverLetterSchema = new Schema<ICoverLetter>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'final', 'archived'],
    default: 'draft',
    index: true
  },
  // cvId and jobId removed - relationships now managed through CVJourney
  metadata: {
    targetCompany: {
      type: String,
      trim: true
    },
    targetPosition: {
      type: String,
      trim: true
    },
    keywords: [{
      type: String,
      trim: true
    }],
    wordCount: {
      type: Number,
      default: 0
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  collection: 'coverletters'
});

// Indexes for better query performance
coverLetterSchema.index({ userId: 1, status: 1 });
coverLetterSchema.index({ userId: 1, createdAt: -1 });
coverLetterSchema.index({ 'metadata.targetCompany': 1 });
coverLetterSchema.index({ 'metadata.keywords': 1 });
coverLetterSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 });

// Pre-save middleware to update word count
coverLetterSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.metadata.wordCount = this.content.split(/\s+/).length;
    this.metadata.lastModified = new Date();
    this.metadata.version = (this.metadata.version || 0) + 1;
  }
  next();
});

// Virtual for formatted creation date
coverLetterSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Virtual for formatted last modified date
coverLetterSchema.virtual('formattedLastModified').get(function() {
  return this.metadata.lastModified?.toLocaleDateString() || this.formattedCreatedAt;
});

// Ensure virtuals are serialized
coverLetterSchema.set('toJSON', { virtuals: true });
coverLetterSchema.set('toObject', { virtuals: true });

const CoverLetter = mongoose.models.CoverLetter || mongoose.model<ICoverLetter>('CoverLetter', coverLetterSchema);

export default CoverLetter;
