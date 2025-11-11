/**
 * Feedback API Route
 * REFACTORED: Now uses Zod validation and standardized error handling
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { z } from 'zod';
import { withValidation, successResponse, errorResponse } from '@/lib/validation/api-validator';

// Feedback validation schema
const feedbackSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  message: z.string().max(2000, 'Message is too long').optional(),
  page: z.string().optional(),
});

interface FeedbackData {
  name: string;
  email: string;
  rating: number;
  message?: string;
  page?: string;
  userId?: string;
  timestamp: Date;
}

export const POST = withValidation(feedbackSchema, async (request, validatedData) => {
  try {
    // Get session if user is logged in
    const session = await getServerSession(authConfig);
    
    // Create feedback data with validated input
    const feedbackData: FeedbackData = {
      name: validatedData.name.trim(),
      email: validatedData.email.trim(),
      rating: validatedData.rating,
      message: validatedData.message?.trim(),
      page: validatedData.page,
      userId: session?.user?.id,
      timestamp: new Date(),
    };

    // Log feedback (in production, save to database)
    console.log('📝 Feedback received:', {
      name: feedbackData.name,
      email: feedbackData.email,
      rating: feedbackData.rating,
      hasMessage: !!feedbackData.message,
      userId: feedbackData.userId,
      page: feedbackData.page,
      timestamp: feedbackData.timestamp,
    });

    // TODO: Save to database when Feedback model is ready
    // await getConnection();
    // const Feedback = mongoose.model('Feedback', feedbackSchema);
    // await new Feedback(feedbackData).save();

    return successResponse(
      { received: true },
      'Thank you for your feedback!'
    );
  } catch (error) {
    console.error('Feedback submission error:', error);
    return errorResponse(
      'FEEDBACK_ERROR',
      'Failed to submit feedback',
      undefined,
      500
    );
  }
});

