import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminTemplate } from '@/models/admin-models';

// GET /api/templates - Get all available templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const query: any = {};
    
    if (category) {
      query.category = category;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    const Template = await getAdminTemplate();
    const templates = await Template.find(query)
      .sort({ isDefault: -1, name: 1 })
      .exec();

    return NextResponse.json({ templates });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin check here
    // For now, allow any authenticated user to create templates

    const body = await request.json();
    const {
      name,
      description,
      category,
      categories,
      tier,
      globalStyles,
      availableSections,
      templateData,
      isDefault,
      isPublished,
      globalAccess
    } = body;

    if (!name || !category || !availableSections) {
      return NextResponse.json(
        { error: 'Name, category, and available sections are required' },
        { status: 400 }
      );
    }

    const Template = await getAdminTemplate();
    const template = new Template({
      name,
      description,
      category,
      categories: categories || [],
      tier: tier || 'free',
      globalStyles: globalStyles || {},
      availableSections,
      templateData: templateData || {},
      isDefault: isDefault || false,
      isPublished: isPublished || false,
      globalAccess: globalAccess !== false, // Default to true
      createdBy: session.user.id
    });

    await template.save();

    return NextResponse.json({ template }, { status: 201 });

  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
} 