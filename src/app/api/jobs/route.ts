import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import { jobSearchCache } from '@/lib/cache/jobSearchCache';
import { extractCandidateProfile } from '@/matching/candidateProfileExtractor';
import { scoreJobForCandidate } from '@/matching/deterministicScoring';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import JobApplication from '@/models/JobApplication';
import ApplicationJourney from '@/models/ApplicationJourney';
import { createJourneyDocuments } from '@/lib/services/journeyDocumentService';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';
import { checkForDuplicate } from '@/lib/jobs/deduplicate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');
    const q = searchParams.get('q') || '';
    const role = searchParams.get('role') || '';
    const location = searchParams.get('location') || '';
    const remote = searchParams.get('remote');
    const country = searchParams.get('country') || '';
    const experience = searchParams.get('experience') || '';
    const salaryMin = searchParams.get('salaryMin');
    const visa = searchParams.get('visa');
    const personalized = searchParams.get('personalized') === 'true';

    const isDiscoverQuery =
      scope === 'discover' ||
      Boolean(q) ||
      Boolean(role) ||
      Boolean(country) ||
      Boolean(remote) ||
      Boolean(experience) ||
      Boolean(salaryMin) ||
      Boolean(visa) ||
      personalized;

    await getConnection();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // =========================================================================
    // 1. DISCOVER FEED SEARCH (Public & Personalized Job Catalog)
    // =========================================================================
    if (isDiscoverQuery) {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));
      const sort = searchParams.get('sort') || 'recent';

      const cacheKey = `jobs:${q}:${role}:${location}:${remote}:${country}:${experience}:${page}:${limit}:${sort}`;
      if (!personalized) {
        const cached = jobSearchCache.get<any>(cacheKey);
        if (cached) {
          return NextResponse.json({ ...cached, _cached: true, _latencyMs: Date.now() - startTime });
        }
      }

      const jobsColl = db.collection('jobs');
      const filter: Record<string, any> = { status: 'active' };

      if (q) {
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { 'company.name': { $regex: q, $options: 'i' } },
          { skills: { $regex: q, $options: 'i' } },
          { descriptionText: { $regex: q, $options: 'i' } },
        ];
      }

      if (role) {
        filter.normalizedTitle = { $regex: role.toLowerCase(), $options: 'i' };
      }

      if (location) {
        filter.$or = [
          { 'location.city': { $regex: location, $options: 'i' } },
          { 'location.country': { $regex: location, $options: 'i' } },
        ];
      }

      if (remote === 'true') filter['location.remote'] = true;
      if (country) filter['location.countryCode'] = country.toUpperCase();
      if (experience) filter['experience.level'] = experience.toLowerCase();
      if (salaryMin) filter['salary.max'] = { $gte: Number(salaryMin) };
      if (visa === 'true') filter['visaSponsorship.mentioned'] = true;

      let sortOptions: Record<string, any> = { postedAt: -1 };
      if (sort === 'salary') {
        sortOptions = { 'salary.max': -1, postedAt: -1 };
      }

      const skip = (page - 1) * limit;
      const [rawJobs, total] = await Promise.all([
        jobsColl.find(filter).sort(sortOptions).skip(skip).limit(limit).toArray(),
        jobsColl.countDocuments(filter),
      ]);

      let finalJobs = rawJobs;
      if (personalized) {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;
        if (userId) {
          const candidateProfile = await extractCandidateProfile(db as any, userId);
          finalJobs = rawJobs.map((job) => {
            const matchResult = scoreJobForCandidate(job, candidateProfile!);
            return {
              ...job,
              matchScore: matchResult.score,
              matchBreakdown: matchResult.breakdown,
              matchReasons: matchResult.reasons,
            };
          });
          finalJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        }
      }

      const responsePayload = {
        jobs: finalJobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        latencyMs: Date.now() - startTime,
      };

      if (!personalized) {
        jobSearchCache.set(cacheKey, responsePayload);
      }

      return NextResponse.json(responsePayload);
    }

    // =========================================================================
    // 2. USER TRACKER APPLICATIONS (Job Tracker / Kanban Board)
    // =========================================================================
    const auth = await authenticateRequest(req);
    let userId = auth?.userId;
    if (!userId) {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userObjId: any = userId;
    try {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userObjId = new mongoose.Types.ObjectId(userId);
      }
    } catch {
      userObjId = userId;
    }

    const limitParam = searchParams.get('limit');
    const statusFilter = searchParams.get('status');
    const liteMode = searchParams.get('lite') === 'true';

    const trackerQuery: Record<string, any> = {
      $or: [{ userId: userObjId }, { userId: String(userId) }],
    };

    if (statusFilter && statusFilter !== 'all') {
      trackerQuery.status = statusFilter;
    }

    // Lite mode: return only IDs for bookmark detection (much faster)
    if (liteMode) {
      const limitVal = limitParam ? parseInt(limitParam, 10) : 200;
      const apps = await JobApplication.find(trackerQuery)
        .select({ _id: 1, jobId: 1, externalId: 1, jobUrl: 1, sourceUrl: 1, company: 1, jobTitle: 1, title: 1 })
        .sort({ updatedAt: -1 })
        .limit(isNaN(limitVal) ? 200 : limitVal)
        .lean();
      return NextResponse.json({ success: true, jobs: apps });
    }

    let query = JobApplication.find(trackerQuery).sort({ updatedAt: -1, createdAt: -1 });

    if (limitParam && limitParam !== 'all') {
      const limitVal = parseInt(limitParam, 10);
      if (!isNaN(limitVal) && limitVal > 0) {
        query = query.limit(limitVal);
      }
    }

    const applications = await query.lean();

    // Attach journey IDs and documents info to applications
    const jobIds = applications.map((a: any) => a._id?.toString());
    const journeys = await ApplicationJourney.find({
      $or: [{ userId: userObjId }, { userId: String(userId) }],
      jobId: { $in: jobIds },
    }).lean();

    const journeyMap = new Map<string, any>();
    journeys.forEach((j: any) => {
      if (j.jobId) journeyMap.set(j.jobId.toString(), j);
    });

    const enrichedJobs = applications.map((job: any) => {
      const journey = journeyMap.get(job._id?.toString());
      return {
        ...job,
        journey: journey
          ? {
              _id: journey._id,
              journeyId: journey.journeyId,
              status: journey.status,
              cvId: journey.cvId,
              coverLetterId: journey.coverLetterId,
              generationState: journey.generationState,
              currentStep: journey.currentStep,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      jobs: enrichedJobs,
      data: {
        jobs: enrichedJobs,
        total: enrichedJobs.length,
      },
      total: enrichedJobs.length,
      latencyMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('Jobs API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    let userId = auth?.userId;
    if (!userId) {
      const session = await getServerSession(authOptions);
      userId = (session?.user as any)?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      jobTitle,
      company,
      location,
      jobUrl,
      jobDescription,
      status = 'saved',
      salary,
      priority = 'medium',
      source = 'manual',
      atsType = 'unknown',
      notes = '',
      tags = [],
    } = body;

    if (!jobTitle || !company) {
      return NextResponse.json(
        { error: 'Job title and company are required' },
        { status: 400 }
      );
    }

    await getConnection();

    let userObjId: any = userId;
    try {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userObjId = new mongoose.Types.ObjectId(userId);
      }
    } catch {
      userObjId = userId;
    }

    const sanitizedSource = sanitizeJobApplicationSource(source);

    // Dedup check: prevent duplicate jobs per user
    const dedup = await checkForDuplicate(userObjId, jobTitle, company, jobUrl);
    if (dedup.isDuplicate && dedup.existingJob) {
      return NextResponse.json({
        success: false,
        duplicate: true,
        existingJob: dedup.existingJob,
        matchType: dedup.matchType,
        message: `This job already exists in your tracker (${dedup.matchType === 'url' ? 'matched by URL' : 'matched by title + company'})`,
      }, { status: 409 });
    }

    // Create JobApplication
    const newJobApp = await JobApplication.create({
      userId: userObjId,
      jobTitle,
      company,
      location: location || 'Remote',
      jobUrl: jobUrl || '',
      jobDescription: jobDescription || '',
      status: status === 'created' || status === 'staging' ? 'created' : status,
      salary: salary || undefined,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      source: sanitizedSource,
      atsType: atsType || 'unknown',
      notes,
      tags,
      statusHistory: [
        {
          status: status === 'created' ? 'created' : 'saved',
          date: new Date(),
          notes: `Job added to ${status === 'created' ? 'staging' : 'saved'} tracker`,
        },
      ],
    });

    let journeyId: string | null = null;

    // If added directly to Staging (created), trigger Journey & Document Generation
    if (status === 'created' || status === 'staging') {
      try {
        const journeyData = {
          userId: String(userId),
          jobId: newJobApp._id.toString(),
          jobTitle,
          company,
          status: 'processing_documents',
          currentStep: 2,
          totalSteps: 5,
          journeyType: 'standard',
          steps: [
            { stepId: 1, name: 'Job Details', status: 'completed', completedAt: new Date() },
            { stepId: 2, name: 'Resume', status: 'active' },
            { stepId: 3, name: 'Cover Letter', status: 'pending' },
            { stepId: 4, name: 'ATS Check', status: 'pending' },
            { stepId: 5, name: 'Application Ready', status: 'pending' },
          ],
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
          },
        };

        const createdJourney = await ApplicationJourney.create(journeyData);
        journeyId = createdJourney._id.toString();

        // Trigger document creation in background
        setImmediate(async () => {
          try {
            await createJourneyDocuments(createdJourney._id.toString(), String(userId));
          } catch (docErr) {
            console.error('Async document creation failed:', docErr);
          }
        });
      } catch (journeyErr) {
        console.error('Failed to create journey for job application:', journeyErr);
      }
    }

    return NextResponse.json({
      success: true,
      job: newJobApp,
      journeyId,
      message: 'Job application created successfully',
    });
  } catch (err: any) {
    console.error('POST /api/jobs Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
