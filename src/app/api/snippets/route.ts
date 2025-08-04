import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import Snippet from '@/models/Snippet';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const sectionType = searchParams.get('sectionType');
    const accessLevel = searchParams.get('accessLevel');
    const templateId = searchParams.get('templateId');
    const tags = searchParams.get('tags');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') || 'usageCount';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (sectionType) {
      query.sectionType = sectionType;
    }

    if (accessLevel) {
      query.accessLevel = accessLevel;
    }

    if (templateId) {
      query.templateId = templateId;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Execute query
    const snippets = await Snippet.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Snippet.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: snippets,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('Error fetching snippets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch snippets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      category,
      sectionType,
      templateId,
      templateName,
      templateImage,
      layout,
      styling,
      content,
      accessLevel,
      tags
    } = body;

    // Validate required fields
    if (!name || !description || !category || !sectionType || !templateId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new snippet
    const snippet = new Snippet({
      name,
      description,
      category,
      sectionType,
      templateId,
      templateName,
      templateImage,
      layout,
      styling,
      content,
      accessLevel: accessLevel || 'all',
      tags: tags || [],
      isActive: true,
      isPremium: accessLevel === 'pro',
      usageCount: 0,
      rating: 0
    });

    await snippet.save();

    return NextResponse.json({
      success: true,
      data: snippet,
      message: 'Snippet created successfully'
    });

  } catch (error) {
    console.error('Error creating snippet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create snippet' },
      { status: 500 }
    );
  }
} 