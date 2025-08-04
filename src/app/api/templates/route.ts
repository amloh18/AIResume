import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Template from '@/models/Template';
import { createErrorResponse } from '@/lib/db-utils';

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// New templates from TemplateRegistry
const newTemplates = [
  {
    _id: 'modernProfessional',
    name: 'Modern Professional',
    category: ['professional', 'modern'],
    thumbnail: '/api/templates/modernProfessional/thumbnail',
    isPremium: false,
    isDefault: true,
    description: 'Modern Professional template with 2-column layout',
    metadata: {
      rating: 4.8,
      usageCount: 1250,
      tags: ['modern', 'professional', 'clean']
    }
  },
  {
    _id: 'minimalistATS',
    name: 'Minimalist ATS',
    category: ['ats', 'minimalist'],
    thumbnail: '/api/templates/minimalistATS/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Minimalist ATS-friendly template with single-column layout',
    metadata: {
      rating: 4.6,
      usageCount: 890,
      tags: ['ats', 'minimalist', 'simple']
    }
  },
  {
    _id: 'creativeGraphical',
    name: 'Creative Graphical',
    category: ['creative', 'graphical'],
    thumbnail: '/api/templates/creativeGraphical/thumbnail',
    isPremium: true,
    isDefault: false,
    description: 'Creative Graphical template with visual elements',
    metadata: {
      rating: 4.4,
      usageCount: 567,
      tags: ['creative', 'graphical', 'visual']
    }
  },
  {
    _id: 'compactTextual',
    name: 'Compact Textual',
    category: ['compact', 'textual'],
    thumbnail: '/api/templates/compactTextual/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Compact Textual template optimized for content density',
    metadata: {
      rating: 4.3,
      usageCount: 432,
      tags: ['compact', 'textual', 'dense']
    }
  },
  {
    _id: 'twoColumnClassic',
    name: 'Two Column Classic',
    category: ['classic', 'traditional'],
    thumbnail: '/api/templates/twoColumnClassic/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Two Column Classic template with traditional layout',
    metadata: {
      rating: 4.5,
      usageCount: 678,
      tags: ['classic', 'traditional', 'two-column']
    }
  },
  {
    _id: 'modernMinimal',
    name: 'Modern Minimal',
    category: ['modern', 'minimal'],
    thumbnail: '/api/templates/modernMinimal/thumbnail',
    isPremium: false,
    isDefault: false,
    description: 'Modern Minimal template with clean aesthetics',
    metadata: {
      rating: 4.7,
      usageCount: 945,
      tags: ['modern', 'minimal', 'clean']
    }
  }
];

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isDefault = searchParams.get('isDefault');
    const isPremium = searchParams.get('isPremium');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const query: any = {};
    
    if (category) {
      query.category = { $in: [category] };
    }
    
    if (isDefault !== null) {
      query.isDefault = isDefault === 'true';
    }
    
    if (isPremium !== null) {
      query.isPremium = isPremium === 'true';
    }

    const skip = (page - 1) * limit;

    const dbTemplates = await Template.find(query)
      .sort({ 'metadata.usageCount': -1, 'metadata.rating': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Combine database templates with new templates
    let allTemplates = [...dbTemplates, ...newTemplates];
    
    // Apply filters to new templates as well
    if (category) {
      allTemplates = allTemplates.filter(template => 
        template.category && template.category.includes(category)
      );
    }
    
    if (isDefault !== null) {
      const isDefaultBool = isDefault === 'true';
      allTemplates = allTemplates.filter(template => template.isDefault === isDefaultBool);
    }
    
    if (isPremium !== null) {
      const isPremiumBool = isPremium === 'true';
      allTemplates = allTemplates.filter(template => template.isPremium === isPremiumBool);
    }

    // Sort combined templates
    allTemplates.sort((a, b) => {
      const aScore = (a.metadata?.usageCount || 0) + (a.metadata?.rating || 0) * 100;
      const bScore = (b.metadata?.usageCount || 0) + (b.metadata?.rating || 0) * 100;
      return bScore - aScore;
    });

    // Apply pagination
    const total = allTemplates.length;
    const paginatedTemplates = allTemplates.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: paginatedTemplates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Get templates error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const templateData = body;

    const template = new Template(templateData);
    await template.save();

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: template
    }, { status: 201, headers: corsHeaders });

  } catch (error: any) {
    console.error('Create template error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500, headers: corsHeaders }
    );
  }
} 