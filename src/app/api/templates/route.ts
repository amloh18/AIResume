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

    const templates = await Template.find(query)
      .sort({ 'metadata.usageCount': -1, 'metadata.rating': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Template.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: templates,
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