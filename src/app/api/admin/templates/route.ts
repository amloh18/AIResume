import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Template from '@/models/Template';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const category = searchParams.get('category');
    const tier = searchParams.get('tier');

    // Build query
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    if (category) {
      query.category = category;
    }
    if (tier) {
      query.tier = tier;
    }

    // Fetch templates
    const templates = await Template.find(query).lean()
      .populate('createdBy', 'firstName lastName email')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(templates);

  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();

    // Create new template
    const template = new Template(body);
    await template.save();

    // Populate relations
    await template.populate('createdBy', 'firstName lastName email');

    return NextResponse.json(
      { success: true, template },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template', details: error.message },
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
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Update template
    const template = await Template.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, template });

  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template', details: error.message },
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
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of default templates
    const template = await Template.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (template.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default template' },
        { status: 400 }
      );
    }

    // Delete template
    await Template.findByIdAndDelete(id);

    return NextResponse.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template', details: error.message },
      { status: 500 }
    );
  }
}

