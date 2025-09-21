import mongoose, { Document, Schema } from 'mongoose';

// Defines a single "building block" that a user can add to their document
export interface ISectionBlueprint {
  key: string; // Unique key for this section type, e.g., "text_section" or "experience_list"
  displayName: string; // Name shown to user in UI, e.g., "Professional Summary"
  componentName: string; // Frontend React component to use for rendering, e.g., "ExperienceSection"
  isList: boolean; // If true, can contain multiple items; if false, single content block
  defaultItemContent: any; // Default JSON structure for new items in this section
  description?: string; // Optional description for the UI
  icon?: string; // Optional icon identifier for the UI
  category?: string; // Optional category for grouping in UI
  maxItems?: number; // Optional maximum number of items allowed
  minItems?: number; // Optional minimum number of items required
}

// Template interface
export interface ITemplate extends Document {
  name: string;
  description?: string;
  thumbnail?: string;
  category: 'cv' | 'portfolio' | 'cover-letter' | 'resume' | 'custom';
  categories?: string[]; // Multiple categories like 'Creative', 'Professional', 'Modern'
  tier: 'free' | 'premium';
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontSize: string;
    lineHeight: string;
    spacing: string;
    borderRadius: string;
    boxShadow: string;
    customCSS?: string;
  };
  availableSections: ISectionBlueprint[];
  templateData?: any; // Sample data for preview
  isActive: boolean;
  isDefault: boolean;
  isPublished: boolean;
  globalAccess: boolean; // Whether template is available to all users
  version: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Section Blueprint Schema
const SectionBlueprintSchema = new Schema<ISectionBlueprint>({
  key: { 
    type: String, 
    required: true,
    trim: true
  },
  displayName: { 
    type: String, 
    required: true,
    trim: true
  },
  componentName: { 
    type: String, 
    required: true,
    trim: true
  },
  isList: { 
    type: Boolean, 
    default: false 
  },
  defaultItemContent: { 
    type: Schema.Types.Mixed, 
    default: {} 
  },
  description: { 
    type: String, 
    trim: true 
  },
  icon: { 
    type: String, 
    trim: true 
  },
  category: { 
    type: String, 
    trim: true 
  },
  maxItems: { 
    type: Number, 
    min: 1 
  },
  minItems: { 
    type: Number, 
    min: 0 
  }
});

// Template Schema
const templateSchema = new Schema<ITemplate>({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  thumbnail: { 
    type: String, 
    trim: true 
  },
  category: { 
    type: String, 
    enum: ['cv', 'portfolio', 'cover-letter', 'resume', 'custom'],
    default: 'cv'
  },
  categories: [{
    type: String,
    enum: ['Creative', 'Professional', 'Modern']
  }],
  tier: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  globalStyles: {
    fontFamily: { 
      type: String, 
      default: 'Inter, system-ui, sans-serif' 
    },
    primaryColor: { 
      type: String, 
      default: '#2563eb' 
    },
    secondaryColor: { 
      type: String, 
      default: '#64748b' 
    },
    backgroundColor: { 
      type: String, 
      default: '#ffffff' 
    },
    fontSize: { 
      type: String, 
      default: '14px' 
    },
    lineHeight: { 
      type: String, 
      default: '1.6' 
    },
    spacing: { 
      type: String, 
      default: '24px' 
    },
    borderRadius: { 
      type: String, 
      default: '8px' 
    },
    boxShadow: { 
      type: String, 
      default: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
    },
    customCSS: { 
      type: String, 
      trim: true 
    }
  },
  availableSections: [SectionBlueprintSchema],
  templateData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  globalAccess: {
    type: Boolean,
    default: true
  },
  version: { 
    type: Number, 
    default: 1 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
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
templateSchema.index({ category: 1, isActive: 1 });
templateSchema.index({ isDefault: 1 });
templateSchema.index({ createdBy: 1 });
templateSchema.index({ 'availableSections.key': 1 });

// Ensure only one default template per category
templateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('Template').updateMany(
      { 
        category: this.category, 
        _id: { $ne: this._id } 
      },
      { isDefault: false }
    );
  }
  next();
});

// Export the schema for use in admin models
export { templateSchema };

export default mongoose.models.Template || mongoose.model<ITemplate>('Template', templateSchema); 