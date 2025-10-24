import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { getAdminTestimonial } from '@/models/admin-models';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { username, avatar, designation, company, starRating, message, isActive } = body;

    // Validate star rating if provided
    if (starRating && (starRating < 1 || starRating > 5)) {
      return NextResponse.json(
        { error: 'Star rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const Testimonial = await getAdminTestimonial();
    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      {
        ...(username && { username }),
        ...(avatar !== undefined && { avatar }),
        ...(designation && { designation }),
        ...(company && { company }),
        ...(starRating && { starRating }),
        ...(message && { message }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    );

    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ testimonial });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const Testimonial = await getAdminTestimonial();
    const testimonial = await Testimonial.findByIdAndDelete(id);

    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}
