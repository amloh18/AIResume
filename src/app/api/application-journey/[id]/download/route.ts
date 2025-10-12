import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';
import { ZipDownloadService } from '@/lib/services/zipDownloadService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const journeyId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const downloadType = searchParams.get('type') || 'all';

    // Get journey data
    const journey = await ApplicationJourney.findOne({
      _id: journeyId,
      userId: session.user.id
    });

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Get job data
    const job = await JobApplication.findOne({
      _id: journey.jobId,
      userId: session.user.id
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get CV and Cover Letter data if needed
    let cvData = null;
    let coverLetterData = null;

    if (journey.cvId) {
      cvData = await CV.findOne({
        _id: journey.cvId,
        userId: session.user.id
      });
    }

    if (journey.coverLetterId) {
      coverLetterData = await CoverLetter.findOne({
        _id: journey.coverLetterId,
        userId: session.user.id
      });
    }

    // Prepare journey data for service
    const journeyData = {
      id: journey._id.toString(),
      jobTitle: journey.jobTitle,
      company: journey.company,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      jobId: journey.jobId,
      atsScore: journey.atsScore,
      completedAt: journey.completedAt,
      journeyDuration: journey.journeyDuration
    };

    // Prepare job data for service
    const jobData = {
      id: job._id.toString(),
      title: job.jobTitle,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      qualifications: job.qualifications,
      benefits: job.benefits,
      url: job.jobUrl,
      deadline: job.deadline
    };

    let fileBlob: Blob;
    let filename: string;

    if (downloadType === 'all') {
      // Generate ZIP file with all documents
      fileBlob = await ZipDownloadService.generateApplicationZip(
        journeyData,
        jobData,
        cvData,
        coverLetterData
      );
      filename = `${journey.jobTitle} - Application Files.zip`;
    } else {
      // Generate individual file
      fileBlob = await ZipDownloadService.generateIndividualFile(
        downloadType as 'cv' | 'coverLetter' | 'jobDescription',
        journeyData,
        jobData,
        cvData,
        coverLetterData
      );
      
      const extension = downloadType === 'cv' || downloadType === 'coverLetter' ? 'pdf' : 'pdf';
      filename = `${journey.jobTitle} - ${downloadType === 'cv' ? 'CV' : downloadType === 'coverLetter' ? 'Cover Letter' : 'Job Description'}.${extension}`;
    }

    // Update download history
    await ApplicationJourney.findByIdAndUpdate(journeyId, {
      $push: {
        downloadHistory: {
          type: downloadType === 'all' ? 'zip' : downloadType,
          downloadedAt: new Date()
        }
      }
    });

    // Return file
    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': downloadType === 'all' ? 'application/zip' : 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBlob.size.toString()
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download files' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { journeyId } = await request.json();

    // Get journey data
    const journey = await ApplicationJourney.findOne({
      _id: journeyId,
      userId: session.user.id
    });

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Get job data
    const job = await JobApplication.findOne({
      _id: journey.jobId,
      userId: session.user.id
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Prepare journey data for service
    const journeyData = {
      id: journey._id.toString(),
      jobTitle: journey.jobTitle,
      company: journey.company,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      jobId: journey.jobId,
      atsScore: journey.atsScore,
      completedAt: journey.completedAt,
      journeyDuration: journey.journeyDuration
    };

    // Get file size estimates
    const fileSizeEstimates = await ZipDownloadService.getFileSizeEstimates(journeyData);

    return NextResponse.json({ fileSizeEstimates });

  } catch (error) {
    console.error('File size estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate file sizes' },
      { status: 500 }
    );
  }
}
