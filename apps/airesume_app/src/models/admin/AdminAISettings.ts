import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * AdminAISettings — singleton runtime configuration for AI model selection.
 *
 * Historically the Gemini model was chosen per call site (hardcoded strings in
 * ~10 files) or from the GEMINI_MODEL env var, which required a redeploy to
 * change. This document is the single admin-controlled source of truth; the
 * env var remains the fallback when no document exists.
 *
 * There is exactly one document in the `adminaisettings` collection.
 */
export interface IAdminAISettings extends Document {
  /** Primary Gemini model for general workloads. */
  primaryModel: string;
  /** Lightweight Gemini model for high-volume/cheap tasks (transcription, parsing). */
  fastModel: string;
  /** When true, `primaryModel`/`fastModel` win over per-call model hints. */
  overridePerCallModels: boolean;
  /** When false, the Ollama primary path is skipped and Gemini is called directly. */
  useOllama: boolean;
  /** Optional temperature floor applied when a call site doesn't specify one. */
  defaultTemperature?: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAISettingsSchema = new Schema<IAdminAISettings>(
  {
    primaryModel: { type: String, default: 'gemini-2.5-flash' },
    fastModel: { type: String, default: 'gemini-2.5-flash-lite' },
    overridePerCallModels: { type: Boolean, default: false },
    useOllama: { type: Boolean, default: true },
    defaultTemperature: { type: Number, min: 0, max: 2 },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: 'adminaisettings' }
);

let AdminAISettings: Model<IAdminAISettings>;

try {
  AdminAISettings = mongoose.model<IAdminAISettings>('AdminAISettings');
} catch {
  AdminAISettings = mongoose.model<IAdminAISettings>('AdminAISettings', AdminAISettingsSchema, 'adminaisettings');
}

export default AdminAISettings;
