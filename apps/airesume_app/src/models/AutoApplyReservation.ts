import mongoose, { Schema, Document } from 'mongoose';

/**
 * Auto-Apply Reservation — the single authoritative quota consumption record.
 *
 * Every Auto-Apply operation creates exactly ONE reservation.
 * The reservation lifecycle is:
 *
 *   RESERVED → CONSUMED  (operation completed successfully)
 *   RESERVED → RELEASED  (operation cancelled/failed before meaningful processing)
 *   RESERVED → CONSUMED  (operation failed after meaningful processing — quota stays consumed)
 *
 * The `operationId` provides idempotency:
 *   user_id + operationId must be unique.
 *   A retry with the same operationId will NOT create a second reservation.
 */
export type ReservationStatus = 'reserved' | 'consumed' | 'released';

export interface IAutoApplyReservation extends Document {
  userId: mongoose.Types.ObjectId | string;
  operationId: string;          // Client-provided idempotency key
  status: ReservationStatus;
  plan: string;                 // Plan at time of reservation (free/starter/focused)
  billingPeriodStart?: Date;    // For monthly plans: billing period start
  billingPeriodEnd?: Date;      // For monthly plans: billing period end
  applicationId?: mongoose.Types.ObjectId | string;  // Link to JobApplication
  journeyId?: mongoose.Types.ObjectId | string;      // Link to ApplicationJourney
  queueItemId?: mongoose.Types.ObjectId | string;    // Link to ApplicationQueue
  releasedReason?: string;      // Why the reservation was released
  consumedAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AutoApplyReservationSchema = new Schema<IAutoApplyReservation>(
  {
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    operationId: { type: String, required: true },
    status: {
      type: String,
      enum: ['reserved', 'consumed', 'released'],
      default: 'reserved',
      index: true,
    },
    plan: { type: String, required: true },
    billingPeriodStart: { type: Date },
    billingPeriodEnd: { type: Date },
    applicationId: { type: Schema.Types.Mixed },
    journeyId: { type: Schema.Types.Mixed },
    queueItemId: { type: Schema.Types.Mixed },
    releasedReason: { type: String },
    consumedAt: { type: Date },
    releasedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound unique index: one reservation per user per operationId
AutoApplyReservationSchema.index({ userId: 1, operationId: 1 }, { unique: true });

// Query indexes
AutoApplyReservationSchema.index({ userId: 1, status: 1, createdAt: -1 });
AutoApplyReservationSchema.index({ userId: 1, billingPeriodStart: 1, status: 1 });

export default mongoose.models.AutoApplyReservation ||
  mongoose.model<IAutoApplyReservation>('AutoApplyReservation', AutoApplyReservationSchema);
