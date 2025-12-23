/**
 * Suppressed Fixes API
 * Manages persistent suppression of CV fixes across sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV } from '@/models';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

// MongoDB Schema for Suppressed Fixes (inline, can be moved to models later)
interface SuppressedFixDocument {
  cv_id: mongoose.Types.ObjectId;
  fix_signature_hash: string;
  fix_id?: string;
  user_id: mongoose.Types.ObjectId;
  reason: string;
  field_path: string;
  original_issue: string;
  timestamp: Date;
  created_at: Date;
}

// GET - Retrieve suppressed fixes for a CV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    
    const { id } = await params;
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
    
    // Get suppressed fixes from database
    // Using a collection name for suppressed fixes
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    const suppressedFixesCollection = db.collection('usercvsuppressions');
    const suppressedFixes = await suppressedFixesCollection
      .find({
        cv_id: new mongoose.Types.ObjectId(id),
        user_id: new mongoose.Types.ObjectId(userId)
      })
      .toArray();
    
    // Transform to API format
    const result = {
      suppressedFixHashes: suppressedFixes.map(f => f.fix_signature_hash).filter(Boolean),
      suppressedFixIds: suppressedFixes.map(f => f.fix_id).filter(Boolean),
      suppressedFixes: suppressedFixes.map(f => ({
        fixId: f.fix_id,
        fixSignatureHash: f.fix_signature_hash,
        fieldPath: f.field_path,
        originalIssue: f.original_issue,
        reason: f.reason,
        suppressedAt: f.timestamp?.getTime() || f.created_at?.getTime()
      }))
    };
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error fetching suppressed fixes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch suppressed fixes' },
      { status: 500 }
    );
  }
}

// POST - Add a fix to suppression list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    
    const { id } = await params;
    const userId = authResult.userId;
    const body = await request.json();
    
    const {
      fixId,
      fixSignatureHash,
      reason,
      fieldPath,
      originalIssue
    } = body;
    
    // Validate required fields
    if (!fixSignatureHash || !reason || !fieldPath || !originalIssue) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fixSignatureHash, reason, fieldPath, originalIssue' },
        { status: 400 }
      );
    }
    
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
    
    // Check if already suppressed
    const existing = await suppressedFixesCollection.findOne({
      cv_id: new mongoose.Types.ObjectId(id),
      fix_signature_hash: fixSignatureHash,
      user_id: new mongoose.Types.ObjectId(userId)
    });
    
    if (existing) {
      // Already suppressed, return success
      return NextResponse.json({
        success: true,
        message: 'Fix already suppressed',
        suppressedFix: {
          fixId: existing.fix_id,
          fixSignatureHash: existing.fix_signature_hash,
          suppressedAt: existing.timestamp?.getTime() || existing.created_at?.getTime()
        }
      });
    }
    
    // Create suppression document
    const suppressionDoc: SuppressedFixDocument = {
      cv_id: new mongoose.Types.ObjectId(id),
      fix_signature_hash: fixSignatureHash,
      fix_id: fixId,
      user_id: new mongoose.Types.ObjectId(userId),
      reason,
      field_path: fieldPath,
      original_issue: originalIssue,
      timestamp: new Date(),
      created_at: new Date()
    };
    
    // Insert into database
    await suppressedFixesCollection.insertOne(suppressionDoc);
    
    // Create index for faster lookups (idempotent)
    try {
      await suppressedFixesCollection.createIndex(
        { cv_id: 1, fix_signature_hash: 1, user_id: 1 },
        { unique: true, background: true }
      );
    } catch (indexError: any) {
      // Index might already exist, ignore error
      if (!indexError.message?.includes('already exists')) {
        console.warn('Failed to create index:', indexError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Fix suppressed successfully',
      suppressedFix: {
        fixId,
        fixSignatureHash,
        suppressedAt: suppressionDoc.timestamp.getTime()
      }
    });
  } catch (error: any) {
    console.error('Error suppressing fix:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to suppress fix' },
      { status: 500 }
    );
  }
}








