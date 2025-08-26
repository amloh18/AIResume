import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import CV from '@/models/CV';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cvId = params.id;
    const { userId, title, description } = await request.json();
    
    console.log('🔍 CV Metadata Update - Request:', { cvId, userId, title, description });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find the CV and verify ownership
    const cv = await CV.findOne({ _id: cvId, userId });
    
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
    
    // Update last modified timestamp
    updateData['metadata.lastModified'] = new Date();
    
    console.log('🔍 CV Metadata Update - Update data:', updateData);
    
    const updatedCV = await CV.findByIdAndUpdate(
      cvId,
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
