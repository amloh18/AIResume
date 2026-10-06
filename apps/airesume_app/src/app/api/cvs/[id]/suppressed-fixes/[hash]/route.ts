/**
 * Delete Suppressed Fix API
 * Remove a fix from suppression list
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV } from '@/models';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

// DELETE - Remove a fix from suppression list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; hash: string }> }
) {
  try {
    await getConnection();
    
    // Check authentication
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id, hash } = await params;
    const userId = authResult.userId;
    
    // Verify CV ownership
    const cv = await CV.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    if (!cv) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }
    
    // Get database collection
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    const suppressedFixesCollection = db.collection('usercvsuppressions');
    
    // Delete suppression
    const result = await suppressedFixesCollection.deleteOne({
      cv_id: new mongoose.Types.ObjectId(id),
      fix_signature_hash: hash,
      user_id: new mongoose.Types.ObjectId(userId)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Suppression not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Suppression removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing suppression:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove suppression' },
      { status: 500 }
    );
  }
}








