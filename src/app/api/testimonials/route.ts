import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { getAdminTestimonial } from '@/models/admin-models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get active testimonials only
    const Testimonial = await getAdminTestimonial();
    const testimonials = await Testimonial.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}
