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

    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'i');
    
    // Handle userId - can be ObjectId or string
    let userIdObj;
    try {
      userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    } catch (e) {
      userIdObj = userId; // Fallback to string if conversion fails
    }

    // Search Jobs - try both ObjectId and string userId
    let jobs = [];
    try {
      // Try with ObjectId first
      const jobQuery: any = {
        $or: [
          { jobTitle: searchRegex },
          { company: searchRegex },
          { location: searchRegex },
          { jobDescription: searchRegex }
        ],
        isArchived: { $ne: true }
      };
      
      // Support both ObjectId and string userId
      if (mongoose.Types.ObjectId.isValid(userId)) {
        jobQuery.userId = { $in: [new mongoose.Types.ObjectId(userId), userId] };
      } else {
        jobQuery.userId = userId;
      }
      
      jobs = await JobApplication.find(jobQuery)
        .limit(limit)
        .sort({ updatedAt: -1 })
        .lean();
      console.log(`Found ${jobs.length} jobs for query: ${query}, userId: ${userId}`);
    } catch (jobError) {
      console.error('Error searching jobs:', jobError);
      jobs = [];
    }

    // Search CVs
    let cvs = [];
    try {
      const cvQuery: any = {
        $or: [
          { title: searchRegex },
          { 'cvData.basics.name': searchRegex },
          { 'cvData.basics.label': searchRegex },
          { 'cvData.basics.email': searchRegex }
        ],
        status: { $ne: 'archived' }
      };
      
      if (mongoose.Types.ObjectId.isValid(userId)) {
        cvQuery.userId = { $in: [new mongoose.Types.ObjectId(userId), userId] };
      } else {
        cvQuery.userId = userId;
      }
      
      cvs = await CV.find(cvQuery)
        .limit(limit)
        .sort({ updatedAt: -1 })
        .lean();
    } catch (cvError) {
      console.error('Error searching CVs:', cvError);
      cvs = [];
    }

    // Search Cover Letters
    let coverLetters = [];
    try {
      const clQuery: any = {
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { 'metadata.targetCompany': searchRegex },
          { 'metadata.targetPosition': searchRegex }
        ],
        status: { $ne: 'archived' }
      };
      
      if (mongoose.Types.ObjectId.isValid(userId)) {
        clQuery.userId = { $in: [new mongoose.Types.ObjectId(userId), userId] };
      } else {
        clQuery.userId = userId;
      }
      
      coverLetters = await CoverLetter.find(clQuery)
        .limit(limit)
        .sort({ updatedAt: -1 })
        .lean();
    } catch (clError) {
      console.error('Error searching Cover Letters:', clError);
      coverLetters = [];
    }

    // Get journey info for CVs and Cover Letters
    const cvJourneyIds = cvs.map(cv => cv.journeyId).filter(Boolean);
    const coverLetterJourneyIds = coverLetters.map(cl => cl.journeyId).filter(Boolean);
    const allJourneyIds = [...new Set([...cvJourneyIds, ...coverLetterJourneyIds])];

    let journeysMap = new Map();
    if (allJourneyIds.length > 0 || cvs.length > 0 || coverLetters.length > 0) {
      try {
        const cvIds = cvs.map(cv => cv._id).filter(Boolean);
        const coverLetterIds = coverLetters.map(cl => cl._id).filter(Boolean);
        
        const journeyQueries = [];
        if (allJourneyIds.length > 0) {
          journeyQueries.push({ journeyId: { $in: allJourneyIds } });
        }
        if (cvIds.length > 0) {
          journeyQueries.push({ cvId: { $in: cvIds } });
        }
        if (coverLetterIds.length > 0) {
          journeyQueries.push({ coverLetterId: { $in: coverLetterIds } });
        }
        
        if (journeyQueries.length > 0) {
          const journeys = await ApplicationJourney.find({
            $or: journeyQueries
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
      } catch (journeyError) {
        console.error('Error fetching journeys:', journeyError);
        // Continue without journey data
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          id: job._id?.toString() || '',
          type: 'job',
          title: job.jobTitle || '',
          company: job.company || '',
          location: job.location || '',
          status: job.status || 'created',
          updatedAt: job.updatedAt || job.createdAt || new Date().toISOString()
        })),
        cvs: cvs.map(cv => {
          try {
            const journey = cv.journeyId ? journeysMap.get(cv.journeyId?.toString()) : null;
            const cvIdStr = cv._id?.toString() || '';
            const journeyByCvId = cvIdStr ? journeysMap.get(cvIdStr) : null;
            const finalJourney = journey || journeyByCvId;
            
            return {
              id: cvIdStr,
              type: 'cv',
              title: cv.title || '',
              journeyId: finalJourney?.journeyId || cv.journeyId || undefined,
              jobId: finalJourney?.jobId || undefined,
              updatedAt: cv.updatedAt || cv.createdAt || new Date().toISOString(),
              isMaster: cv.metadata?.isMaster || false
            };
          } catch (cvError) {
            console.error('Error mapping CV:', cvError, cv);
            return {
              id: cv._id?.toString() || '',
              type: 'cv',
              title: cv.title || '',
              updatedAt: cv.updatedAt || cv.createdAt || new Date().toISOString(),
              isMaster: false
            };
          }
        }),
        coverLetters: coverLetters.map(cl => {
          try {
            const journey = cl.journeyId ? journeysMap.get(cl.journeyId?.toString()) : null;
            const clIdStr = cl._id?.toString() || '';
            const journeyByClId = clIdStr ? journeysMap.get(clIdStr) : null;
            const finalJourney = journey || journeyByClId;
            
            return {
              id: clIdStr,
              type: 'coverLetter',
              title: cl.title || '',
              journeyId: finalJourney?.journeyId || cl.journeyId || undefined,
              jobId: finalJourney?.jobId || undefined,
              targetCompany: cl.metadata?.targetCompany || undefined,
              updatedAt: cl.updatedAt || cl.createdAt || new Date().toISOString()
            };
          } catch (clError) {
            console.error('Error mapping Cover Letter:', clError, cl);
            return {
              id: cl._id?.toString() || '',
              type: 'coverLetter',
              title: cl.title || '',
              updatedAt: cl.updatedAt || cl.createdAt || new Date().toISOString()
            };
          }
        })
      }
    });
  } catch (error: any) {
    console.error('Search error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Search failed',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

