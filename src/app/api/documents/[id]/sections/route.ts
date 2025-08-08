import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentService } from '@/lib/services/document-service';
import mongoose from 'mongoose';

// POST /api/documents/[id]/sections - Add a new section to a document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const body = await request.json();
    const { sectionKey } = body;

    if (!sectionKey) {
      return NextResponse.json(
        { error: 'Section key is required' },
        { status: 400 }
      );
    }

    const document = await DocumentService.addSection(
      new mongoose.Types.ObjectId(documentId),
      sectionKey,
      new mongoose.Types.ObjectId(session.user.id)
    );

    return NextResponse.json({ document }, { status: 201 });

  } catch (error) {
    console.error('Error adding section:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add section' },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id]/sections - Reorder sections in a document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const body = await request.json();
    const { newOrder } = body;

    if (!Array.isArray(newOrder)) {
      return NextResponse.json(
        { error: 'New order must be an array of section keys' },
        { status: 400 }
      );
    }

    const document = await DocumentService.reorderSections(
      new mongoose.Types.ObjectId(documentId),
      newOrder
    );

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Error reordering sections:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder sections' },
      { status: 500 }
    );
  }
} 