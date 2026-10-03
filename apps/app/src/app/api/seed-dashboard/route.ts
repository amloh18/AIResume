
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';
import CoverLetter from '@/models/CoverLetter';
import { ApplicationJourney } from '@/models';
import mongoose from 'mongoose';

// Ensure models are registered
import '@/models/User';
import '@/models/CV';
import '@/models/JobApplication';
import '@/models/CoverLetter';
import '@/models/ApplicationJourney';

/**
 * Dashboard seeding endpoint (development / demo only).
 *
 * ⚠️ This endpoint writes SYNTHETIC data, including fabricated ATS scores.
 * It must never be reachable in production: fabricated scores in a production
 * database are indistinguishable from real ones and would make every
 * score-reading surface lie.
 *
 * Gating:
 *   - Blocked outright when NODE_ENV === 'production' unless
 *     SEED_DASHBOARD_ENABLED === 'true'.
 *   - When enabled in production, a matching `x-seed-secret` header
 *     (SEED_DASHBOARD_SECRET) is also required.
 */
function assertSeedAllowed(request: NextRequest): NextResponse | null {
    const isProduction = process.env.NODE_ENV === 'production';
    const explicitlyEnabled = process.env.SEED_DASHBOARD_ENABLED === 'true';

    if (isProduction && !explicitlyEnabled) {
        return NextResponse.json(
            {
                success: false,
                error: 'Not found',
            },
            { status: 404 }
        );
    }

    if (explicitlyEnabled) {
        const expected = process.env.SEED_DASHBOARD_SECRET;
        const provided = request.headers.get('x-seed-secret');
        if (!expected || provided !== expected) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    return null;
}

export async function POST(request: NextRequest) {
    const blocked = assertSeedAllowed(request);
    if (blocked) return blocked;

    try {
        await getConnection();

        const email = 'testuser@buildairesume.com';
        console.log(`Seeding dashboard with 50 jobs for ${email}...`);

        // 1. Find the user
        let user = await User.findOne({ email });
        if (!user) {
            console.log('User not found, creating...');
            user = await User.create({
                email,
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                isEmailVerified: true,
                onboardingCompleted: true,
            });
        }

        const userId = user._id;

        // 2. Ensure Master CV exists
        let masterCV = await CV.findOne({ userId, 'metadata.isMaster': true });
        if (!masterCV) {
            console.log('Creating Master CV...');
            masterCV = await CV.create({
                userId,
                title: 'Master CV',
                cvType: 'master',
                status: 'published',
                cvData: {
                    basics: {
                        name: 'Test User',
                        email: email,
                        label: 'Senior Software Engineer',
                        summary: 'Experienced developer.'
                    }
                },
                documentState: 'editable',
                metadata: { isMaster: true, lastModified: new Date() },
                templateId: new mongoose.Types.ObjectId()
            });
        }

        // 3. Generate 50 Jobs (5 per day for last 10 days)
        const companies = [
            'Google', 'Amazon', 'Netflix', 'Microsoft', 'Apple', 'Uber', 'Airbnb', 'Lyft', 'DoorDash', 'Instacart',
            'Stripe', 'Square', 'Coinbase', 'Robinhood', 'Plaid', 'Slack', 'Zoom', 'Twilio', 'Okta', 'Salesforce',
            'Adobe', 'Oracle', 'Intel', 'AMD', 'Nvidia', 'Tesla', 'SpaceX', 'Blue Origin', 'Rivian', 'Lucid',
            'Spotify', 'Shopify', 'Atlassian', 'GitLab', 'GitHub', 'Dropbox', 'Box', 'Notion', 'Figma', 'Canva',
            'Reddit', 'Pinterest', 'Snap', 'TikTok', 'Meta', 'Twitter', 'LinkedIn', 'Indeed', 'Glassdoor', 'AngelList'
        ];

        const roles = [
            'Frontend Engineer', 'Backend Engineer', 'Full Stack Developer', 'DevOps Engineer', 'SRE',
            'Data Scientist', 'ML Engineer', 'Product Manager', 'UX Designer', 'Product Designer',
            'iOS Developer', 'Android Developer', 'Security Engineer', 'QA Engineer', 'Technical Program Manager'
        ];

        const locations = ['Remote', 'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'London, UK', 'Berlin, DE'];
        const statuses = ['saved', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];
        const priorities = ['low', 'medium', 'high'];

        const jobsData = [];
        const today = new Date();

        for (let day = 0; day < 10; day++) {
            for (let i = 0; i < 5; i++) {
                // Calculate date: today minus 'day' days
                const appDate = new Date(today);
                appDate.setDate(today.getDate() - day);

                // Randomize time slightly within the day
                appDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));

                const company = companies[(day * 5 + i) % companies.length];
                const role = roles[Math.floor(Math.random() * roles.length)];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const priority = priorities[Math.floor(Math.random() * priorities.length)];
                const location = locations[Math.floor(Math.random() * locations.length)];

                // Salary based on role/random
                const minSalary = 100000 + Math.floor(Math.random() * 80000);

                jobsData.push({
                    jobTitle: role,
                    company: company,
                    status: status, // Cast to any to satisfy TS enum check if strict
                    appDate: appDate,
                    priority: priority,
                    salary: { min: minSalary, max: minSalary + 40000, currency: 'USD', period: 'yearly' },
                    location: location,
                    description: `Exciting opportunity for a ${role} at ${company}.`
                });
            }
        }

        // 4. Batch Create
        console.log(`Generating ${jobsData.length} jobs... this may take a moment.`);

        // 4a. Batch insert jobs
        const jobDocs = jobsData.map((d) => ({
            userId,
            jobTitle: d.jobTitle,
            company: d.company,
            status: d.status,
            priority: d.priority,
            location: d.location,
            jobDescription: d.description,
            salary: d.salary,
            applicationDate: d.appDate,
            createdAt: d.appDate,
            updatedAt: d.appDate,
            source: Math.random() > 0.5 ? 'extension' : 'manual',
            contactDetails: { name: 'Recruiter', role: 'Talent' }
        }));
        const createdJobs = await JobApplication.insertMany(jobDocs);
        console.log(`✅ Inserted ${createdJobs.length} jobs`);

        // 4b. Batch insert CVs + CLs + Journeys for non-draft/created jobs
        const cvDocs: any[] = [];
        const clDocs: any[] = [];
        const journeyDocs: any[] = [];

        for (let i = 0; i < createdJobs.length; i++) {
            const job = createdJobs[i];
            const d = jobsData[i];
            if (!['applied', 'screening', 'interview', 'offer', 'rejected', 'accepted'].includes(d.status)) continue;

            // SYNTHETIC score — this is demo data, not a measurement.
            // `seededData` + `seededAtsScore` record the provenance explicitly so
            // any surface can exclude seeded documents from score aggregates.
            const atsScore = Math.floor(Math.random() * (98 - 65) + 65);
            cvDocs.push({
                userId,
                title: `${d.company} CV`,
                cvType: 'journey',
                status: 'published',
                templateId: masterCV.templateId,
                documentState: 'editable',
                cvData: masterCV.cvData,
                metadata: {
                    isMaster: false,
                    createdFrom: masterCV._id,
                    lastModified: d.appDate,
                    atsScore,
                    seededData: true,
                    seededAtsScore: atsScore,
                }
            });

            clDocs.push({
                userId,
                title: `${d.company} Letter`,
                status: 'published',
                jobId: job._id,
                content: `To ${d.company}...`,
                header: 'Test User',
                body: `I am interested in the ${d.jobTitle} role...`,
                footer: 'Best, Test',
                createdAt: d.appDate,
                updatedAt: d.appDate,
                metadata: { wordCount: 200, atsScore: 85, seededData: true, seededAtsScore: 85 }
            });

            journeyDocs.push({
                journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId,
                jobId: job._id,
                status: d.status === 'applied' ? 'completed' : 'in-progress',
                currentStep: 5,
                totalSteps: 5,
                jobTitle: d.jobTitle,
                company: d.company,
                steps: [
                    { stepId: 1, name: 'Job Saved', status: 'completed', completedAt: d.appDate },
                    { stepId: 2, name: 'CV Tailoring', status: 'completed', completedAt: d.appDate },
                    { stepId: 3, name: 'Cover Letter', status: 'completed', completedAt: d.appDate },
                    { stepId: 4, name: 'ATS Check', status: 'completed', completedAt: d.appDate },
                    { stepId: 5, name: 'Application Ready', status: 'completed', completedAt: d.appDate }
                ],
                lastWorkedOn: d.appDate,
                metadata: { createdAt: d.appDate, updatedAt: d.appDate }
            });
        }

        const createdCVs = cvDocs.length > 0 ? await CV.insertMany(cvDocs) : [];
        const createdCLs = clDocs.length > 0 ? await CoverLetter.insertMany(clDocs) : [];
        console.log(`✅ Inserted ${createdCVs.length} CVs, ${createdCLs.length} cover letters`);

        // Link CLs to CVs and journeys
        for (let i = 0; i < createdCLs.length; i++) {
            createdCLs[i].cvId = createdCVs[i]._id;
        }
        if (createdCLs.length > 0) await CoverLetter.bulkSave(createdCLs);

        for (let i = 0; i < journeyDocs.length; i++) {
            journeyDocs[i].cvId = createdCVs[i]._id;
            journeyDocs[i].coverLetterId = createdCLs[i]._id;
        }
        const createdJourneys = journeyDocs.length > 0 ? await ApplicationJourney.insertMany(journeyDocs) : [];
        console.log(`✅ Inserted ${createdJourneys.length} journeys`);

        return NextResponse.json({
            success: true,
            message: `Successfully created ${createdJobs.length} jobs`,
            count: createdJobs.length
        });

    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
