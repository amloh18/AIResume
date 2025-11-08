import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { JobApplication } from '@/models';

/**
 * API endpoint to create a test job that triggers follow-up notifications
 * 
 * This creates a job with:
 * - Status: 'applied'
 * - updatedAt: 7 days ago (to trigger follow-up)
 * - applicationDate: 7 days ago
 * - Contact information for email testing
 * 
 * Usage: POST /api/jobs/create-test-followup
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    console.log(`🔍 Creating test follow-up job for user: ${userId}`);

    // Connect to database
    await getConnection();

    // Calculate dates
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Check if test job already exists
    const existingTestJob = await JobApplication.findOne({
      userId,
      jobTitle: 'Test Follow-Up Job - Software Engineer',
      company: 'Test Company Inc'
    });

    if (existingTestJob) {
      console.log('⚠️  Test job already exists. Updating it...');

      // Update existing job
      existingTestJob.status = 'applied';
      existingTestJob.applicationDate = sevenDaysAgo;
      existingTestJob.updatedAt = sevenDaysAgo; // This is key for triggering follow-up
      existingTestJob.contactDetails = {
        name: 'John Doe',
        email: 'john.doe@testcompany.com',
        phone: '+1-555-0123',
        role: 'HR Manager'
      };
      existingTestJob.contacts = [
        {
          name: 'John Doe',
          role: 'HR Manager',
          email: 'john.doe@testcompany.com',
          phone: '+1-555-0123'
        },
        {
          name: 'Jane Smith',
          role: 'Recruiter',
          email: 'jane.smith@testcompany.com',
          linkedin: 'https://linkedin.com/in/janesmith'
        }
      ];
      existingTestJob.deadline = new Date(now);
      existingTestJob.deadline.setDate(existingTestJob.deadline.getDate() + 14); // 2 weeks from now
      existingTestJob.notes = 'Test job for follow-up and email testing. This job was created 7 days ago to trigger follow-up notifications.';
      existingTestJob.priority = 'high';

      await existingTestJob.save();
      console.log(`✅ Updated existing test job: ${existingTestJob._id}`);

      return NextResponse.json({
        success: true,
        message: 'Test job updated successfully',
        data: {
          jobId: existingTestJob._id.toString(),
          status: existingTestJob.status,
          applicationDate: existingTestJob.applicationDate?.toISOString(),
          updatedAt: existingTestJob.updatedAt.toISOString(),
          daysAgo: Math.floor((now.getTime() - existingTestJob.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
          deadline: existingTestJob.deadline?.toISOString(),
          contact: existingTestJob.contactDetails
        }
      });
    } else {
      // Create new test job
      const testJob = new JobApplication({
        userId,
        jobTitle: 'Test Follow-Up Job - Software Engineer',
        company: 'Test Company Inc',
        location: 'San Francisco, CA',
        jobUrl: 'https://testcompany.com/careers/software-engineer',
        jobDescription: 'This is a test job created to test follow-up notifications and email functionality. The job was created 7 days ago to trigger follow-up alerts.',
        status: 'applied',
        priority: 'high',
        applicationDate: sevenDaysAgo,
        deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        updatedAt: sevenDaysAgo, // Key: Set to 7 days ago to trigger follow-up
        createdAt: sevenDaysAgo,
        contactDetails: {
          name: 'John Doe',
          email: 'john.doe@testcompany.com',
          phone: '+1-555-0123',
          role: 'HR Manager'
        },
        contacts: [
          {
            name: 'John Doe',
            role: 'HR Manager',
            email: 'john.doe@testcompany.com',
            phone: '+1-555-0123'
          },
          {
            name: 'Jane Smith',
            role: 'Recruiter',
            email: 'jane.smith@testcompany.com',
            linkedin: 'https://linkedin.com/in/janesmith'
          }
        ],
        salary: {
          min: 120000,
          max: 180000,
          currency: 'USD',
          period: 'yearly'
        },
        notes: 'Test job for follow-up and email testing. This job was created 7 days ago to trigger follow-up notifications.',
        tags: ['test', 'follow-up', 'email-testing'],
        sponsorship: 'unknown',
        interviews: [],
        followUps: [],
        attachments: []
      });

      await testJob.save();
      console.log(`✅ Created test job: ${testJob._id}`);

      return NextResponse.json({
        success: true,
        message: 'Test job created successfully',
        data: {
          jobId: testJob._id.toString(),
          status: testJob.status,
          applicationDate: testJob.applicationDate?.toISOString(),
          updatedAt: testJob.updatedAt.toISOString(),
          daysAgo: Math.floor((now.getTime() - testJob.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
          deadline: testJob.deadline?.toISOString(),
          contact: testJob.contactDetails
        }
      });
    }
  } catch (error: any) {
    console.error('❌ Error creating test job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test job',
        message: error.message
      },
      { status: 500 }
    );
  }
}

