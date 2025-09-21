import mongoose, { Document, Schema } from 'mongoose';

export interface ICoverLetter extends Document {
  userId: mongoose.Types.ObjectId; // ObjectId, references the User schema
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    lastModified: Date;
    wordCount: number;
    characterCount: number;
    estimatedReadingTime: number; // in minutes
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    atsScore?: number;
    atsScoreDate?: Date;
  };
}

const coverLetterSchema = new Schema<ICoverLetter>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Cover letter title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Cover letter content is required'],
    trim: true,
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  metadata: {
    lastModified: {
      type: Date,
      default: Date.now
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0
    },
    characterCount: {
      type: Number,
      default: 0,
      min: 0
    },
    estimatedReadingTime: {
      type: Number,
      default: 0,
      min: 0
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    isPublic: {
      type: Boolean,
      default: false
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    atsScore: {
      type: Number,
      min: 0,
      max: 100
    },
    atsScoreDate: {
      type: Date
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

// Indexes for efficient queries
coverLetterSchema.index({ userId: 1, createdAt: -1 }); // User's cover letters by date
coverLetterSchema.index({ 'metadata.tags': 1 }); // Tag-based searches
coverLetterSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 }); // Public cover letters

// Pre-save middleware to update metadata
coverLetterSchema.pre('save', function(next) {
  // Update lastModified
  this.metadata.lastModified = new Date();
  
  // Calculate word and character count
  if (this.content) {
    this.metadata.characterCount = this.content.length;
    this.metadata.wordCount = this.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Estimate reading time (average 200 words per minute)
    this.metadata.estimatedReadingTime = Math.ceil(this.metadata.wordCount / 200);
  }
  
  next();
});

export default mongoose.models.CoverLetter || mongoose.model<ICoverLetter>('CoverLetter', coverLetterSchema);