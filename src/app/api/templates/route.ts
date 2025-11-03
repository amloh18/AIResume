import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { Template } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import AdminTemplateService from '@/lib/services/adminTemplateService';

// GET - List available templates from admin database
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 TEMPLATES API - Starting GET request (using admin templates)');
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'cv';
    const tier = searchParams.get('tier') as 'free' | 'premium' | null;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    console.log('🔍 TEMPLATES API - Params:', { category, tier, includeInactive });

    // Get templates from main database
    let templates;
    try {
      await getConnection();
      console.log('✅ TEMPLATES API - Connected to main database');
      
      const query: any = {};
      
      if (category && category !== 'all') {
        query.category = category;
      }
      
      if (tier) {
        query.tier = tier;
      }
      
      if (!includeInactive) {
        query.isActive = true;
      }
      
      templates = await Template.find(query)
        .sort({ name: 1 })
        .lean()
        .exec();
      
      console.log(`✅ TEMPLATES API - Found ${templates.length} templates from main database`);
    } catch (error) {
      console.warn('⚠️ TEMPLATES API - Database connection failed, using fallback templates');
      templates = AdminTemplateService.getFallbackTemplates({
        category,
        tier: tier || undefined,
        isActive: !includeInactive ? true : undefined
      });
      console.log(`📋 TEMPLATES API - Using ${templates.length} fallback templates`);
    }

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id || template._id,
        name: template.name,
        description: template.description,
        thumbnail: template.thumbnail,
        tier: template.tier,
        layoutType: template.layoutType,
        globalStyles: template.globalStyles,
        columnLayout: template.columnLayout,
        sectionStyling: template.sectionStyling,
        availableSections: template.availableSections,
        pageSettings: template.pageSettings,
        isDefault: template.isDefault,
        version: template.version,
        createdAt: template.createdAt
      }))
    });

  } catch (error: any) {
    console.error('❌ TEMPLATES API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// POST - Create a new template (admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 TEMPLATES API - Starting POST request');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For template creation, you might want to add admin check
    // const user = await User.findOne({ email: session.user.email });
    // if (user?.role !== 'admin') {
    //   return NextResponse.json(
    //     { success: false, error: 'Admin access required' },
    //     { status: 403 }
    //   );
    // }

    await getConnection();
    console.log('🔍 TEMPLATES API - Database connected');

    const body = await request.json();
    console.log('🔍 TEMPLATES API - Request body received');

    // Extract template data
    const {
      name,
      description,
      thumbnail,
      category,
      categories,
      tier,
      globalStyles,
      availableSections,
      templateData,
      isDefault,
      globalAccess
    } = body;

    // Validate required fields
    if (!name || !category || !globalStyles || !availableSections) {
      return NextResponse.json(
        { success: false, error: 'Name, category, globalStyles, and availableSections are required' },
        { status: 400 }
      );
    }

    // Create new template
    const newTemplate = new Template({
      name,
      description,
      thumbnail,
      category,
      categories,
      tier: tier || 'free',
      globalStyles,
      availableSections,
      templateData,
      isActive: true,
      isDefault: isDefault || false,
      isPublished: true,
      globalAccess: globalAccess !== false, // Default to true
      version: 1
    });

    await newTemplate.save();

    console.log('✅ TEMPLATES API - Template created successfully:', newTemplate._id);

    return NextResponse.json({
      success: true,
      template: {
        id: newTemplate._id.toString(),
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category,
        tier: newTemplate.tier,
        isDefault: newTemplate.isDefault,
        createdAt: newTemplate.createdAt
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ TEMPLATES API - Error creating template:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'A template with this name already exists' },
        { status: 409 }
      );
    }
    
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}