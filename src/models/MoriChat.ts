import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMoriChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selection?: {
    path: string;
    text: string;
  };
}

export interface IMoriChat extends Document {
  userId: string | mongoose.Types.ObjectId;
  cvId?: string | mongoose.Types.ObjectId;
  title: string;
  messages: IMoriChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const moriChatMessageSchema = new Schema<IMoriChatMessage>({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, required: true },
  selection: {
    path: { type: String },
    text: { type: String }
  }
});

const moriChatSchema = new Schema<IMoriChat>({
  userId: { type: Schema.Types.Mixed, ref: 'User', required: true },
  cvId: { type: Schema.Types.Mixed, ref: 'CV' },
  title: { type: String, required: true, default: 'New Chat' },
  messages: { type: [moriChatMessageSchema], default: [] }
}, {
  timestamps: true
});

const MoriChat: Model<IMoriChat> = mongoose.models.MoriChat || mongoose.model<IMoriChat>('MoriChat', moriChatSchema);
export default MoriChat;
