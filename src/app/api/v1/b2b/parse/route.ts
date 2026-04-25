import { NextRequest, NextResponse } from 'next/server';
import { withB2BAuth } from '@/lib/middleware/b2b-auth';
import { robustDocumentParser } from '@/app/api/cv/parse/route';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';

export async function POST(req: NextRequest, context: any) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parseResult = await robustDocumentParser(buffer, file.type);

      if (parseResult.error) {
        return NextResponse.json({ error: parseResult.error, details: parseResult.details }, { status: 500 });
      }

      const cvData = parseResult.cvData;

      // Save to database to appear in Smart Roster
      await getConnection();
      const candidate = new B2BCandidate({
        tenantId: tenant._id,
        firstName: cvData?.basics?.name?.split(' ')[0] || '',
        lastName: cvData?.basics?.name?.split(' ').slice(1).join(' ') || '',
        email: cvData?.basics?.email || '',
        phone: cvData?.basics?.phone || '',
        cvData: cvData,
        status: 'new'
      });
      await candidate.save();

      return NextResponse.json({
        success: true,
        data: cvData,
        candidateId: candidate._id,
        metadata: {
          tenantId: tenant._id,
          environment: apiKey.environment
        }
      });
    } catch (error: any) {
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }, ['parse']);
}
