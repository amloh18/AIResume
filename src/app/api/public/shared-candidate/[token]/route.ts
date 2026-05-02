import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import Tenant from '@/models/b2b/Tenant';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await getConnection();
    const { token } = await params;
    const candidate = await B2BCandidate.findOne({
      'metadata.shareToken': token
    }).lean<any>();

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found or link expired' }, { status: 404 });
    }

    const tenant = await Tenant.findById(candidate.tenantId).lean<any>();

    // Sanitize data for public viewing
    const publicData = {
      _id: candidate._id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      score: candidate.score,
      status: candidate.status,
      cvData: {
        basics: {
          name: candidate.cvData?.basics?.name,
          label: candidate.cvData?.basics?.label,
          summary: candidate.cvData?.basics?.summary,
          location: candidate.cvData?.basics?.location,
        },
        skills: candidate.cvData?.skills,
        work: candidate.cvData?.work,
        education: candidate.cvData?.education,
      },
      metadata: {
        jobTitle: candidate.metadata?.jobTitle,
        humanScorecard: candidate.metadata?.humanScorecard, // Show human notes
        clientFeedback: candidate.metadata?.clientFeedback // Show previous feedback
      },
      tenant: {
        name: tenant?.name,
        branding: tenant?.settings?.careersPage
      }
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    await getConnection();
    const { token } = await params;
    const body = await req.json();
    const { feedback, status } = body;

    const candidate = await B2BCandidate.findOne({
      'metadata.shareToken': token
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.metadata) candidate.metadata = {};
    candidate.metadata.clientFeedback = {
      status, // e.g., 'approved', 'rejected'
      notes: feedback,
      date: new Date()
    };
    
    // Optionally update the main status if approved/rejected by client
    if (status === 'rejected') {
      candidate.status = 'rejected';
    }

    await candidate.save();

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
