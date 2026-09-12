import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { Communication } from '@/models/Communication';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = (session.user as any)?.role;

    // Verify admin privileges
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const user: any = await User.findById(userId).lean();
    const candidateName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (session.user.name || 'Amar Loh');
    const userEmail = user?.stalwartEmail || user?.email || 'amar.loh@buildairesume.com';

    // 1. Find or create tracker jobs
    let trackerJobs: any[] = await JobApplication.find({ userId }).sort({ createdAt: -1 }).limit(5);

    if (!trackerJobs || trackerJobs.length === 0) {
      const defaultJobs = [
        {
          userId,
          jobTitle: 'Staff Backend Engineer',
          company: 'Stripe',
          status: 'interview',
          priority: 'high',
          appliedAt: new Date(Date.now() - 4 * 86400000),
          location: 'San Francisco, CA (Remote)',
          salary: { min: 210000, max: 260000, currency: 'USD', period: 'yearly' as const },
          contactDetails: { name: 'Emily Zhang', email: 'emily.recruiting@stripe.com', role: 'Staff Recruiter' },
        },
        {
          userId,
          jobTitle: 'Senior Full Stack Developer',
          company: 'Linear',
          status: 'applied',
          priority: 'high',
          appliedAt: new Date(Date.now() - 2 * 86400000),
          location: 'Remote (US/EU)',
          salary: { min: 180000, max: 220000, currency: 'USD', period: 'yearly' as const },
          contactDetails: { name: 'Linear Careers', email: 'careers@linear.app', role: 'Talent Team' },
        },
        {
          userId,
          jobTitle: 'Lead Design Systems Engineer',
          company: 'Airbnb',
          status: 'screening',
          priority: 'medium',
          appliedAt: new Date(Date.now() - 1 * 86400000),
          location: 'San Francisco, CA / Remote',
          salary: { min: 195000, max: 245000, currency: 'USD', period: 'yearly' as const },
          contactDetails: { name: 'Marcus Vance', email: 'marcus.talent@airbnb.com', role: 'Engineering Recruiter' },
        },
      ];

      trackerJobs = (await JobApplication.insertMany(defaultJobs as any)) as any[];
    }

    const job1 = trackerJobs[0];
    const job2 = trackerJobs[1] || trackerJobs[0];
    const job3 = trackerJobs[2] || trackerJobs[0];

    const now = Date.now();

    // 2. Prepare realistic mock communications
    const mockCommunications = [
      {
        userId,
        messageId: `<interview-${now}-1@stripe.com>`,
        direction: 'inbound',
        type: 'interview_invitation',
        status: 'unread',
        subject: `Interview Invitation: ${job1.jobTitle} at ${job1.company}`,
        bodySnippet: `Hi ${candidateName}, Thank you for your application for the ${job1.jobTitle} position at ${job1.company}. Our engineering team was very impressed by your track record...`,
        textBody: `Hi ${candidateName},\n\nThank you for applying to the ${job1.jobTitle} position at ${job1.company}!\n\nOur engineering hiring team reviewed your portfolio and tailored background, and we would love to invite you to a 45-minute technical conversation with one of our principal engineers.\n\nPlease let us know your availability over the next few days, or choose a slot directly via our scheduling calendar:\nhttps://calendly.com/stripe-talent/technical-screen\n\nLooking forward to speaking with you!\n\nBest regards,\nEmily Zhang\nEngineering Talent Partner | ${job1.company}`,
        htmlBody: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <p>Hi <strong>${candidateName}</strong>,</p>
          <p>Thank you for applying to the <strong>${job1.jobTitle}</strong> position at <strong>${job1.company}</strong>!</p>
          <p>Our engineering hiring team reviewed your profile and tailored background, and we would love to invite you to a <strong>45-minute technical conversation</strong> with one of our principal engineers.</p>
          <p>Please let us know your availability over the next few days, or choose a slot directly via our scheduling calendar:</p>
          <p><a href="https://calendly.com" style="display: inline-block; padding: 10px 18px; background-color: #013f2e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">Select Interview Time Slot</a></p>
          <p>Looking forward to speaking with you!</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 13px; color: #64748b;">
            <strong>Emily Zhang</strong><br />
            Senior Engineering Talent Partner | ${job1.company}<br />
            emily.recruiting@stripe.com
          </p>
        </div>`,
        senderEmail: 'emily.recruiting@stripe.com',
        senderName: `Emily Zhang (${job1.company} Recruiting)`,
        recipients: [{ email: userEmail, name: candidateName, type: 'to' }],
        jobId: job1._id,
        applicationId: job1._id,
        classification: 'INTERVIEW_INVITATION',
        classificationConfidence: 0.98,
        matchConfidence: 'high',
        matchScore: 96,
        isRead: false,
        isStarred: true,
        hasAttachments: false,
        attachments: [],
        isAutomated: false,
        receivedAt: new Date(now - 1000 * 60 * 45), // 45m ago
        createdAt: new Date(now - 1000 * 60 * 45),
      },
      {
        userId,
        messageId: `<info-req-${now}-2@airbnb.com>`,
        direction: 'inbound',
        type: 'recruiter_outreach',
        status: 'unread',
        subject: `Quick question regarding your ${job3.jobTitle} application`,
        bodySnippet: `Hey ${candidateName}, I came across your application for the ${job3.jobTitle} role and really liked your recent projects. Could you confirm your timeline and remote location preferences?...`,
        textBody: `Hey ${candidateName},\n\nI came across your application for the ${job3.jobTitle} position at ${job3.company} and really enjoyed reviewing your experience.\n\nCould you confirm your target start date and whether you require visa sponsorship?\n\nWe are looking to move quickly with candidate screens this week.\n\nBest,\nMarcus Vance\n${job3.company} Talent Acquisition`,
        htmlBody: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <p>Hey <strong>${candidateName}</strong>,</p>
          <p>I came across your application for the <strong>${job3.jobTitle}</strong> position at <strong>${job3.company}</strong> and really enjoyed reviewing your background.</p>
          <p>Could you confirm your target start date and whether you require visa sponsorship?</p>
          <p>We are looking to move quickly with initial candidate conversations this week.</p>
          <br/>
          <p>Best regards,<br/><strong>Marcus Vance</strong><br/>Talent Acquisition | ${job3.company}</p>
        </div>`,
        senderEmail: 'marcus.talent@airbnb.com',
        senderName: `Marcus Vance (${job3.company})`,
        recipients: [{ email: userEmail, name: candidateName, type: 'to' }],
        jobId: job3._id,
        applicationId: job3._id,
        classification: 'REQUEST_FOR_INFORMATION',
        classificationConfidence: 0.92,
        matchConfidence: 'high',
        matchScore: 91,
        isRead: false,
        isStarred: false,
        hasAttachments: false,
        attachments: [],
        isAutomated: false,
        receivedAt: new Date(now - 1000 * 60 * 180), // 3 hours ago
        createdAt: new Date(now - 1000 * 60 * 180),
      },
      {
        userId,
        messageId: `<ack-${now}-3@linear.app>`,
        direction: 'inbound',
        type: 'employer_response',
        status: 'read',
        subject: `Application Confirmed: ${job2.jobTitle} at ${job2.company}`,
        bodySnippet: `Thank you for applying to ${job2.company}. We have received your application materials and our team will review your qualifications shortly...`,
        textBody: `Thank you for applying to ${job2.company}!\n\nWe have received your application for the ${job2.jobTitle} position. Our hiring committee will review your submission and follow up with updates.\n\nYou can track updates and company engineering notes on our blog.\n\nWarm regards,\n${job2.company} Careers Team`,
        htmlBody: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <p>Hello ${candidateName},</p>
          <p>Thank you for submitting your application for the <strong>${job2.jobTitle}</strong> position at <strong>${job2.company}</strong>.</p>
          <p>Our engineering leads are reviewing your materials, and you will receive an update once the preliminary review is complete.</p>
          <br/>
          <p>Warm regards,<br/><strong>${job2.company} Careers Team</strong></p>
        </div>`,
        senderEmail: 'careers@linear.app',
        senderName: `${job2.company} Careers`,
        recipients: [{ email: userEmail, name: candidateName, type: 'to' }],
        jobId: job2._id,
        applicationId: job2._id,
        classification: 'APPLICATION_ACKNOWLEDGEMENT',
        classificationConfidence: 0.99,
        matchConfidence: 'high',
        matchScore: 89,
        isRead: true,
        isStarred: false,
        hasAttachments: false,
        attachments: [],
        isAutomated: true,
        receivedAt: new Date(now - 1000 * 60 * 60 * 26), // ~1 day ago
        createdAt: new Date(now - 1000 * 60 * 60 * 26),
      },
      {
        userId,
        messageId: `<outbound-${now}-4@buildairesume.com>`,
        direction: 'outbound',
        type: 'application_submission',
        status: 'sent',
        subject: `Application for ${job1.jobTitle} - ${candidateName}`,
        bodySnippet: `Dear ${job1.company} Hiring Team, Please accept my application for the ${job1.jobTitle} position. Attached is my tailored resume with relevant achievements...`,
        textBody: `Dear ${job1.company} Hiring Team,\n\nI am writing to express my enthusiastic interest in the ${job1.jobTitle} role at ${job1.company}.\n\nAttached please find my tailored CV and documentation of my engineering accomplishments.\n\nThank you for your time and consideration.\n\nSincerely,\n${candidateName}\n${userEmail}`,
        htmlBody: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <p>Dear ${job1.company} Hiring Team,</p>
          <p>I am writing to express my enthusiastic interest in the <strong>${job1.jobTitle}</strong> role at <strong>${job1.company}</strong>.</p>
          <p>Attached please find my tailored CV highlighting high-scale system design and production engineering experience.</p>
          <p>Thank you for your consideration, and I look forward to the opportunity to connect.</p>
          <br/>
          <p>Sincerely,<br/><strong>${candidateName}</strong><br/>${userEmail}</p>
        </div>`,
        senderEmail: userEmail,
        senderName: candidateName,
        recipients: [{ email: 'emily.recruiting@stripe.com', name: `${job1.company} Talent`, type: 'to' }],
        jobId: job1._id,
        applicationId: job1._id,
        classification: 'APPLICATION_ACKNOWLEDGEMENT',
        classificationConfidence: 0.95,
        matchConfidence: 'high',
        matchScore: 95,
        isRead: true,
        isStarred: false,
        hasAttachments: true,
        attachments: [
          {
            filename: `${candidateName.replace(/\s+/g, '_')}_Tailored_CV.pdf`,
            size: 135400,
            contentType: 'application/pdf',
          },
        ],
        isAutomated: true,
        sentAt: new Date(now - 1000 * 60 * 60 * 48),
        receivedAt: new Date(now - 1000 * 60 * 60 * 48),
        createdAt: new Date(now - 1000 * 60 * 60 * 48),
      },
      {
        userId,
        messageId: `<prep-${now}-5@stripe.com>`,
        direction: 'inbound',
        type: 'follow_up',
        status: 'unread',
        subject: `Prep Guide & Agenda: Upcoming Technical Interview at ${job1.company}`,
        bodySnippet: `Hi ${candidateName}, Looking forward to our conversation this week! Here is a brief guide on the technical topics and what to expect during your interview...`,
        textBody: `Hi ${candidateName},\n\nLooking forward to our conversation this week!\n\nHere is a brief outline of the topics we will touch on:\n1. Architecture overview & trade-offs\n2. Real-time data processing patterns\n3. Q&A about team culture and roadmaps\n\nNo live whiteboard syntax grilling — we want to focus on real system problems you've solved!\n\nBest,\nEmily Zhang\n${job1.company}`,
        htmlBody: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <p>Hi <strong>${candidateName}</strong>,</p>
          <p>Looking forward to our conversation this week!</p>
          <p>Here is a brief outline of what to expect during our technical conversation:</p>
          <ul>
            <li>System architecture design & reliability tradeoffs</li>
            <li>Real-time event processing and queueing strategies</li>
            <li>Open Q&A about engineering values and team direction</li>
          </ul>
          <p>Feel free to reply if you need any accommodations or have questions beforehand.</p>
          <br/>
          <p>Best regards,<br/><strong>Emily Zhang</strong><br/>${job1.company}</p>
        </div>`,
        senderEmail: 'emily.recruiting@stripe.com',
        senderName: `Emily Zhang (${job1.company})`,
        recipients: [{ email: userEmail, name: candidateName, type: 'to' }],
        jobId: job1._id,
        applicationId: job1._id,
        classification: 'APPLICATION_UPDATE',
        classificationConfidence: 0.94,
        matchConfidence: 'high',
        matchScore: 94,
        isRead: false,
        isStarred: true,
        hasAttachments: false,
        attachments: [],
        isAutomated: false,
        receivedAt: new Date(now - 1000 * 60 * 15), // 15m ago
        createdAt: new Date(now - 1000 * 60 * 15),
      },
    ];

    // Insert seeded communications
    const created = await Communication.insertMany(mockCommunications);

    return NextResponse.json({
      success: true,
      seededCount: created.length,
      message: `Successfully seeded ${created.length} mock recruiter communications linked to your tracker jobs.`,
      data: { count: created.length },
    });
  } catch (error: any) {
    console.error('Communications seed error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
