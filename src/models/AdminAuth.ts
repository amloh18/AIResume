import mongoose, { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface for Admin Authentication User
export interface IAdminAuth extends Document {
  email: string;
  password: string;
  role: 'superadmin' | 'admin' | 'editor';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AdminAuthSchema = new Schema<IAdminAuth>({
  // --- Authentication Fields ---
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // Ensures password hash is never returned by default queries
  },
  // --- Role/Access Fields ---
  role: {
    type: String,
    default: 'superadmin',
    enum: ['superadmin', 'admin', 'editor'],
    required: true,
  },
  // --- Tracking Fields ---
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Hashing Middleware (Pre-Save Hook)
AdminAuthSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password Comparison Method
AdminAuthSchema.methods.comparePassword = async function (candidatePassword: string) {
  const passwordHash = this.password;
  return bcrypt.compare(candidatePassword, passwordHash);
};

export default mongoose.models.AdminAuth || model<IAdminAuth>('AdminAuth', AdminAuthSchema);
