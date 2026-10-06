import mongoose, { Schema, Document } from 'mongoose';

export type ActivePaymentProvider = 'stripe' | 'razorpay';

export interface IPaymentProviderSettings extends Document {
  activeProvider: ActivePaymentProvider;
  stripe: {
    enabled: boolean;
    publishableKey?: string;
    webhookEndpoint?: string;
  };
  razorpay: {
    enabled: boolean;
    webhookEndpoint?: string;
  };
  updatedAt: Date;
  updatedBy?: string;
}

const PaymentProviderSettingsSchema = new Schema<IPaymentProviderSettings>(
  {
    activeProvider: {
      type: String,
      enum: ['stripe', 'razorpay'],
      default: 'razorpay',
      required: true,
    },
    stripe: {
      enabled: { type: Boolean, default: true },
      publishableKey: { type: String, trim: true },
      webhookEndpoint: { type: String, trim: true },
    },
    razorpay: {
      enabled: { type: Boolean, default: true },
      webhookEndpoint: { type: String, trim: true },
    },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentProviderSettings ||
  mongoose.model<IPaymentProviderSettings>('PaymentProviderSettings', PaymentProviderSettingsSchema);
