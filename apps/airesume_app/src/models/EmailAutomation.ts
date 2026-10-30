import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Admin-controlled configuration for a single automated lifecycle email.
 *
 * The catalogue of automations lives in code (`lib/email-automations.ts`); this
 * collection stores only the operator overrides — enabled flag, timing, subject
 * and HTML. The runtime in the product app merges the DB document over the
 * catalogue default, so deleting a document safely falls back to the default.
 */
export type AutomationCategory =
  | 'lifecycle'
  | 'onboarding'
  | 'conversion'
  | 'reports'
  | 'transactional';

export type AutomationTriggerType = 'event' | 'relative' | 'schedule';

export interface IEmailAutomation extends Document {
  key: string;
  name: string;
  description: string;
  category: AutomationCategory;
  enabled: boolean;
  triggerType: AutomationTriggerType;
  /** Event name for `event` triggers, e.g. `onboarding.completed`. */
  event?: string;
  /** Hours after the anchor timestamp for `relative` triggers. */
  delayHours?: number;
  /** Anchor field for `relative` triggers. */
  anchor?: 'createdAt' | 'lastLogin' | 'updatedAt';
  /** Human-readable schedule for `schedule` triggers, e.g. `daily 08:00`. */
  schedule?: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
  fromName?: string;
  fromEmail?: string;
  /** Audience constraints evaluated by the runtime. */
  audience: {
    plans?: string[];
    requireCv?: boolean;
    excludeWithCv?: boolean;
    onboardingIncomplete?: boolean;
  };
  /** Extra controls for the merged daily digest. */
  digest?: {
    includeDeadlines: boolean;
    includeFollowUps: boolean;
    includeActionRequired: boolean;
  };
  stats: {
    sent: number;
    lastSentAt?: Date;
    lastError?: string;
  };
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailAutomationSchema = new Schema<IEmailAutomation>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['lifecycle', 'onboarding', 'conversion', 'reports', 'transactional'],
      default: 'lifecycle',
    },
    enabled: { type: Boolean, default: true },
    triggerType: {
      type: String,
      enum: ['event', 'relative', 'schedule'],
      default: 'event',
    },
    event: String,
    delayHours: Number,
    anchor: { type: String, enum: ['createdAt', 'lastLogin', 'updatedAt'] },
    schedule: String,
    subject: { type: String, required: true },
    previewText: String,
    htmlContent: { type: String, required: true },
    fromName: String,
    fromEmail: String,
    audience: {
      plans: [String],
      requireCv: { type: Boolean, default: false },
      excludeWithCv: { type: Boolean, default: false },
      onboardingIncomplete: { type: Boolean, default: false },
    },
    digest: {
      includeDeadlines: { type: Boolean, default: true },
      includeFollowUps: { type: Boolean, default: true },
      includeActionRequired: { type: Boolean, default: true },
    },
    stats: {
      sent: { type: Number, default: 0 },
      lastSentAt: Date,
      lastError: String,
    },
    updatedBy: String,
  },
  { timestamps: true }
);

let EmailAutomation: Model<IEmailAutomation>;

try {
  EmailAutomation = mongoose.model<IEmailAutomation>('EmailAutomation');
} catch {
  EmailAutomation = mongoose.model<IEmailAutomation>(
    'EmailAutomation',
    EmailAutomationSchema,
    'emailautomations'
  );
}

export default EmailAutomation;
