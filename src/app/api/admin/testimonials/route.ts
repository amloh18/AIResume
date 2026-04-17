import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Testimonial from '@/models/Testimonial';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Build query
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    // Fetch testimonials
    const testimonials = await Testimonial.find(query).lean()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(testimonials);

  } catch (error: any) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch testimonials', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();

    // Create new testimonial
    const testimonial = new Testimonial(body);
    await testimonial.save();

    return NextResponse.json(
      { success: true, testimonial },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create testimonial', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getConnection();

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Testimonial ID is required' },
        { status: 400 }
      );
    }

    // Update testimonial
    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, testimonial });

  } catch (error: any) {
    console.error('Error updating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update testimonial', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Testimonial ID is required' },
        { status: 400 }
      );
    }

    // Delete testimonial
    const result = await Testimonial.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Testimonial deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete testimonial', details: error.message },
      { status: 500 }
    );
  }
}

