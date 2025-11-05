import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/db-utils';
import { HARDCODED_TEMPLATES, resolveTemplateThumbnails } from '@/lib/templates/hardcoded-templates';

// GET - List available hardcoded templates only
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 TEMPLATES API - Starting GET request (hardcoded templates only)');
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'cv';
    const tier = searchParams.get('tier') as 'free' | 'premium' | null;

    console.log('🔍 TEMPLATES API - Params:', { category, tier });

    // Filter hardcoded templates and resolve thumbnails at runtime
    let templates = resolveTemplateThumbnails(HARDCODED_TEMPLATES);
    
    if (category && category !== 'all') {
      templates = templates.filter(t => t.category === category);
    }
    
    if (tier) {
      templates = templates.filter(t => t.tier === tier);
    }
    
    console.log(`✅ TEMPLATES API - Found ${templates.length} hardcoded templates`);

    return NextResponse.json({
      success: true,
      templates: templates.map(template => {
        try {
          return {
            id: template.id || template._id,
            name: template.name,
            description: template.description,
            thumbnail: template.thumbnail || '',
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
          };
        } catch (error) {
          console.error('Error processing template:', template.id, error);
          // Return template with minimal data if processing fails
          return {
            id: template.id || template._id,
            name: template.name || 'Unknown',
            description: template.description || '',
            thumbnail: template.thumbnail || '',
            tier: template.tier || 'free',
            layoutType: template.layoutType || 'one-column',
            globalStyles: template.globalStyles || {},
            columnLayout: template.columnLayout || { main: { width: '100%', sections: [] } },
            sectionStyling: template.sectionStyling || {},
            availableSections: template.availableSections || [],
            pageSettings: template.pageSettings || {},
            isDefault: template.isDefault || false,
            version: template.version || 1,
            createdAt: template.createdAt
          };
        }
      })
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

// POST - Disabled: Only hardcoded templates are used
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Template creation is disabled. Only hardcoded templates are available.' 
    },
    { status: 403 }
  );
}