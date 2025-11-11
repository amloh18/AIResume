import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Testimonial from '@/models/Testimonial';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const testimonial = await Testimonial.findById(params.id).lean();

    if (!testimonial) {
      return NextResponse.json(
        { success: false, error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, testimonial });

  } catch (error: any) {
    console.error('Error fetching testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch testimonial', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const updateData = await request.json();

    const testimonial = await Testimonial.findByIdAndUpdate(
      params.id,
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const result = await Testimonial.findByIdAndDelete(params.id);

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

