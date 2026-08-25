import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getConnection } from '@/lib/database';
import { JobApplication, Notification } from '@/models';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { sanitizeJobApplicationSource } from '@/lib/jobs/jobApplicationSource';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    const userId = authResult?.userId || request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User authentication required' } },
        { status: 401 }
      );
    }

    await getConnection();

    const body = await request.json();
    const {
      jobId,
      title,
      jobTitle,
      company,
      location,
      source,
      atsType,
      applyUrl,
      jobUrl,
      salary,
      matchScore,
      description,
      jobDescription,
      skills,
    } = body;

    const roleTitle = title || jobTitle || 'Software Engineer';
    const companyName = company || 'Company';
    const targetApplyUrl = applyUrl || jobUrl || '';
    const jobDesc = description || jobDescription || '';

    // Check if this job application already exists for this user
    let existingJobApp = null;
    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
      existingJobApp = await JobApplication.findOne({ _id: jobId, userId });
    }

    if (!existingJobApp && companyName && roleTitle) {
      existingJobApp = await JobApplication.findOne({
        userId,
        company: new RegExp(`^${companyName.trim()}$`, 'i'),
        jobTitle: new RegExp(`^${roleTitle.trim()}$`, 'i'),
      });
    }

    let savedJob: any;

    if (existingJobApp) {
      existingJobApp.status = 'applied';
      existingJobApp.appliedAt = existingJobApp.appliedAt || new Date();
      existingJobApp.applicationDate = existingJobApp.applicationDate || new Date();
      if (targetApplyUrl) existingJobApp.jobUrl = targetApplyUrl;
      if (matchScore) existingJobApp.matchScore = matchScore;
      if (jobDesc && !existingJobApp.jobDescription) existingJobApp.jobDescription = jobDesc;
      if (atsType) existingJobApp.atsType = atsType;
      savedJob = await existingJobApp.save();
    } else {
      const cleanSource = sanitizeJobApplicationSource(source);

      let parsedSalary: any = undefined;
      if (typeof salary === 'object' && salary !== null) {
        parsedSalary = salary;
      }

      const newJobApp = new JobApplication({
        userId,
        jobTitle: roleTitle,
        company: companyName,
        location: location || 'Remote',
        jobUrl: targetApplyUrl,
        jobDescription: jobDesc,
        status: 'applied',
        priority: 'medium',
        source: cleanSource,
        atsType: atsType || 'unknown',
        matchScore: typeof matchScore === 'number' ? matchScore : 85,
        appliedAt: new Date(),
        applicationDate: new Date(),
        isArchived: false,
        salary: parsedSalary,
        tags: Array.isArray(skills) ? skills : [],
      });

      savedJob = await newJobApp.save();
    }

    // Create an in-app notification for the user
    try {
      await Notification.create({
        userId,
        title: 'Application Submitted',
        message: `Successfully applied to ${roleTitle} at ${companyName}.`,
        category: 'application',
        type: 'info',
        priority: 'medium',
        read: false,
        actionUrl: `/dashboard/jobs?tab=applications&jobId=${savedJob._id}`,
        createdAt: new Date(),
      });
    } catch (notifErr) {
      console.warn('Failed to create notification for application:', notifErr);
    }

    return NextResponse.json({
      success: true,
      status: 'applied',
      applicationId: savedJob._id.toString(),
      jobId: savedJob._id.toString(),
      job: {
        id: savedJob._id.toString(),
        jobTitle: savedJob.jobTitle,
        company: savedJob.company,
        location: savedJob.location,
        status: savedJob.status,
        appliedAt: savedJob.appliedAt,
      },
    });
  } catch (error: any) {
    console.error('[API] POST /api/applications/auto error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to submit application',
        },
      },
      { status: 500 }
    );
  }
}
