import mongoose, { Document, Schema } from 'mongoose';

export interface IResourceLink extends Document {
  parentType: 'job' | 'journey';
  parentId: mongoose.Types.ObjectId;
  childType: 'cv' | 'coverLetter';
  childId: mongoose.Types.ObjectId;
  isRequired: boolean; // Cannot be deleted independently
  createdAt: Date;
  updatedAt: Date;
}

const resourceLinkSchema = new Schema<IResourceLink>({
  parentType: {
    type: String,
    enum: ['job', 'journey'],
    required: true,
    index: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'parentType'
  },
  childType: {
    type: String,
    enum: ['cv', 'coverLetter'],
    required: true,
    index: true
  },
  childId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'childType'
  },
  isRequired: {
    type: Boolean,
    default: true // By default, linked resources cannot be deleted independently
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
resourceLinkSchema.index({ parentId: 1, parentType: 1 });
resourceLinkSchema.index({ childId: 1, childType: 1 });
resourceLinkSchema.index({ parentId: 1, childId: 1 }, { unique: true }); // Prevent duplicate links

export default mongoose.models.ResourceLink || mongoose.model<IResourceLink>('ResourceLink', resourceLinkSchema);

