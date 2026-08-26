
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

export async function POST(request: NextRequest) {
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
        const results = [];

        // Process in smaller batches to avoid timeout issues if needed, but 50 is fine
        for (const jobData of jobsData) {
            // Create Job
            const job = await JobApplication.create({
                userId,
                jobTitle: jobData.jobTitle,
                company: jobData.company,
                status: jobData.status,
                priority: jobData.priority,
                location: jobData.location,
                jobDescription: jobData.description,
                salary: jobData.salary,
                applicationDate: jobData.appDate,
                createdAt: jobData.appDate,
                updatedAt: jobData.appDate,
                source: Math.random() > 0.5 ? 'extension' : 'manual',
                contactDetails: { name: 'Recruiter', role: 'Talent' }
            });

            // Only create documents/journey for non-draft/created jobs to simulate real usage
            if (['applied', 'screening', 'interview', 'offer', 'rejected', 'accepted'].includes(jobData.status)) {

                // Tailored CV
                const tailoredCV = await CV.create({
                    userId,
                    title: `${jobData.company} CV`,
                    cvType: 'journey',
                    status: 'published',
                    templateId: masterCV.templateId,
                    documentState: 'editable',
                    cvData: masterCV.cvData,
                    metadata: {
                        isMaster: false,
                        createdFrom: masterCV._id,
                        lastModified: jobData.appDate,
                        atsScore: Math.floor(Math.random() * (98 - 65) + 65)
                    }
                });

                // Cover Letter
                const coverLetter = await CoverLetter.create({
                    userId,
                    title: `${jobData.company} Letter`,
                    status: 'published',
                    jobId: job._id,
                    cvId: tailoredCV._id,
                    content: `To ${jobData.company}...`,
                    header: `Test User`,
                    body: `I am interested in the ${jobData.jobTitle} role...`,
                    footer: 'Best, Test',
                    createdAt: jobData.appDate,
                    updatedAt: jobData.appDate,
                    metadata: { wordCount: 200, atsScore: 85 }
                });

                // Journey
                await ApplicationJourney.create({
                    journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId,
                    jobId: job._id,
                    cvId: tailoredCV._id,
                    coverLetterId: coverLetter._id,
                    status: jobData.status === 'applied' ? 'completed' : 'in-progress',
                    currentStep: 5,
                    totalSteps: 5,
                    jobTitle: jobData.jobTitle,
                    company: jobData.company,
                    steps: [
                        { stepId: 1, name: 'Job Saved', status: 'completed', completedAt: jobData.appDate },
                        { stepId: 2, name: 'CV Tailoring', status: 'completed', completedAt: jobData.appDate },
                        { stepId: 3, name: 'Cover Letter', status: 'completed', completedAt: jobData.appDate },
                        { stepId: 4, name: 'ATS Check', status: 'completed', completedAt: jobData.appDate },
                        { stepId: 5, name: 'Application Ready', status: 'completed', completedAt: jobData.appDate }
                    ],
                    lastWorkedOn: jobData.appDate,
                    metadata: { createdAt: jobData.appDate, updatedAt: jobData.appDate }
                });

                // Link stored on CV/CL
                tailoredCV.journeyId = job._id; // Using job ID as proxy or fetch journey ID
                // Note: simplified for speed, normally we'd get journey._id but we're creating many
            }

            results.push({ id: job._id, company: job.company });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully created ${results.length} jobs`,
            count: results.length
        });

    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
