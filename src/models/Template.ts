import mongoose, { Document, Schema } from 'mongoose';

export interface ICVSection {
  id: string;
  type: 'header' | 'section';
  title?: string;
  content?: {
    name?: string;
    contact?: string[];
    summary?: string;
  };
  entries?: Array<{
    degree?: string;
    institution?: string;
    duration?: string;
    details?: string[];
    title?: string;
    company?: string;
    organization?: string;
  }>;
  details?: string[];
  styleSnippetId: string;
}

export interface IStyleSnippet {
  id: string;
  category: string;
  style: {
    fontWeight?: string;
    fontSize?: string;
    color?: string;
    marginBottom?: string;
    titleFontSize?: string;
    entrySpacing?: string;
    bulletIndent?: string;
    entryBorderLeft?: string;
    paddingLeft?: string;
    lineSpacing?: string;
    entryHighlightColor?: string;
    titleFontWeight?: string;
    entryBackground?: string;
    padding?: string;
    columns?: number;
    fontStyle?: string;
  };
}

export interface ITemplate extends Document {
  name: string;
  category: string[];
  description: string;
  thumbnail: string;
  isDefault: boolean;
  isPremium: boolean;
  display: {
    layout: 'single-column' | 'two-column' | 'absolute';
    padding: string;
    fontFamily: string;
    sectionSpacing: string;
  };
  sections: ICVSection[];
  snippetStyles: IStyleSnippet[];
  styles: {
    layout: 'single-column' | 'two-column' | 'absolute';
    paddingX: number;
    paddingY: number;
    lineHeight: number;
    sectionGap: number;
    subsectionGap: number;
    itemSpacing: number;
    titleBottomMargin: number;
    highlightColor: string;
    showSectionLine: boolean;
    paperSize: 'A4' | 'US Letter';
    fontFamily: string;
    baseFontSize: number;
    contactAlignment: 'left' | 'center' | 'right';
    showProfilePicture: boolean;
    itemStyle: string;
    sectionTitleStyle?: object;
    leftColumnWidth?: number;
    leftColumnSections?: string[];
    rightColumnSections?: string[];
    sections?: Array<{
      key: string;
      box: { x: number; y: number; w: number; h: number };
      zIndex: number;
      mask?: string;
      styles?: object;
    }>;
    elements?: Array<{
      type: string;
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      fill?: string;
      strokeWidth?: number;
      color?: string;
      zIndex: number;
      content?: string;
      fontSize?: number;
      fontWeight?: string;
      src?: string;
      opacity?: number;
      radius?: number;
      rotation?: number;
    }>;
  };
  sectionTitles: Record<string, string>;
  metadata: {
    usageCount: number;
    rating: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}

const cvSectionSchema = new Schema<ICVSection>({
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
});

const styleSnippetSchema = new Schema<IStyleSnippet>({
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
});

const templateSchema = new Schema<ITemplate>({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  category: [{
    type: String,
    required: true,
    enum: ['ATS-Friendly', 'Professional', 'Minimalist', 'Modern', 'Two-Column', 'Photo', 'Dark', 'Timeline', 'Creative', 'Engineer', 'Single-Column', 'Sidebar', 'Colored Sidebar', 'Clean', 'Bold', 'Web Developer', 'Finance']
  }],
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
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
  sections: [cvSectionSchema],
  snippetStyles: [styleSnippetSchema],
  styles: {
    layout: {
      type: String,
      enum: ['single-column', 'two-column', 'absolute'],
      required: true
    },
    paddingX: { type: Number, default: 50 },
    paddingY: { type: Number, default: 45 },
    lineHeight: { type: Number, default: 1.35 },
    sectionGap: { type: Number, default: 10 },
    subsectionGap: { type: Number, default: 5 },
    itemSpacing: { type: Number, default: 2 },
    titleBottomMargin: { type: Number, default: 4 },
    highlightColor: { type: String, default: '#171717' },
    showSectionLine: { type: Boolean, default: true },
    paperSize: {
      type: String,
      enum: ['A4', 'US Letter'],
      default: 'A4'
    },
    fontFamily: { type: String, default: 'Arial' },
    baseFontSize: { type: Number, default: 11.5 },
    contactAlignment: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left'
    },
    showProfilePicture: { type: Boolean, default: false },
    itemStyle: { type: String, default: 'simple-list' },
    sectionTitleStyle: { type: Schema.Types.Mixed },
    leftColumnWidth: { type: Number },
    leftColumnSections: [{ type: String }],
    rightColumnSections: [{ type: String }],
    sections: [{
      key: { type: String, required: true },
      box: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        w: { type: Number, required: true },
        h: { type: Number, required: true }
      },
      zIndex: { type: Number, required: true },
      mask: { type: String },
      styles: { type: Schema.Types.Mixed }
    }],
    elements: [{
      type: { type: String, required: true },
      x: { type: Number },
      y: { type: Number },
      w: { type: Number },
      h: { type: Number },
      x1: { type: Number },
      y1: { type: Number },
      x2: { type: Number },
      y2: { type: Number },
      fill: { type: String },
      strokeWidth: { type: Number },
      color: { type: String },
      zIndex: { type: Number, required: true },
      content: { type: String },
      fontSize: { type: Number },
      fontWeight: { type: String },
      src: { type: String },
      opacity: { type: Number },
      radius: { type: Number },
      rotation: { type: Number }
    }]
  },
  sectionTitles: {
    type: Schema.Types.Mixed,
    required: true
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
templateSchema.index({ category: 1 });
templateSchema.index({ isDefault: 1 });
templateSchema.index({ isPremium: 1 });
templateSchema.index({ 'metadata.usageCount': -1 });
templateSchema.index({ 'metadata.rating': -1 });

// Update metadata on save
templateSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

export default mongoose.models.Template || mongoose.model<ITemplate>('Template', templateSchema); 