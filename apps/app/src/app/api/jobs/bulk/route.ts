// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import JobApplication from '@/models/JobApplication';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const { operation, jobIds, updates } = body;

    if (!operation || !jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request. Operation and jobIds are required.' },
        { status: 400 }
      );
    }

    // Validate that all jobs belong to the user
    const jobs = await JobApplication.find({
      _id: { $in: jobIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
      userId: mixedIdFilter(userId)
    });

    if (jobs.length !== jobIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some jobs not found or unauthorized' },
        { status: 403 }
      );
    }

    let result;

    switch (operation) {
      case 'updateStatus':
        if (!updates?.status) {
          return NextResponse.json(
            { success: false, error: 'Status is required for updateStatus operation' },
            { status: 400 }
          );
        }
        result = await JobApplication.updateMany(
          { _id: { $in: jobIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
          { $set: { status: updates.status, updatedAt: new Date() } }
        );
        break;

      case 'updatePriority':
        if (!updates?.priority) {
          return NextResponse.json(
            { success: false, error: 'Priority is required for updatePriority operation' },
            { status: 400 }
          );
        }
        result = await JobApplication.updateMany(
          { _id: { $in: jobIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
          { $set: { priority: updates.priority, updatedAt: new Date() } }
        );
        break;

      case 'addTags':
        if (!updates?.tags || !Array.isArray(updates.tags)) {
          return NextResponse.json(
            { success: false, error: 'Tags array is required for addTags operation' },
            { status: 400 }
          );
        }
        result = await JobApplication.updateMany(
          { _id: { $in: jobIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
          { 
            $addToSet: { tags: { $each: updates.tags } },
            $set: { updatedAt: new Date() }
          }
        );
        break;

      case 'delete':
        result = await JobApplication.deleteMany({
          _id: { $in: jobIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        operation,
        affectedCount: result.modifiedCount || result.deletedCount || 0,
        jobIds
      }
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

