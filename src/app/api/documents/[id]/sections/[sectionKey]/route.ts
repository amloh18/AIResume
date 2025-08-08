import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentService } from '@/lib/services/document-service';
import mongoose from 'mongoose';

// PUT /api/documents/[id]/sections/[sectionKey] - Update section content
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; sectionKey: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId, sectionKey } = params;
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const body = await request.json();
    const { items, styles, isVisible } = body;

    const document = await DocumentService.getDocumentWithTemplate(
      new mongoose.Types.ObjectId(documentId)
    );

    // Check ownership
    if (document.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const section = document.content.find(s => s.sectionKey === sectionKey);
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Update section content
    if (items !== undefined) {
      section.items = items;
    }
    if (styles !== undefined) {
      section.styles = { ...section.styles, ...styles };
    }
    if (isVisible !== undefined) {
      section.isVisible = isVisible;
    }

    section.metadata.updatedAt = new Date();
    section.metadata.createdBy = new mongoose.Types.ObjectId(session.user.id);

    await document.save();

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id]/sections/[sectionKey] - Remove a section from a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sectionKey: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId, sectionKey } = params;
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const document = await DocumentService.removeSection(
      new mongoose.Types.ObjectId(documentId),
      sectionKey
    );

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Error removing section:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove section' },
      { status: 500 }
    );
  }
} 