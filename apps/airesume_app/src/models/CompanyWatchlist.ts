import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyWatchlist extends Document {
  userId: mongoose.Types.ObjectId | string;
  companyName: string;
  normalizedName: string; // Lowercase, trimmed for matching
  domain?: string; // Company website domain
  industry?: string;
  atsType?: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'workable' | 'unknown';
  atsBoardUrl?: string; // Direct ATS board URL if known
  notes?: string;
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
  lastDiscoveredAt?: Date; // When last job was discovered from this company
  jobsDiscovered: number; // Total jobs discovered from this company
  createdAt: Date;
  updatedAt: Date;
}

const companyWatchlistSchema = new Schema<ICompanyWatchlist>(
  {
    userId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [200, 'Domain cannot exceed 200 characters'],
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, 'Industry cannot exceed 100 characters'],
    },
    atsType: {
      type: String,
      enum: ['greenhouse', 'lever', 'ashby', 'workday', 'workable', 'unknown'],
      default: 'unknown',
    },
    atsBoardUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'ATS board URL cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastDiscoveredAt: {
      type: Date,
    },
    jobsDiscovered: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one watchlist entry per user per company
companyWatchlistSchema.index(
  { userId: 1, normalizedName: 1 },
  { unique: true, name: 'user_company_dedup' }
);

// Index for active watchlists
companyWatchlistSchema.index({ userId: 1, isActive: 1 });

// Index for priority-based queries
companyWatchlistSchema.index({ userId: 1, priority: 1, isActive: 1 });

// Pre-save hook to normalize company name
companyWatchlistSchema.pre('save', function (next) {
  if (this.isModified('companyName')) {
    this.normalizedName = this.companyName.toLowerCase().trim();
  }
  next();
});

export default mongoose.models.CompanyWatchlist ||
  mongoose.model<ICompanyWatchlist>(
    'CompanyWatchlist',
    companyWatchlistSchema
  );
