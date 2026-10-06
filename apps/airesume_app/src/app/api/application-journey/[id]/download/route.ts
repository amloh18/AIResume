import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import { ZipDownloadService } from '@/lib/services/zipDownloadService';
import { getCVWithTemplate } from '@/lib/cv-template-utils';

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
    const format = (searchParams.get('format') || 'pdf') as 'pdf' | 'docx' | 'doc';

    // Get journey data
    const journey = await ApplicationJourney.findOne({
      _id: journeyId,
      userId: session.user.id
    });

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Get job data - only required for 'all' or 'jobDescription' downloads
    let job = null;
    if (downloadType === 'all' || downloadType === 'jobDescription') {
      job = await JobApplication.findOne({
        _id: journey.jobId,
        userId: mixedIdFilter(session.user.id)
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    } else {
      // For CV or Cover Letter downloads, try to get job but don't fail if missing
      try {
        job = await JobApplication.findOne({
          _id: journey.jobId,
          userId: mixedIdFilter(session.user.id)
        });
      } catch (error) {
        // Job lookup failed, but we can still proceed with CV/Cover Letter download
        console.warn('Job lookup failed for CV/Cover Letter download:', error);
        job = null;
      }
    }

    // Get CV and Cover Letter data if needed
    let cvData = null;
    let coverLetterData = null;
    let cvTemplate = null;

    if (journey.cvId) {
      try {
        // Get CV with template
        const cvWithTemplate = await getCVWithTemplate(journey.cvId.toString());
        if (cvWithTemplate) {
          cvData = cvWithTemplate;
          
          // Always get the full template object (not just the partial from getCVWithTemplate)
          const templateIdStr = cvWithTemplate.templateId?.toString() || '';
          if (templateIdStr) {
            const { getTemplateById } = await import('@/lib/templates/template-utils');
            const hardcodedTemplate = getTemplateById(templateIdStr);
            if (hardcodedTemplate) {
              cvTemplate = hardcodedTemplate;
            } else {
              const { Template } = await import('@/models');
              if (mongoose.Types.ObjectId.isValid(templateIdStr)) {
                cvTemplate = await Template.findById(templateIdStr);
              }
            }
          }
          
          // If still no template, try using the partial template from getCVWithTemplate as last resort
          if (!cvTemplate && cvWithTemplate.template) {
            cvTemplate = cvWithTemplate.template;
          }
        }
      } catch (error) {
        console.error('Error fetching CV data:', error);
        // Continue without CV data - will be handled by service
      }
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

    // Prepare job data for service - use journey data as fallback if job is missing
    const jobAny = job as any;
    const jobData = job ? {
      id: job._id.toString(),
      title: job.jobTitle,
      company: job.company,
      location: job.location,
      description: jobAny.jobDescription || jobAny.description,
      requirements: jobAny.requirements,
      qualifications: jobAny.qualifications,
      benefits: jobAny.benefits,
      url: job.jobUrl,
      deadline: job.deadline
    } : {
      id: journey.jobId || '',
      title: journey.jobTitle,
      company: journey.company,
      location: undefined,
      description: undefined,
      requirements: undefined,
      qualifications: undefined,
      benefits: undefined,
      url: undefined,
      deadline: undefined
    };

    let fileBlob: Blob;
    let filename: string;

    if (downloadType === 'all') {
      // Generate ZIP file with all documents
      fileBlob = await ZipDownloadService.generateApplicationZip(
        journeyData,
        jobData,
        cvData,
        coverLetterData,
        cvTemplate
      );
      filename = `${journey.jobTitle} - Application Files.zip`;
    } else {
      // Generate individual file
      fileBlob = await ZipDownloadService.generateIndividualFile(
        downloadType as 'cv' | 'coverLetter' | 'jobDescription',
        journeyData,
        jobData,
        cvData,
        coverLetterData,
        cvTemplate,
        format
      );
      
      const extension = format;
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

    // Determine content type based on format
    let contentType = 'application/pdf';
    if (downloadType === 'all') {
      contentType = 'application/zip';
    } else if (format === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (format === 'doc') {
      contentType = 'application/msword';
    }

    // Return file
    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBlob.size.toString()
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate download files';
    
    // Provide more specific error messages
    if (errorMessage.includes('template')) {
      return NextResponse.json(
        { error: `Template error: ${errorMessage}` },
        { status: 500 }
      );
    }
    if (errorMessage.includes('CV data')) {
      return NextResponse.json(
        { error: `CV data error: ${errorMessage}` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
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

    // Get job data - try to fetch but don't fail if missing (for file size estimates)
    let job = null;
    try {
      job = await JobApplication.findOne({
        _id: journey.jobId,
        userId: mixedIdFilter(session.user.id)
      });
    } catch (error) {
      // Job lookup failed, but we can still estimate file sizes
      console.warn('Job lookup failed for file size estimation:', error);
      job = null;
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
