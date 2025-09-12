import mongoose, { Document, Schema } from 'mongoose';

export interface ITestimonial extends Document {
  username: string;
  avatar?: string;
  designation: string;
  company: string;
  starRating: number; // 1-5 stars
  message: string;
  isActive: boolean; // For admin to show/hide testimonials
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    maxlength: [100, 'Username cannot exceed 100 characters']
  },
  avatar: {
    type: String,
    default: null
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  company: {
    type: String,
    required: [true, 'Company is required'],
    trim: true,
    maxlength: [100, 'Company cannot exceed 100 characters']
  },
  starRating: {
    type: Number,
    required: [true, 'Star rating is required'],
    min: [1, 'Star rating must be at least 1'],
    max: [5, 'Star rating cannot exceed 5']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      return ret;
    }
  }
});

// Index for active testimonials
testimonialSchema.index({ isActive: 1 });

export default mongoose.models.Testimonial || mongoose.model<ITestimonial>('Testimonial', testimonialSchema);
