import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { parseDocument } from '@/lib/services/aiCVParser';
import B2BCandidate from '@/models/b2b/B2BCandidate';

export async function POST(req: NextRequest, { params }: { params: { slug: string, jobId: string } }) {
  try {
    const { tenantId, jobId } = params as any; // Passed as query params from the client actually, or we can resolve it again.
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const resolvedTenantId = formData.get('tenantId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    await getConnection();
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse the document using AI
    const cvData = await parseDocument(buffer, file.type, file.name);

    // Save candidate
    const newCandidate = await B2BCandidate.create({
      tenantId: resolvedTenantId,
      firstName: cvData?.basics?.name?.split(' ')[0] || '',
      lastName: cvData?.basics?.name?.split(' ').slice(1).join(' ') || '',
      email: cvData?.basics?.email || '',
      phone: cvData?.basics?.phone || '',
      cvData,
      status: 'new',
      metadata: {
        jobId: params.jobId,
        source: 'careers_page'
      }
    });

    return NextResponse.json({ success: true, data: { message: 'Application submitted successfully' } }, { status: 201 });
  } catch (error: any) {
    console.error('Apply Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
