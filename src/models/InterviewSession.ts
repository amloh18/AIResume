import mongoose, { Document, Schema } from 'mongoose';

export interface IInterviewModule {
    id: string; // Unique ID for the module (e.g., 'mod-1')
    title: string; // e.g., "Technical Foundations"
    type: 'technical' | 'behavioral' | 'system-design' | 'leadership' | 'cultural';
    status: 'pending' | 'in-progress' | 'completed' | 'locked';
    displayOrder: number;
}

export interface IInterviewSession extends Document {
    userId: mongoose.Types.ObjectId;
    jobId: mongoose.Types.ObjectId;

    readinessScore: number; // 0 to 100

    // Metadata cached from Job/CV
    targetRole: string;
    skillExtracts: string[]; // Key skills extracted for this sessions context

    modules: IInterviewModule[];

    lastPracticedAt?: Date;
    createdVia: 'manual' | 'auto_generated';

    createdAt: Date;
    updatedAt: Date;
}

const interviewSessionSchema = new Schema<IInterviewSession>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    readinessScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    targetRole: {
        type: String,
        required: true,
        trim: true
    },
    skillExtracts: [{
        type: String,
        trim: true
    }],
    modules: [{
        id: { type: String, required: true },
        title: { type: String, required: true },
        type: {
            type: String,
            enum: ['technical', 'behavioral', 'system-design', 'leadership', 'cultural'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'locked'],
            default: 'pending'
        },
        displayOrder: { type: Number, default: 0 }
    }],
    lastPracticedAt: {
        type: Date
    },
    createdVia: {
        type: String,
        enum: ['manual', 'auto_generated'],
        default: 'auto_generated'
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

// Indexes
interviewSessionSchema.index({ userId: 1, jobId: 1 }, { unique: true }); // One session per job
interviewSessionSchema.index({ userId: 1, updatedAt: -1 }); // Recent sessions

export default mongoose.models.InterviewSession || mongoose.model<IInterviewSession>('InterviewSession', interviewSessionSchema);
