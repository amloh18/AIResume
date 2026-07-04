import mongoose, { Document, Schema } from 'mongoose';
import { UnifiedCVDataStructure, UnifiedCVDocument } from '@/types/unified-cv-schema';
import { EnhancedResumeJSON } from '@/types/enhanced-resume-schema';

export interface ICV extends Document {
  userId: mongoose.Types.ObjectId; // MongoDB ObjectId linking to User collection
  tenantId?: mongoose.Types.ObjectId; // B2B Tenant ID for isolation
  title: string;
  cvData: UnifiedCVDataStructure; // Using unified schema (legacy)
  resumeData?: EnhancedResumeJSON; // NEW: Enhanced resume data with unique IDs
  templateId: mongoose.Types.ObjectId; // Reference to Template collection
  templateName?: string; // Template name for quick access
  templateData?: any; // Full template data stored for S3 backup and faster access
  journeyId?: mongoose.Types.ObjectId; // Optional link to an application journey
  cvType: 'master' | 'journey' | 'standalone'; // NEW: Type of CV for Resume Enhancer
  status: 'draft' | 'published' | 'archived';

  // V2: Three-Layer Architecture Fields
  schemaVersion: 1 | 2; // 1 = legacy (cvData), 2 = new (slotBindings + snippets)
  slotBindings?: Array<{ slotId: string; snippetId: string; order: number; visible: boolean }>;
  styleOverrides?: Record<string, any>;

  // Central Score Manager Fields
  cv_score_master?: number; // Structural + Industry (Local)
  cv_score_ats?: number; // Master + Semantic + Keyword Match (Journey)
  score_breakdown?: {
    structural: number;
    industry: number;
    semantic: number;
  };
  active_issues_json?: any[]; // Cached issues for instant load

  // Document state for limit enforcement (Vault View)
  documentState: 'editable' | 'frozen' | 'read-only';
  frozenAt?: Date; // Timestamp when document was frozen
  frozenReason?: 'plan_downgrade' | 'limit_exceeded' | 'pass_expired' | 'premium_template_restriction';
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    isMaster: boolean; // A boolean to mark a user's primary CV (kept for backward compatibility)
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
    // Resume Enhancer Career Ecosystem fields
    atsScoreCap?: number; // Max ATS score based on template (null = 100, creative = 70)
    parentMasterId?: mongoose.Types.ObjectId; // For Standalone CVs forked from Master
    isUserMaster?: boolean; // Definitive flag for THE Master CV (single per user)
    fresherMode?: boolean; // Education/Projects first layout (no work experience)
    // Canvas Layout Engine fields
    canvasDesign?: any;
    canvasTemplate?: any;
    canvasZones?: any;
    canvasTemplatesZones?: any;
    canvasTemplatesDesign?: any;
    // Analysis Snapshot for Onboarding & Dashboard
    analysisSnapshot?: {
      healthIndex: number;
      atsReadability: number;
      keywordCoverage: number;
      impactScore: number;
      strengths: string[];
      weaknesses: string[];
      generatedAt: Date;
    };
    // CV Surgeon Analysis Cache
    surgeonAnalysis?: {
      score: number;
      fixes: any[];
      annotations: any[];
      targetRole: string;
      seniorityLevel: string;
      analyzedAt: Date;
      contentHash: string; // Hash of CV content + job data for cache invalidation
      jobDataHash?: string; // Hash of linked job data if present
      scoreReport?: any; // Cached score report from ANALYSIS_AGENT_PROMPT
    };
  };
}

const cvSchema = new Schema<ICV>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true // Fast lookup for B2B queries
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
  templateName: {
    type: String,
    required: false
  },
  templateData: {
    type: Schema.Types.Mixed, // Store full template data for S3 backup and faster access
    required: false
  },
  journeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApplicationJourney',
    required: false
  },
  cvType: {
    type: String,
    enum: ['master', 'journey', 'standalone'],
    default: 'standalone',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  // V2: Three-Layer Architecture
  schemaVersion: {
    type: Number,
    enum: [1, 2],
    default: 1
  },
  slotBindings: {
    type: [{
      slotId: { type: String, required: true },
      snippetId: { type: String, required: true },
      order: { type: Number, default: 0 },
      visible: { type: Boolean, default: true },
    }],
    default: undefined
  },
  styleOverrides: {
    type: Schema.Types.Mixed,
    default: undefined
  },
  // Central Score Manager Fields
  cv_score_master: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  cv_score_ats: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  score_breakdown: {
    structural: { type: Number, default: 0 },
    industry: { type: Number, default: 0 },
    semantic: { type: Number, default: 0 }
  },
  active_issues_json: {
    type: Schema.Types.Mixed, // Storing Issue[] as JSON
    default: []
  },
  // Document state for limit enforcement (Vault View)
  documentState: {
    type: String,
    enum: ['editable', 'frozen', 'read-only'],
    default: 'editable',
    required: true
  },
  frozenAt: {
    type: Date,
    default: null
  },
  frozenReason: {
    type: String,
    enum: ['plan_downgrade', 'limit_exceeded', 'pass_expired', 'premium_template_restriction'],
    default: null
  },
  version: {
    type: Number,
    default: 1
  },
  cvData: {
    type: Schema.Types.Mixed,
    required: true
    // REMOVED DEFAULT: Default values for Mixed types can interfere with Mongoose save()
    // and cause data loss. Always explicitly set cvData when creating CVs.
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
    createdVia: { type: String, trim: true },
    // Resume Enhancer Career Ecosystem fields
    atsScoreCap: { type: Number, min: 0, max: 100, default: 100 }, // Template-based ATS score cap
    parentMasterId: { type: Schema.Types.ObjectId, ref: 'CV' }, // Source Master CV for forks
    isUserMaster: { type: Boolean, default: false }, // Definitive single Master flag
    fresherMode: { type: Boolean, default: false }, // Education/Projects first layout
    // Analysis Snapshot for Onboarding & Dashboard
    analysisSnapshot: {
      healthIndex: { type: Number },
      atsReadability: { type: Number },
      keywordCoverage: { type: Number },
      impactScore: { type: Number },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      generatedAt: { type: Date, default: Date.now }
    },
    // Canvas Layout Engine fields
    canvasDesign: { type: Schema.Types.Mixed },
    canvasTemplate: { type: Schema.Types.Mixed },
    canvasZones: { type: Schema.Types.Mixed },
    canvasTemplatesZones: { type: Schema.Types.Mixed },
    canvasTemplatesDesign: { type: Schema.Types.Mixed },
    // CV Surgeon Analysis Cache
    surgeonAnalysis: {
      score: { type: Number },
      fixes: { type: Schema.Types.Mixed },
      annotations: { type: Schema.Types.Mixed },
      targetRole: { type: String },
      seniorityLevel: { type: String },
      analyzedAt: { type: Date },
      contentHash: { type: String },
      jobDataHash: { type: String },
      scoreReport: { type: Schema.Types.Mixed }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
// CRITICAL: Simple userId index for fast lookups (most common query pattern)
cvSchema.index({ userId: 1 }); // Primary index for user queries - should reduce query time from 1400ms to <100ms
cvSchema.index({ userId: 1, createdAt: -1 }); // User's CVs by date
cvSchema.index({ userId: 1, 'metadata.isMaster': 1 }); // Index for master CV queries
cvSchema.index({ userId: 1, cvType: 1 }); // NEW: Index for CV type queries (Resume Enhancer)
cvSchema.index({ journeyId: 1, userId: 1 }); // Unique CV per journey (prevents duplicates)
cvSchema.index({ templateId: 1 }); // Index for template-based queries
cvSchema.index({ 'metadata.tags': 1 }); // Tag-based searches
cvSchema.index({ 'metadata.isPublic': 1, 'metadata.lastModified': -1 }); // Public CVs

// Update lastModified on save and ensure only one master CV per user
cvSchema.pre('save', async function (next) {
  this.metadata.lastModified = new Date();

  // If this CV is being set as master, unset any existing master CV for this user
  if (this.metadata.isMaster && (this.isModified('metadata.isMaster') || this.isNew)) {
    const CVModel = this.constructor as any;
    await CVModel.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { 'metadata.isMaster': false } }
    );
  }

  // Sync resumeData with cvData if resumeData is modified
  if (this.isModified('resumeData') && this.resumeData) {
    // Keep cvData in sync for backward compatibility
    // This ensures existing components continue to work
    const { migrateToLegacyFormat } = require('@/lib/migrations/enhanced-resume-migration');
    const legacyData = migrateToLegacyFormat(this.resumeData);

    // Preserve any existing canvas-specific metadata and sectionTitles on cvData
    if (this.cvData) {
      const existingMetadata = (this.cvData as any).metadata;
      const existingSectionTitles = (this.cvData as any).sectionTitles;
      if (existingMetadata) {
        legacyData.metadata = existingMetadata;
      }
      if (existingSectionTitles) {
        legacyData.sectionTitles = existingSectionTitles;
      }
    }

    this.cvData = legacyData;
  }

  next();
});



export default mongoose.models.CV || mongoose.model<ICV>('CV', cvSchema);
