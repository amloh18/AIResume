import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import CoverLetter from '@/models/CoverLetter';
import { toObjectId } from '@/lib/db-utils';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updatedAt';
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');

    const cvId = searchParams.get('cvId');
    const journeyId = searchParams.get('journeyId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create base query - ensure userId is ObjectId for index usage
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    let query = CoverLetter.find({ userId: normalizedUserId });

    // Add cvId filter
    if (cvId) {
      query = query.find({ cvId: mongoose.Types.ObjectId.isValid(cvId) ? new mongoose.Types.ObjectId(cvId) : cvId });
    }

    // Add journeyId filter
    if (journeyId) {
      query = query.find({ journeyId: mongoose.Types.ObjectId.isValid(journeyId) ? new mongoose.Types.ObjectId(journeyId) : journeyId });
    }

    // Add status filter
    if (status && status !== 'all') {
      query = query.find({ userId: normalizedUserId, status });
    }

    // Add search filter if provided
    if (search) {
      const searchFilter = {
        userId: normalizedUserId,
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

    // Calculate counts for different statuses - use normalized userId
    const counts = await Promise.all([
      CoverLetter.countDocuments({ userId: normalizedUserId }),
      CoverLetter.countDocuments({ userId: normalizedUserId, status: 'draft' }),
      CoverLetter.countDocuments({ userId: normalizedUserId, status: 'final' }),
      CoverLetter.countDocuments({ userId: normalizedUserId, status: 'archived' })
    ]);

    const [total, drafts, final, archived] = counts;

    // Transform data for response
    const transformedCoverLetters = coverLetters.map(cl => ({
      id: cl._id,
      title: cl.title,
      content: cl.content,
      header: cl.header,
      body: cl.body,
      footer: cl.footer,
      cvId: cl.cvId,
      journeyId: cl.journeyId,
      jobId: cl.jobId,
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
    console.log('📝 POST /api/cover-letters - Payload:', JSON.stringify(body, null, 2));

    // Debug: Check active Mongoose model schema
    const schemaContentPath = CoverLetter.schema.path('content');
    console.log('🔍 Debug: CoverLetter schema path "content" required:', schemaContentPath?.isRequired);
    console.log('🔍 Debug: CoverLetter schema path "content" options:', schemaContentPath?.options);

    const { userId, title, content, header, body: bodyContent, footer, targetCompany, targetPosition, keywords, jobId, cvId, journeyId, status, metadata } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { success: false, message: 'User ID and title are required' },
        { status: 400 }
      );
    }

    // If header/body/footer are provided, use them; otherwise use content
    // If content is not provided and header/body/footer are not provided, return error
    // Relaxed validation: Allow saving if we have title/userId (checked above)
    // even if content/header/body/footer are empty (e.g. initializing a draft)
    /*
    if (!content && !header && !bodyContent && !footer) {
      return NextResponse.json(
        { success: false, message: 'Either content or header/body/footer must be provided' },
        { status: 400 }
      );
    }
    */

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

    // Check if cover letter already exists for this journey to prevent duplicates
    if (journeyId) {
      const existingCoverLetter = await CoverLetter.findOne({
        journeyId: journeyId,
        userId: toObjectId(userId)
      });

      if (existingCoverLetter) {
        console.log('✅ Cover Letter API - Found existing cover letter for journey:', existingCoverLetter._id);
        return NextResponse.json({
          success: true,
          data: {
            id: existingCoverLetter._id,
            title: existingCoverLetter.title,
            content: existingCoverLetter.content,
            status: existingCoverLetter.status,
            jobId: existingCoverLetter.jobId,
            cvId: existingCoverLetter.cvId,
            journeyId: existingCoverLetter.journeyId,
            userId: existingCoverLetter.userId,
            lastModified: existingCoverLetter.metadata.lastModified,
            createdAt: existingCoverLetter.createdAt,
            updatedAt: existingCoverLetter.updatedAt,
            metadata: existingCoverLetter.metadata
          }
        });
      }
    }

    // DO NOT merge content - store header, body, footer separately
    // Content will be generated on-the-fly in preview only
    const coverLetter = new CoverLetter({
      userId,
      title,
      content: content || bodyContent || ' ',
      header: header || undefined,
      body: bodyContent || content || undefined,
      footer: footer || undefined,
      status: status || 'draft',
      jobId,
      cvId,
      journeyId: journeyId || undefined,
      metadata: coverLetterMetadata
    });

    await coverLetter.save();

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
        lastModified: coverLetter.metadata?.lastModified || coverLetter.updatedAt || new Date(),
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
    const { id, title, content, header, body: bodyContent, footer, status, targetCompany, targetPosition, keywords, cvId, jobId, journeyId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Cover letter ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (header !== undefined) updateData.header = header;
    if (bodyContent !== undefined) updateData.body = bodyContent;
    if (footer !== undefined) updateData.footer = footer;
    if (status) updateData.status = status;
    if (cvId !== undefined) updateData.cvId = cvId;
    if (jobId !== undefined) updateData.jobId = jobId;
    if (journeyId !== undefined) updateData.journeyId = journeyId;
    if (targetCompany !== undefined) updateData['metadata.targetCompany'] = targetCompany;
    if (targetPosition !== undefined) updateData['metadata.targetPosition'] = targetPosition;
    if (keywords) updateData['metadata.keywords'] = keywords;

    // DO NOT merge into content - leave content empty or undefined
    // Content will be generated on-the-fly in preview only

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
        header: coverLetter.header,
        body: coverLetter.body,
        footer: coverLetter.footer,
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
