import mongoose, { Document, Schema } from 'mongoose';

export interface ICoverLetter extends Document {
  userId: mongoose.Types.ObjectId;
  cvId: mongoose.Types.ObjectId;
  jobApplicationId?: mongoose.Types.ObjectId;
  title: string;
  template: string;
  status: 'draft' | 'final' | 'archived';
  content: {
    salutation: string;
    introduction: string;
    body: string;
    conclusion: string;
    signature: string;
  };
  customization: {
    fontFamily: string;
    fontSize: string;
    lineHeight: number;
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    primaryColor: string;
    secondaryColor: string;
  };
  metadata: {
    targetCompany: string;
    targetPosition: string;
    jobUrl?: string;
    keywords: string[];
    wordCount: number;
    lastModified: Date;
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const coverLetterSchema = new Schema<ICoverLetter>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cvId: {
    type: Schema.Types.ObjectId,
    ref: 'CV',
    required: true
  },
  jobApplicationId: {
    type: Schema.Types.ObjectId,
    ref: 'JobApplication'
  },
  title: {
    type: String,
    required: [true, 'Cover letter title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  template: {
    type: String,
    required: [true, 'Template is required'],
    default: 'professional'
  },
  status: {
    type: String,
    enum: ['draft', 'final', 'archived'],
    default: 'draft'
  },
  content: {
    salutation: {
      type: String,
      required: [true, 'Salutation is required'],
      trim: true,
      maxlength: [100, 'Salutation cannot exceed 100 characters']
    },
    introduction: {
      type: String,
      required: [true, 'Introduction is required'],
      trim: true,
      maxlength: [300, 'Introduction cannot exceed 300 characters']
    },
    body: {
      type: String,
      required: [true, 'Body content is required'],
      trim: true,
      maxlength: [2000, 'Body content cannot exceed 2000 characters']
    },
    conclusion: {
      type: String,
      required: [true, 'Conclusion is required'],
      trim: true,
      maxlength: [300, 'Conclusion cannot exceed 300 characters']
    },
    signature: {
      type: String,
      required: [true, 'Signature is required'],
      trim: true,
      maxlength: [200, 'Signature cannot exceed 200 characters']
    }
  },
  customization: {
    fontFamily: {
      type: String,
      default: 'Inter',
      enum: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat']
    },
    fontSize: {
      type: String,
      default: 'medium',
      enum: ['small', 'medium', 'large']
    },
    lineHeight: {
      type: Number,
      default: 1.6,
      min: 1.2,
      max: 2.5
    },
    margins: {
      top: { type: Number, default: 1, min: 0.5, max: 2 },
      right: { type: Number, default: 1, min: 0.5, max: 2 },
      bottom: { type: Number, default: 1, min: 0.5, max: 2 },
      left: { type: Number, default: 1, min: 0.5, max: 2 }
    },
    primaryColor: {
      type: String,
      default: '#84cc16'
    },
    secondaryColor: {
      type: String,
      default: '#22c55e'
    }
  },
  metadata: {
    targetCompany: {
      type: String,
      required: [true, 'Target company is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    targetPosition: {
      type: String,
      required: [true, 'Target position is required'],
      trim: true,
      maxlength: [100, 'Position name cannot exceed 100 characters']
    },
    jobUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Job URL must be a valid URL'
      }
    },
    keywords: [{ type: String, trim: true }],
    wordCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
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
coverLetterSchema.index({ userId: 1, status: 1 });
coverLetterSchema.index({ userId: 1, createdAt: -1 });
coverLetterSchema.index({ 'metadata.targetCompany': 1 });
coverLetterSchema.index({ 'metadata.keywords': 1 });
coverLetterSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 });

// Calculate word count before saving
coverLetterSchema.pre('save', function(next) {
  const content = this.content;
  const fullText = `${content.salutation} ${content.introduction} ${content.body} ${content.conclusion} ${content.signature}`;
  this.metadata.wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
  this.metadata.lastModified = new Date();
  next();
});

// Virtual for full content
coverLetterSchema.virtual('fullContent').get(function() {
  const content = this.content;
  return `${content.salutation}\n\n${content.introduction}\n\n${content.body}\n\n${content.conclusion}\n\n${content.signature}`;
});

// Ensure virtuals are serialized
coverLetterSchema.set('toJSON', { virtuals: true });

export default mongoose.models.CoverLetter || mongoose.model<ICoverLetter>('CoverLetter', coverLetterSchema); 