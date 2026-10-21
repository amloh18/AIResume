import mongoose, { Schema, Document } from 'mongoose';

export type ActivePaymentProvider = 'stripe' | 'cashfree' | 'razorpay';

export interface IPaymentProviderSettings extends Document {
  activeProvider: ActivePaymentProvider;
  configurationVersion: number;
  stripe: {
    enabled: boolean;
    publishableKey?: string;
    secretKey?: string;
    webhookEndpoint?: string;
    webhookSecret?: string;
    environment?: 'sandbox' | 'production';
  };
  cashfree: {
    enabled: boolean;
    appId?: string;
    secretKey?: string;
    webhookEndpoint?: string;
    webhookSecret?: string;
    environment: 'sandbox' | 'production';
    apiVersion?: string;
  };
  razorpay?: {
    enabled: boolean;
    webhookEndpoint?: string;
  };
  lastVerification?: {
    stripe?: {
      status: boolean;
      verifiedAt: Date;
      message?: string;
    };
    cashfree?: {
      status: boolean;
      verifiedAt: Date;
      message?: string;
    };
  };
  updatedAt: Date;
  updatedBy?: string;
}

const PaymentProviderSettingsSchema = new Schema<IPaymentProviderSettings>(
  {
    activeProvider: {
      type: String,
      enum: ['stripe', 'cashfree', 'razorpay'],
      default: 'stripe',
      required: true,
    },
    configurationVersion: {
      type: Number,
      default: 1,
      required: true,
    },
    stripe: {
      enabled: { type: Boolean, default: true },
      publishableKey: { type: String, trim: true },
      secretKey: { type: String, trim: true },
      webhookEndpoint: { type: String, trim: true },
      webhookSecret: { type: String, trim: true },
      environment: { type: String, enum: ['sandbox', 'production'], default: 'production' },
    },
    cashfree: {
      enabled: { type: Boolean, default: true },
      appId: { type: String, trim: true },
      secretKey: { type: String, trim: true },
      webhookEndpoint: { type: String, trim: true },
      webhookSecret: { type: String, trim: true },
      environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
      apiVersion: { type: String, default: '2023-08-01' },
    },
    razorpay: {
      enabled: { type: Boolean, default: false },
      webhookEndpoint: { type: String, trim: true },
    },
    lastVerification: {
      stripe: {
        status: { type: Boolean },
        verifiedAt: { type: Date },
        message: { type: String },
      },
      cashfree: {
        status: { type: Boolean },
        verifiedAt: { type: Date },
        message: { type: String },
      },
    },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentProviderSettings ||
  mongoose.model<IPaymentProviderSettings>('PaymentProviderSettings', PaymentProviderSettingsSchema);
