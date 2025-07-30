import mongoose, { Document, Schema } from 'mongoose';

export interface ISnippet extends Document {
  name: string;
  sectionKey: string;
  description: string;
  size: 'wide' | 'tall' | 'square';
  defaultLayout: string;
  layouts: Record<string, object>;
  thumbnail: string;
  isDefault: boolean;
  isPremium: boolean;
  metadata: {
    usageCount: number;
    rating: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}

const snippetSchema = new Schema<ISnippet>({
  name: {
    type: String,
    required: [true, 'Snippet name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  sectionKey: {
    type: String,
    required: [true, 'Section key is required'],
    enum: ['personal_info', 'profile', 'experience', 'education', 'skills', 'languages', 'awards', 'interests', 'projects', 'references', 'about_me', 'expertise', 'experiences', 'favorite_quote', 'technical_skills', 'professional_skills', 'development_skills', 'other_skills']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  size: {
    type: String,
    enum: ['wide', 'tall', 'square'],
    default: 'wide'
  },
  defaultLayout: {
    type: String,
    required: true
  },
  layouts: {
    type: Schema.Types.Mixed,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  metadata: {
    usageCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    tags: [{ type: String, trim: true }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
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
snippetSchema.index({ sectionKey: 1 });
snippetSchema.index({ isDefault: 1 });
snippetSchema.index({ isPremium: 1 });
snippetSchema.index({ 'metadata.usageCount': -1 });
snippetSchema.index({ 'metadata.rating': -1 });

// Update metadata on save
snippetSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

export default mongoose.models.Snippet || mongoose.model<ISnippet>('Snippet', snippetSchema); 