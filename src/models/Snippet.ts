import mongoose, { Document, Schema } from 'mongoose';
import type { SnippetType, SnippetContent, SnippetMetadata, FormatHints, SnippetLineage } from '@/types/snippet-v2';

export interface ISnippet extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  type: SnippetType;
  content: SnippetContent;
  metadata: SnippetMetadata;
  formatHints: FormatHints;
  lineage: SnippetLineage;
  createdAt: Date;
  updatedAt: Date;
}

const snippetSchema = new Schema<ISnippet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'header', 'summary', 'experience', 'education', 'skills',
        'project', 'certification', 'publication', 'language',
        'award', 'volunteer', 'interest', 'reference',
      ],
      index: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      industry: { type: String, trim: true },
      role: { type: String, trim: true },
      seniority: { type: String, enum: ['junior', 'mid', 'senior', 'lead', 'executive'] },
      tags: [{ type: String, trim: true }],
      source: { type: String, enum: ['user', 'library', 'ai-generated', 'imported'], default: 'user' },
      importSource: { type: String, enum: ['linkedin', 'pdf', 'manual'] },
    },
    formatHints: {
      emphasize: [String],
      metrics: [String],
      keywords: [String],
      hierarchy: { type: String, enum: ['primary', 'secondary', 'tertiary'] },
    },
    lineage: {
      parentSnippetId: { type: String, index: true },
      derivedFrom: { type: String },
      editHistory: [
        {
          timestamp: { type: Date, required: true },
          field: { type: String, required: true },
          oldValue: { type: String, required: true },
          newValue: { type: String, required: true },
          source: { type: String, enum: ['user', 'ai'], required: true },
        },
      ],
      isGlobal: { type: Boolean, default: false },
      libraryVersion: { type: Number },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for common queries
snippetSchema.index({ userId: 1, type: 1 });
snippetSchema.index({ userId: 1, 'metadata.tags': 1 });
snippetSchema.index({ userId: 1, 'metadata.role': 1 });
snippetSchema.index({ userId: 1, 'metadata.industry': 1 });
snippetSchema.index({ 'lineage.parentSnippetId': 1 });
snippetSchema.index({ 'lineage.isGlobal': 1, type: 1 });

export default mongoose.models.Snippet || mongoose.model<ISnippet>('Snippet', snippetSchema);
