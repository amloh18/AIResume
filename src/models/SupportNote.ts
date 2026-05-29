import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportNote extends Document {
  userId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  adminEmail: string;
  content: string;
  timestamp: Date;
}

const supportNoteSchema = new Schema<ISupportNote>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

const SupportNote = mongoose.models.SupportNote || mongoose.model<ISupportNote>('SupportNote', supportNoteSchema);

export default SupportNote;
