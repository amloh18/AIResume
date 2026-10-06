// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';
import CoverLetter from '@/models/CoverLetter';
import { ApplicationJourney } from '@/models/ApplicationJourney';
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
    const query = (searchParams.get('q') || '').trim();
    const limit = parseInt(searchParams.get('limit') || '12', 10);

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
    
    // User ID matching (ObjectId and string)
    const userQueryFilter: any = {};
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userQueryFilter.userId = { $in: [new mongoose.Types.ObjectId(userId), userId] };
    } else {
      userQueryFilter.userId = userId;
    }

    // Build search queries
    const jobQuery: any = {
      ...userQueryFilter,
      $or: [
        { jobTitle: searchRegex },
        { company: searchRegex },
        { location: searchRegex },
        { jobDescription: searchRegex },
        { source: searchRegex },
        { notes: searchRegex },
        { tags: searchRegex }
      ],
      isArchived: { $ne: true }
    };

    const cvQuery: any = {
      ...userQueryFilter,
      $or: [
        { title: searchRegex },
        { 'cvData.basics.name': searchRegex },
        { 'cvData.basics.label': searchRegex },
        { 'cvData.basics.email': searchRegex },
        { 'cvData.basics.summary': searchRegex },
        { 'cvData.skills.category': searchRegex },
        { 'cvData.skills.skills': searchRegex },
        { 'cvData.work.name': searchRegex },
        { 'cvData.work.position': searchRegex },
        { 'cvData.work.summary': searchRegex },
        { 'metadata.jobTitle': searchRegex },
        { 'metadata.companyName': searchRegex }
      ],
      status: { $ne: 'archived' }
    };

    const clQuery: any = {
      ...userQueryFilter,
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { 'metadata.targetCompany': searchRegex },
        { 'metadata.targetPosition': searchRegex },
        { 'metadata.companyName': searchRegex },
        { 'metadata.jobTitle': searchRegex },
        { 'metadata.recipientName': searchRegex }
      ],
      status: { $ne: 'archived' }
    };

    // 1. Execute primary searches concurrently
    const [rawJobs, rawCvs, rawCoverLetters] = await Promise.all([
      JobApplication.find(jobQuery).limit(limit).sort({ updatedAt: -1 }).lean().catch(() => []),
      CV.find(cvQuery).limit(limit).sort({ updatedAt: -1 }).lean().catch(() => []),
      CoverLetter.find(clQuery).limit(limit).sort({ updatedAt: -1 }).lean().catch(() => []),
    ]);

    // 2. Collect IDs to fetch connected journeys
    const jobIds = rawJobs.map((j) => j._id?.toString()).filter(Boolean);
    const cvIds = rawCvs.map((c) => c._id?.toString()).filter(Boolean);
    const clIds = rawCoverLetters.map((cl) => cl._id?.toString()).filter(Boolean);

    const journeyIdsFromDocs = [
      ...rawJobs.map((j) => j.journeyId).filter(Boolean),
      ...rawCvs.map((c) => c.journeyId).filter(Boolean),
      ...rawCoverLetters.map((cl) => cl.journeyId).filter(Boolean),
    ];

    const journeyOrConditions: any[] = [];
    if (journeyIdsFromDocs.length > 0) journeyOrConditions.push({ journeyId: { $in: journeyIdsFromDocs } });
    if (jobIds.length > 0) journeyOrConditions.push({ jobId: { $in: jobIds } });
    if (cvIds.length > 0) journeyOrConditions.push({ cvId: { $in: cvIds } });
    if (clIds.length > 0) journeyOrConditions.push({ coverLetterId: { $in: clIds } });

    let journeys: any[] = [];
    if (journeyOrConditions.length > 0) {
      try {
        journeys = await ApplicationJourney.find({ $or: journeyOrConditions }).lean();
      } catch (err) {
        console.error('Error querying journeys in search:', err);
      }
    }

    // Maps for fast journey lookup
    const journeyByJobId = new Map<string, any>();
    const journeyByCvId = new Map<string, any>();
    const journeyByClId = new Map<string, any>();
    const journeyById = new Map<string, any>();

    journeys.forEach((j) => {
      if (j.journeyId) journeyById.set(j.journeyId.toString(), j);
      if (j.jobId) journeyByJobId.set(j.jobId.toString(), j);
      if (j.cvId) journeyByCvId.set(j.cvId.toString(), j);
      if (j.coverLetterId) journeyByClId.set(j.coverLetterId.toString(), j);
    });

    // 3. Find missing connected entities from journeys to show connected names
    const missingJobIds = new Set<string>();
    const missingCvIds = new Set<string>();
    const missingClIds = new Set<string>();

    journeys.forEach((j) => {
      if (j.jobId && !jobIds.includes(j.jobId.toString())) missingJobIds.add(j.jobId.toString());
      if (j.cvId && !cvIds.includes(j.cvId.toString())) missingCvIds.add(j.cvId.toString());
      if (j.coverLetterId && !clIds.includes(j.coverLetterId.toString())) missingClIds.add(j.coverLetterId.toString());
    });

    const [extraJobs, extraCvs, extraCls] = await Promise.all([
      missingJobIds.size > 0
        ? JobApplication.find({ _id: { $in: Array.from(missingJobIds) } }, 'jobTitle company location status').lean().catch(() => [])
        : [],
      missingCvIds.size > 0
        ? CV.find({ _id: { $in: Array.from(missingCvIds) } }, 'title metadata').lean().catch(() => [])
        : [],
      missingClIds.size > 0
        ? CoverLetter.find({ _id: { $in: Array.from(missingClIds) } }, 'title metadata').lean().catch(() => [])
        : [],
    ]);

    // Build entity lookup dictionaries
    const jobLookup = new Map<string, any>();
    rawJobs.forEach((j) => jobLookup.set(j._id.toString(), { id: j._id.toString(), title: j.jobTitle || 'Untitled Job', company: j.company || '', status: j.status || 'saved' }));
    extraJobs.forEach((j) => jobLookup.set(j._id.toString(), { id: j._id.toString(), title: j.jobTitle || 'Untitled Job', company: j.company || '', status: j.status || 'saved' }));

    const cvLookup = new Map<string, any>();
    rawCvs.forEach((c) => cvLookup.set(c._id.toString(), { id: c._id.toString(), title: c.title || 'Untitled CV', isMaster: !!c.metadata?.isMaster }));
    extraCvs.forEach((c) => cvLookup.set(c._id.toString(), { id: c._id.toString(), title: c.title || 'Untitled CV', isMaster: !!c.metadata?.isMaster }));

    const clLookup = new Map<string, any>();
    rawCoverLetters.forEach((cl) => clLookup.set(cl._id.toString(), { id: cl._id.toString(), title: cl.title || 'Untitled Cover Letter', targetCompany: cl.metadata?.targetCompany || '' }));
    extraCls.forEach((cl) => clLookup.set(cl._id.toString(), { id: cl._id.toString(), title: cl.title || 'Untitled Cover Letter', targetCompany: cl.metadata?.targetCompany || '' }));

    // 4. Transform and enrich Jobs
    const formattedJobs = rawJobs.map((job) => {
      const jobIdStr = job._id?.toString() || '';
      const journey = journeyByJobId.get(jobIdStr) || (job.journeyId ? journeyById.get(job.journeyId.toString()) : null);

      const connectedCv = journey?.cvId ? cvLookup.get(journey.cvId.toString()) : undefined;
      const connectedCoverLetter = journey?.coverLetterId ? clLookup.get(journey.coverLetterId.toString()) : undefined;

      return {
        id: jobIdStr,
        type: 'job',
        title: job.jobTitle || 'Untitled Position',
        company: job.company || 'Unknown Company',
        location: job.location || '',
        status: job.status || 'saved',
        updatedAt: job.updatedAt || job.createdAt || new Date().toISOString(),
        journeyId: journey?.journeyId || job.journeyId || undefined,
        connectedCv,
        connectedCoverLetter,
      };
    });

    // 5. Transform and enrich CVs
    const formattedCVs = rawCvs.map((cv) => {
      const cvIdStr = cv._id?.toString() || '';
      const journey = journeyByCvId.get(cvIdStr) || (cv.journeyId ? journeyById.get(cv.journeyId.toString()) : null);

      const connectedJob = journey?.jobId ? jobLookup.get(journey.jobId.toString()) : undefined;
      const connectedCoverLetter = journey?.coverLetterId ? clLookup.get(journey.coverLetterId.toString()) : undefined;

      const isMaster = !!cv.metadata?.isMaster || cv.title?.toLowerCase().includes('master');

      return {
        id: cvIdStr,
        type: 'cv',
        title: cv.title || (isMaster ? 'Master CV (Profile)' : 'Untitled CV'),
        isMaster,
        updatedAt: cv.updatedAt || cv.createdAt || new Date().toISOString(),
        journeyId: journey?.journeyId || cv.journeyId || undefined,
        connectedJob,
        connectedCoverLetter,
      };
    });

    // 6. Transform and enrich Cover Letters
    const formattedCoverLetters = rawCoverLetters.map((cl) => {
      const clIdStr = cl._id?.toString() || '';
      const journey = journeyByClId.get(clIdStr) || (cl.journeyId ? journeyById.get(cl.journeyId.toString()) : null);

      const connectedJob = journey?.jobId ? jobLookup.get(journey.jobId.toString()) : undefined;
      const connectedCv = journey?.cvId ? cvLookup.get(journey.cvId.toString()) : undefined;

      return {
        id: clIdStr,
        type: 'coverLetter',
        title: cl.title || 'Untitled Cover Letter',
        targetCompany: cl.metadata?.targetCompany || connectedJob?.company || undefined,
        updatedAt: cl.updatedAt || cl.createdAt || new Date().toISOString(),
        journeyId: journey?.journeyId || cl.journeyId || undefined,
        connectedJob,
        connectedCv,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          jobs: formattedJobs,
          cvs: formattedCVs,
          coverLetters: formattedCoverLetters,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Search failed',
      },
      { status: 500 }
    );
  }
}
