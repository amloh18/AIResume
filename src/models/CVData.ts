import mongoose, { Document, Schema } from 'mongoose';

export interface ICVData extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  templateId: mongoose.Types.ObjectId;
  linkedJobId?: mongoose.Types.ObjectId;
  status: 'draft' | 'published' | 'archived';
  version: number;
  
  // CV Content Data
  personal_info: {
    name: string;
    title: string;
    phone: string;
    email: string;
    address: string;
    linkedin: string;
    photo?: string;
  };
  profile: string;
  experience: Array<{
    id: string;
    role: string;
    company: string;
    start_date: string;
    end_date: string;
    location: string;
    achievements: string[];
  }>;
  education: Array<{
    id: string;
    degree: string;
    field: string;
    institution: string;
    location: string;
    start_date: string;
    end_date: string;
    achievements: string[];
  }>;
  projects: Array<{
    id: string;
    role: string;
    company: string;
    start_date: string;
    end_date: string;
    location: string;
    achievements: string[];
  }>;
  skills: Array<{
    id: string;
    name: string;
    rating: number;
    content: string;
  }>;
  languages: Array<{
    id: string;
    name: string;
    proficiency: string;
    rating: number;
  }>;
  awards: Array<{
    id: string;
    name: string;
  }>;
  interests: Array<{
    id: string;
    name: string;
  }>;
  other_skills: Array<{
    id: string;
    name: string;
  }>;
  technical_skills: Array<{
    id: string;
    name: string;
    rating: number;
  }>;
  professional_skills: Array<{
    id: string;
    name: string;
    rating: number;
  }>;
  development_skills: Array<{
    id: string;
    name: string;
    rating: number;
  }>;
  references: Array<{
    id: string;
    name: string;
    contact: string;
  }>;
  favorite_quote: string;
  about_me: string;
  expertise: Array<{
    id: string;
    name: string;
  }>;
  experiences: Array<{
    id: string;
    role: string;
    company: string;
    start_date: string;
    end_date: string;
    achievements: string[];
  }>;
  
  // Layout and Styling
  sectionsOrder: string[];
  sectionStyles: Record<string, {
    snippetName: string;
    layout: string;
  }>;
  
  // Template Styles (copied from template for versioning)
  templateStyles: {
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
  
  // Metadata
  metadata: {
    lastModified: Date;
    createdFrom?: mongoose.Types.ObjectId;
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    aiSuggestions: Array<{
      type: 'rewrite' | 'optimize' | 'suggestion';
      section: string;
      content: string;
      timestamp: Date;
      applied: boolean;
    }>;
    versions: Array<{
      version: number;
      timestamp: Date;
      description: string;
      data: object;
    }>;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const cvDataSchema = new Schema<ICVData>({
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
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  linkedJobId: {
    type: Schema.Types.ObjectId,
    ref: 'JobApplication'
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
  
  // CV Content Data
  personal_info: {
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    photo: { type: String }
  },
  profile: { type: String, trim: true },
  experience: [{
    id: { type: String, required: true },
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    location: { type: String, trim: true },
    achievements: [{ type: String, trim: true }]
  }],
  education: [{
    id: { type: String, required: true },
    degree: { type: String, required: true, trim: true },
    field: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    achievements: [{ type: String, trim: true }]
  }],
  projects: [{
    id: { type: String, required: true },
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    location: { type: String, trim: true },
    achievements: [{ type: String, trim: true }]
  }],
  skills: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5 },
    content: { type: String, trim: true }
  }],
  languages: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    proficiency: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5 }
  }],
  awards: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true }
  }],
  interests: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true }
  }],
  other_skills: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true }
  }],
  technical_skills: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5 }
  }],
  professional_skills: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5 }
  }],
  development_skills: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5 }
  }],
  references: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true }
  }],
  favorite_quote: { type: String, trim: true },
  about_me: { type: String, trim: true },
  expertise: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true }
  }],
  experiences: [{
    id: { type: String, required: true },
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    achievements: [{ type: String, trim: true }]
  }],
  
  // Layout and Styling
  sectionsOrder: [{ type: String }],
  sectionStyles: { type: Schema.Types.Mixed },
  
  // Template Styles
  templateStyles: {
    layout: {
      type: String,
      enum: ['single-column', 'two-column', 'absolute'],
      required: true
    },
    paddingX: { type: Number, default: 96 }, // 1-inch margins (96px = 1 inch at 96 DPI)
    paddingY: { type: Number, default: 96 }, // 1-inch margins
    lineHeight: { type: Number, default: 1.0 }, // 1.0 line spacing for better readability
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
    fontFamily: { type: String, default: 'Arial, sans-serif' },
    baseFontSize: { type: Number, default: 11 }, // 10-12pt body text (11pt = 10pt at 96 DPI)
    nameFontSize: { type: Number, default: 20 }, // 18-22pt for name (20pt = 18pt at 96 DPI)
    sectionTitleFontSize: { type: Number, default: 15 }, // 14-16pt for section headings (15pt = 14pt at 96 DPI)
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
  
  // Metadata
  metadata: {
    lastModified: { type: Date, default: Date.now },
    createdFrom: { type: Schema.Types.ObjectId, ref: 'CVData' },
    tags: [{ type: String, trim: true }],
    isPublic: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    aiSuggestions: [{
      type: {
        type: String,
        enum: ['rewrite', 'optimize', 'suggestion'],
        required: true
      },
      section: { type: String, required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      applied: { type: Boolean, default: false }
    }],
    versions: [{
      version: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now },
      description: { type: String, required: true },
      data: { type: Schema.Types.Mixed, required: true }
    }]
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
cvDataSchema.index({ userId: 1, status: 1 });
cvDataSchema.index({ userId: 1, createdAt: -1 });
cvDataSchema.index({ linkedJobId: 1 });
cvDataSchema.index({ 'metadata.tags': 1 });
cvDataSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 });

// Update lastModified on save
cvDataSchema.pre('save', function(next) {
  this.metadata.lastModified = new Date();
  next();
});

export default mongoose.models.CVData || mongoose.model<ICVData>('CVData', cvDataSchema); 