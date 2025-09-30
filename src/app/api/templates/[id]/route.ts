import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/db-utils';
import AdminTemplateService from '@/lib/services/adminTemplateService';

// GET - Get a specific template by ID from admin database
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    console.log('🔍 TEMPLATE API - Getting template by ID:', templateId);

    // Get template from admin database
    const template = await AdminTemplateService.getTemplateById(templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    console.log(`✅ TEMPLATE API - Found template: ${template.name}`);

    return NextResponse.json({
      success: true,
      template: {
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
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ TEMPLATE API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

