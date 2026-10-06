import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import { toObjectId } from '@/lib/db-utils';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();

    // Ownership is decided by the session, never by the request body. This route previously trusted a
    // caller-supplied `userId`, so anyone who knew a CV id could rewrite another user's title,
    // description and AI analysis — `/api/cvs` is also in the proxy's public allowlist, so it was
    // reachable without a session at all. The `userId` field is now ignored if still sent.
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authResult.userId;

    const { id: cvId } = await params;
    const { title, description, aiAnalysis, lastModified } = await request.json();

    console.log('🔍 CV Metadata Update - Request:', { cvId, userId, title, description, hasAiAnalysis: !!aiAnalysis });

    // Convert string IDs to ObjectIds for database query
    const cvObjectId = toObjectId(cvId);
    const userObjectId = toObjectId(userId);
    
    // Find the CV and verify ownership
    const cv = await CV.findOne({ _id: cvObjectId, userId: userObjectId });
    
    if (!cv) {
      return NextResponse.json(
        { error: 'CV not found or access denied' },
        { status: 404 }
      );
    }
    
    // Update metadata
    const updateData: any = {};
    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    if (aiAnalysis !== undefined) {
      updateData['metadata.aiAnalysis'] = aiAnalysis;
    }
    
    // Update last modified timestamp
    updateData['metadata.lastModified'] = lastModified ? new Date(lastModified) : new Date();
    
    console.log('🔍 CV Metadata Update - Update data:', updateData);
    
    const updatedCV = await CV.findByIdAndUpdate(
      cvObjectId,
      { $set: updateData },
      { new: true }
    );
    
    console.log('✅ CV Metadata Update - Success:', { 
      title: updatedCV.title,
      description: updatedCV.description 
    });
    
    return NextResponse.json({
      success: true,
      data: {
        title: updatedCV.title,
        description: updatedCV.description,
        lastModified: updatedCV.metadata.lastModified
      }
    });
    
  } catch (error) {
    console.error('❌ CV Metadata Update - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update CV metadata' },
      { status: 500 }
    );
  }
}
