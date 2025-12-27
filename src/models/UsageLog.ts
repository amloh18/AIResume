import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * UsageLog Model - "The Meter"
 * 
 * Records every "spend" event for audit-proof metering.
 * This enables the "Deletion → Refund" logic and easy monthly resets.
 * 
 * @see public/credit plan.md - Phase 1, Section B
 */

export type UsageAction =
    | 'JOB_ACTIVATION'   // Creating/activating a job
    | 'PDF_DOWNLOAD'     // PDF export
    | 'DOCX_DOWNLOAD'    // DOCX export (gated for free)
    | 'AI_FIX'           // AI Surgeon runs
    | 'CV_CREATION'      // Creating a new CV
    | 'COVER_LETTER_AI'; // AI-generated cover letter

export interface IUsageLog extends Document {
    userId: Types.ObjectId;
    action: UsageAction;
    resourceId?: string; // e.g., JobID or CVID
    metadata?: {
        format?: 'pdf' | 'docx';
        refunded?: boolean;      // For the "Retry Guarantee"
        refundReason?: string;
        planAtTime?: string;     // Track which plan user was on
    };
    createdAt: Date;
    updatedAt: Date;
}

const usageLogSchema = new Schema<IUsageLog>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: ['JOB_ACTIVATION', 'PDF_DOWNLOAD', 'DOCX_DOWNLOAD', 'AI_FIX', 'CV_CREATION', 'COVER_LETTER_AI'],
        required: true,
        index: true
    },
    resourceId: {
        type: String,
        trim: true,
        sparse: true
    },
    metadata: {
        format: {
            type: String,
            enum: ['pdf', 'docx']
        },
        refunded: {
            type: Boolean,
            default: false
        },
        refundReason: {
            type: String,
            trim: true,
            maxlength: 200
        },
        planAtTime: {
            type: String,
            trim: true
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

// Compound indexes for efficient queries
// Primary query: Count usage per user per action within a time period
usageLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

// Query for non-refunded usage (for Retry Guarantee logic)
usageLogSchema.index({ userId: 1, action: 1, 'metadata.refunded': 1, createdAt: -1 });

// Query by resourceId (e.g., find all logs for a specific job)
usageLogSchema.index({ resourceId: 1 });

export default mongoose.models.UsageLog || mongoose.model<IUsageLog>('UsageLog', usageLogSchema);
