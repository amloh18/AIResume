import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import JobApplication from '@/models/JobApplication';
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
    const dateRange = searchParams.get('dateRange') || 'all'; // 'all' | '7days' | '30days' | '90days'

    // Build date filter
    let dateFilter: any = {};
    if (dateRange !== 'all') {
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter.createdAt = { $gte: startDate };
    }

    // Get all jobs for the user
    const jobs = await JobApplication.find({
      userId: new mongoose.Types.ObjectId(userId),
      ...dateFilter
    }).lean();

    // Calculate analytics
    const totalJobs = jobs.length;
    const jobsByStatus = {
      saved: jobs.filter(j => j.status === 'saved').length,
      created: jobs.filter(j => j.status === 'created').length,
      applied: jobs.filter(j => j.status === 'applied').length,
      interview: jobs.filter(j => j.status === 'interview').length,
      offer: jobs.filter(j => j.status === 'offer').length,
      rejected: jobs.filter(j => j.status === 'rejected').length
    };

    // Calculate conversion rates
    const appliedCount = jobsByStatus.applied;
    const interviewCount = jobsByStatus.interview;
    const offerCount = jobsByStatus.offer;
    const rejectedCount = jobsByStatus.rejected;

    const applicationToInterviewRate = appliedCount > 0 
      ? Math.round((interviewCount / appliedCount) * 100) 
      : 0;
    const interviewToOfferRate = interviewCount > 0 
      ? Math.round((offerCount / interviewCount) * 100) 
      : 0;
    const overallConversionRate = appliedCount > 0 
      ? Math.round((offerCount / appliedCount) * 100) 
      : 0;

    // Calculate average time in stage (simplified - using createdAt and updatedAt)
    const timeInStage: Record<string, number> = {};
    const stageTransitions: Record<string, number> = {};

    jobs.forEach(job => {
      const createdAt = new Date(job.createdAt).getTime();
      const updatedAt = new Date(job.updatedAt).getTime();
      const daysInStage = Math.floor((updatedAt - createdAt) / (1000 * 60 * 60 * 24));
      
      if (!timeInStage[job.status]) {
        timeInStage[job.status] = 0;
        stageTransitions[job.status] = 0;
      }
      timeInStage[job.status] += daysInStage;
      stageTransitions[job.status]++;
    });

    const avgTimeInStage: Record<string, number> = {};
    Object.keys(timeInStage).forEach(status => {
      avgTimeInStage[status] = stageTransitions[status] > 0
        ? Math.round(timeInStage[status] / stageTransitions[status])
        : 0;
    });

    // Success rate by source
    const jobsBySource: Record<string, { total: number; offers: number; saved: number; created: number }> = {};
    jobs.forEach(job => {
      const source = job.source || 'unknown';
      if (!jobsBySource[source]) {
        jobsBySource[source] = { total: 0, offers: 0, saved: 0, created: 0 };
      }
      jobsBySource[source].total++;
      if (job.status === 'offer') {
        jobsBySource[source].offers++;
      }
      if (job.status === 'saved') {
        jobsBySource[source].saved++;
      }
      if (job.status === 'created' || job.status === 'applied' || job.status === 'interview' || job.status === 'offer') {
        jobsBySource[source].created++;
      }
    });

    const successRateBySource: Record<string, number> = {};
    const sourceROI: Record<string, { conversionRate: number; savedRate: number; createdRate: number }> = {};
    Object.keys(jobsBySource).forEach(source => {
      const { total, offers, saved, created } = jobsBySource[source];
      successRateBySource[source] = total > 0 ? Math.round((offers / total) * 100) : 0;
      
      // Source ROI: conversion rate for created jobs (excludes saved)
      const conversionRate = created > 0 ? Math.round((offers / created) * 100) : 0;
      const savedRate = total > 0 ? Math.round((saved / total) * 100) : 0;
      const createdRate = total > 0 ? Math.round((created / total) * 100) : 0;
      
      sourceROI[source] = {
        conversionRate,
        savedRate,
        createdRate
      };
    });

    // Ghost Rate: Jobs in "Applied" status >30 days with no updates (exclude saved)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const appliedJobs = jobs.filter(job => job.status === 'applied');
    
    const ghostJobs = appliedJobs.filter(job => {
      const updatedAt = new Date(job.updatedAt);
      return updatedAt < thirtyDaysAgo;
    });

    const ghostRate = appliedJobs.length > 0
      ? Math.round((ghostJobs.length / appliedJobs.length) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalJobs,
        jobsByStatus,
        conversionRates: {
          applicationToInterview: applicationToInterviewRate,
          interviewToOffer: interviewToOfferRate,
          overall: overallConversionRate
        },
        avgTimeInStage,
        successRateBySource,
        sourceROI, // New: Detailed source ROI with draft/created breakdown
        ghostRate, // New: Ghost rate (excludes drafts)
        ghostJobsCount: ghostJobs.length,
        appliedJobsCount: appliedJobs.length,
        dateRange
      }
    });
  } catch (error) {
    console.error('Error fetching job analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

