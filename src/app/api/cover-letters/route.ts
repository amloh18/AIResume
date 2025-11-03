import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import CoverLetter from '@/models/CoverLetter';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updatedAt';
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create base query
    let query = CoverLetter.find({ userId });

    // Add status filter
    if (status && status !== 'all') {
      query = query.find({ status });
    }

    // Add search filter if provided
    if (search) {
      const searchFilter = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { 'metadata.targetCompany': { $regex: search, $options: 'i' } },
          { 'metadata.targetPosition': { $regex: search, $options: 'i' } }
        ]
      };
      query = query.find(searchFilter);
    }

    // Apply sorting
    const sortOrder = sort === 'updatedAt' ? -1 : 1;
    query = query.sort({ [sort]: sortOrder });

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    // Execute query
    console.log('🔍 Cover Letter API - Executing database query for user:', userId);
    const coverLetters = await query.lean();
    console.log('🔍 Cover Letter API - Query executed, found cover letters:', coverLetters.length);

    // Calculate counts for different statuses
    const counts = await Promise.all([
      CoverLetter.countDocuments({ userId }),
      CoverLetter.countDocuments({ userId, status: 'draft' }),
      CoverLetter.countDocuments({ userId, status: 'final' }),
      CoverLetter.countDocuments({ userId, status: 'archived' })
    ]);

    const [total, drafts, final, archived] = counts;

    // Transform data for response
    const transformedCoverLetters = coverLetters.map(cl => ({
      id: cl._id,
      title: cl.title,
      content: cl.content,
      status: cl.status,
      lastModified: cl.metadata?.lastModified || cl.updatedAt,
      createdAt: cl.createdAt,
      updatedAt: cl.updatedAt,
      metadata: cl.metadata,
      views: cl.metadata?.viewCount || 0,
      isStarred: cl.metadata?.starred || false,
      completionPercentage: calculateCompletionPercentage(cl)
    }));

    return NextResponse.json({
      success: true,
      data: {
        coverLetters: transformedCoverLetters,
        counts: {
          total,
          drafts,
          final,
          archived
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cover letters:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cover letters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    const body = await request.json();
    const { userId, title, content, targetCompany, targetPosition, keywords, jobId, cvId, status, metadata } = body;

    if (!userId || !title || !content) {
      return NextResponse.json(
        { success: false, message: 'User ID, title, and content are required' },
        { status: 400 }
      );
    }

    // Build metadata object, merging provided metadata with defaults
    const coverLetterMetadata = {
      targetCompany: targetCompany || metadata?.targetCompany,
      targetPosition: targetPosition || metadata?.targetPosition,
      keywords: keywords || metadata?.keywords || [],
      isPublic: metadata?.isPublic || false,
      lastModified: new Date(),
      version: metadata?.version || 1,
      ...(metadata || {}) // Merge any additional metadata fields
    };

    const coverLetter = new CoverLetter({
      userId,
      title,
      content,
      status: status || 'draft',
      jobId,
      cvId,
      metadata: coverLetterMetadata
    });

    await coverLetter.save();

    // Note: Cover Letter-to-Journey linking is now handled by ApplicationPackageService
    // Cover letters are created as freestanding documents and linked to journeys separately
    // This enforces the "Application Package" model where documents belong to specific packages

    return NextResponse.json({
      success: true,
      data: {
        id: coverLetter._id,
        title: coverLetter.title,
        content: coverLetter.content,
        status: coverLetter.status,
        jobId: coverLetter.jobId,
        cvId: coverLetter.cvId,
        userId: coverLetter.userId,
        lastModified: coverLetter.metadata.lastModified,
        createdAt: coverLetter.createdAt,
        updatedAt: coverLetter.updatedAt,
        metadata: coverLetter.metadata
      }
    });
  } catch (error) {
    console.error('Error creating cover letter:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create cover letter' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getConnection();
    
    const body = await request.json();
    const { id, title, content, status, targetCompany, targetPosition, keywords } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Cover letter ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (status) updateData.status = status;
    if (targetCompany !== undefined) updateData['metadata.targetCompany'] = targetCompany;
    if (targetPosition !== undefined) updateData['metadata.targetPosition'] = targetPosition;
    if (keywords) updateData['metadata.keywords'] = keywords;

    const coverLetter = await CoverLetter.findByIdAndUpdate(
      id,
      { ...updateData, 'metadata.lastModified': new Date() },
      { new: true, runValidators: true }
    );

    if (!coverLetter) {
      return NextResponse.json(
        { success: false, message: 'Cover letter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: coverLetter._id,
        title: coverLetter.title,
        content: coverLetter.content,
        status: coverLetter.status,
        lastModified: coverLetter.metadata.lastModified,
        createdAt: coverLetter.createdAt,
        updatedAt: coverLetter.updatedAt,
        metadata: coverLetter.metadata
      }
    });
  } catch (error) {
    console.error('Error updating cover letter:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update cover letter' },
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
        { success: false, message: 'Cover letter ID is required' },
        { status: 400 }
      );
    }

    const coverLetter = await CoverLetter.findByIdAndDelete(id);

    if (!coverLetter) {
      return NextResponse.json(
        { success: false, message: 'Cover letter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cover letter deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cover letter:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete cover letter' },
      { status: 500 }
    );
  }
}

function calculateCompletionPercentage(coverLetter: any): number {
  if (coverLetter.status === 'final') return 100;
  if (coverLetter.status === 'archived') return 0;
  
  let score = 0;
  let maxScore = 5;
  
  if (coverLetter.title && coverLetter.title.trim()) score += 1;
  if (coverLetter.content && coverLetter.content.trim()) score += 1;
  if (coverLetter.metadata?.targetCompany && coverLetter.metadata.targetCompany.trim()) score += 1;
  if (coverLetter.metadata?.targetPosition && coverLetter.metadata.targetPosition.trim()) score += 1;
  if (coverLetter.metadata?.keywords && coverLetter.metadata.keywords.length > 0) score += 1;
  
  return Math.round((score / maxScore) * 100);
}
