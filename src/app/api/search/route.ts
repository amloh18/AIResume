import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';
import ApplicationJourney from '@/models/ApplicationJourney';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          jobs: [],
          cvs: [],
          coverLetters: []
        }
      });
    }

    const searchRegex = new RegExp(query, 'i');
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Search Jobs
    const jobs = await JobApplication.find({
      userId: userIdObj,
      $or: [
        { jobTitle: searchRegex },
        { company: searchRegex },
        { location: searchRegex },
        { jobDescription: searchRegex }
      ],
      isArchived: { $ne: true }
    })
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

    // Search CVs
    const cvs = await CV.find({
      userId: userIdObj,
      $or: [
        { title: searchRegex },
        { 'cvData.basics.name': searchRegex },
        { 'cvData.basics.label': searchRegex },
        { 'cvData.basics.email': searchRegex }
      ],
      status: { $ne: 'archived' }
    })
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

    // Search Cover Letters
    const coverLetters = await CoverLetter.find({
      userId: userIdObj,
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { 'metadata.targetCompany': searchRegex },
        { 'metadata.targetPosition': searchRegex }
      ],
      status: { $ne: 'archived' }
    })
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

    // Get journey info for CVs and Cover Letters
    const cvJourneyIds = cvs.map(cv => cv.journeyId).filter(Boolean);
    const coverLetterJourneyIds = coverLetters.map(cl => cl.journeyId).filter(Boolean);
    const allJourneyIds = [...new Set([...cvJourneyIds, ...coverLetterJourneyIds])];

    let journeysMap = new Map();
    if (allJourneyIds.length > 0) {
      const journeys = await ApplicationJourney.find({
        $or: [
          { journeyId: { $in: allJourneyIds } },
          { cvId: { $in: cvs.map(cv => cv._id.toString()) } },
          { coverLetterId: { $in: coverLetters.map(cl => cl._id.toString()) } }
        ]
      }).lean();
      
      journeys.forEach(journey => {
        if (journey.cvId) {
          journeysMap.set(journey.cvId.toString(), journey);
        }
        if (journey.coverLetterId) {
          journeysMap.set(journey.coverLetterId.toString(), journey);
        }
        if (journey.journeyId) {
          journeysMap.set(journey.journeyId, journey);
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          id: job._id.toString(),
          type: 'job',
          title: job.jobTitle,
          company: job.company,
          location: job.location,
          status: job.status,
          updatedAt: job.updatedAt
        })),
        cvs: cvs.map(cv => {
          const journey = cv.journeyId ? journeysMap.get(cv.journeyId.toString()) : null;
          const cvIdStr = cv._id.toString();
          const journeyByCvId = journeysMap.get(cvIdStr);
          const finalJourney = journey || journeyByCvId;
          
          return {
            id: cvIdStr,
            type: 'cv',
            title: cv.title,
            journeyId: finalJourney?.journeyId || cv.journeyId,
            jobId: finalJourney?.jobId,
            updatedAt: cv.updatedAt,
            isMaster: cv.metadata?.isMaster || false
          };
        }),
        coverLetters: coverLetters.map(cl => {
          const journey = cl.journeyId ? journeysMap.get(cl.journeyId.toString()) : null;
          const clIdStr = cl._id.toString();
          const journeyByClId = journeysMap.get(clIdStr);
          const finalJourney = journey || journeyByClId;
          
          return {
            id: clIdStr,
            type: 'coverLetter',
            title: cl.title,
            journeyId: finalJourney?.journeyId || cl.journeyId,
            jobId: finalJourney?.jobId,
            targetCompany: cl.metadata?.targetCompany,
            updatedAt: cl.updatedAt
          };
        })
      }
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

