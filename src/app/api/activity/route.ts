import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { createErrorResponse } from '@/lib/db-utils';

// Create a simple activity model for this endpoint
interface Activity {
  userId: string;
  type: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}

// In-memory storage for activities (in production, use a proper database)
let activities: Activity[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const types = searchParams.getAll('types');
    const limit = searchParams.get('limit');
    const since = searchParams.get('since');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Filter activities by user
    let filteredActivities = activities.filter(activity => activity.userId === userId);

    // Filter by types if specified
    if (types.length > 0) {
      filteredActivities = filteredActivities.filter(activity => 
        types.includes(activity.type)
      );
    }

    // Filter by date if specified
    if (since) {
      const sinceDate = new Date(since);
      filteredActivities = filteredActivities.filter(activity => 
        activity.createdAt >= sinceDate
      );
    }

    // Sort by creation date (newest first)
    filteredActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit if specified
    if (limit) {
      filteredActivities = filteredActivities.slice(0, parseInt(limit));
    }

    return NextResponse.json({
      success: true,
      data: {
        activities: filteredActivities
      }
    });

  } catch (error: any) {
    console.error('Get activities error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, description, metadata } = body;

    if (!userId || !type || !description) {
      return NextResponse.json(
        { success: false, message: 'User ID, type, and description are required' },
        { status: 400 }
      );
    }

    const activity: Activity = {
      userId,
      type,
      description,
      metadata,
      createdAt: new Date()
    };

    // Add to in-memory storage
    activities.push(activity);

    // Keep only the last 1000 activities to prevent memory issues
    if (activities.length > 1000) {
      activities = activities.slice(-1000);
    }

    return NextResponse.json({
      success: true,
      message: 'Activity logged successfully',
      data: {
        activity
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Log activity error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
