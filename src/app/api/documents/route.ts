import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentService } from '@/lib/services/document-service';
import { Document, Template } from '@/models';
import mongoose from 'mongoose';

// GET /api/documents - Get all documents for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const query: any = { userId: new mongoose.Types.ObjectId(session.user.id) };
    
    if (status) {
      query.status = status;
    }

    const documents = await Document.find(query)
      .populate('template', 'name category globalStyles')
      .sort({ 'metadata.lastModified': -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const total = await Document.countDocuments(query);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create a new document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, title, description } = body;

    if (!templateId || !title) {
      return NextResponse.json(
        { error: 'Template ID and title are required' },
        { status: 400 }
      );
    }

    const document = await DocumentService.createDocument(
      new mongoose.Types.ObjectId(session.user.id),
      new mongoose.Types.ObjectId(templateId),
      title,
      description
    );

    return NextResponse.json({ document }, { status: 201 });

  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
} 