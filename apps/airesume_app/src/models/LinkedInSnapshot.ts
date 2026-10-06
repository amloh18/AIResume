import mongoose, { Document, Schema } from 'mongoose';

export interface ILinkedInSnapshot extends Document {
    userId: mongoose.Types.ObjectId;
    sourceCvId: mongoose.Types.ObjectId;
    tone: string;
    targetIndustry?: string;
    generatedContent: {
        hero?: any;
        about?: any;
        experience?: any[];
        projects?: any[];
        education?: any[];
        skills?: any;
        skills_matrix?: any;
        career_guide?: any;
        side_cards?: any[];
    };
    createdAt: Date;
    updatedAt: Date;
}

const linkedInSnapshotSchema = new Schema<ILinkedInSnapshot>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sourceCvId: {
        type: Schema.Types.ObjectId,
        ref: 'CV',
        required: true,
        index: true
    },
    tone: {
        type: String,
        required: true
    },
    targetIndustry: {
        type: String
    },
    generatedContent: {
        hero: Schema.Types.Mixed,
        about: Schema.Types.Mixed,
        experience: [Schema.Types.Mixed],
        projects: [Schema.Types.Mixed],
        education: [Schema.Types.Mixed],
        skills: Schema.Types.Mixed,
        skills_matrix: Schema.Types.Mixed,
        career_guide: Schema.Types.Mixed,
        side_cards: [Schema.Types.Mixed]
    }
}, {
    timestamps: true,
    collection: 'linkedin_enhancer' // Explicit collection name as requested by user
});

// Index to quickly find snapshot for a specific CV
linkedInSnapshotSchema.index({ userId: 1, sourceCvId: 1 }, { unique: true });

export default mongoose.models.LinkedInSnapshot || mongoose.model<ILinkedInSnapshot>('LinkedInSnapshot', linkedInSnapshotSchema);
