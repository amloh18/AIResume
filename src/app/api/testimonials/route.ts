import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAdminTestimonial } from '@/models/admin-models';

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    await getConnection();

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
