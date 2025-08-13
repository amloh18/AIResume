import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV, Job, CoverLetter } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'week';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    }

    // Fetch all data
    const [cvs, jobs, coverLetters] = await Promise.all([
      CV.find({ userId }).lean(),
      Job.find({ userId }).lean(),
      CoverLetter.find({ userId }).lean()
    ]);

    // Filter data by period
    const periodCvs = cvs.filter(cv => new Date(cv.createdAt) >= startDate);
    const periodJobs = jobs.filter(job => new Date(job.createdAt) >= startDate);
    const periodCoverLetters = coverLetters.filter(letter => new Date(letter.createdAt) >= startDate);

    // Calculate KPIs
    const kpis = {
      totalJobs: periodJobs.length,
      cvsCreated: periodCvs.length,
      coverLettersCreated: periodCoverLetters.length,
      applicationsSubmitted: periodJobs.filter(job => job.status === 'applied').length,
      interviewsScheduled: periodJobs.filter(job => job.status === 'interview').length
    };

    // Calculate CV health score
    const calculateCompletionPercentage = (cv: any): number => {
      if (cv.status === 'published') return 100;
      if (cv.status === 'archived') return 0;
      
      let totalScore = 0;
      let maxScore = 0;
      
      const sectionWeights = {
        personalInfo: 25,
        experience: 30,
        education: 20,
        skills: 15,
        projects: 10
      };
      
      if (cv.cvData?.basics) {
        const basics = cv.cvData.basics;
        let score = 0;
        if (basics.name?.trim()) score += 1;
        if (basics.email?.trim()) score += 1;
        if (basics.phone?.trim()) score += 1;
        if (basics.location?.city || basics.location?.address) score += 1;
        if (basics.summary?.trim()) score += 1;
        totalScore += (score / 5) * sectionWeights.personalInfo;
      }
      maxScore += sectionWeights.personalInfo;
      
      if (cv.cvData?.work && cv.cvData.work.length > 0) {
        totalScore += sectionWeights.experience;
      }
      maxScore += sectionWeights.experience;
      
      if (cv.cvData?.education && cv.cvData.education.length > 0) {
        totalScore += sectionWeights.education;
      }
      maxScore += sectionWeights.education;
      
      if (cv.cvData?.skills && cv.cvData.skills.length > 0) {
        totalScore += sectionWeights.skills;
      }
      maxScore += sectionWeights.skills;
      
      if (cv.cvData?.projects && cv.cvData.projects.length > 0) {
        totalScore += sectionWeights.projects;
      }
      maxScore += sectionWeights.projects;
      
      return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    };

    const cvHealthScore = cvs.length > 0 ? 
      Math.min(100, Math.round(
        cvs.reduce((sum, cv) => sum + calculateCompletionPercentage(cv), 0) / cvs.length +
        (cvs.length > 1 ? 5 : 0) +
        (cvs.filter(cv => cv.status === 'published').length * 10) +
        (cvs.filter(cv => {
          const lastModified = new Date(cv.updatedAt || cv.createdAt);
          const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceModified <= 7;
        }).length * 5)
      )) : 0;

    // Extract skills from CVs
    const allSkills = new Set<string>();
    const skillGaps = new Set<string>();
    
    cvs.forEach(cv => {
      if (cv.cvData?.skills) {
        cv.cvData.skills.forEach((skill: any) => {
          if (skill.keywords) {
            skill.keywords.forEach((keyword: string) => {
              allSkills.add(keyword.toLowerCase());
            });
          }
        });
      }
    });

    // Common skills to check for gaps
    const commonSkills = ['javascript', 'python', 'react', 'node.js', 'aws', 'docker', 'kubernetes', 'machine learning', 'data analysis', 'project management'];
    commonSkills.forEach(skill => {
      if (!allSkills.has(skill)) {
        skillGaps.add(skill);
      }
    });

    // Calculate AI metrics
    const aiMetrics = {
      cvsPerJob: jobs.length > 0 ? (cvs.length / jobs.length).toFixed(1) : '0',
      coverLetterCoverage: jobs.length > 0 ? Math.round((coverLetters.length / jobs.length) * 100) : 0,
      jobsThisWeek: jobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return jobDate >= weekAgo;
      }).length
    };

    // Generate AI goal
    const aiGoal = aiMetrics.jobsThisWeek > 0 
      ? `Create cover letters for the ${aiMetrics.jobsThisWeek} jobs added this week`
      : 'Add your first job to start creating targeted cover letters';

    // Generate dynamic job tips based on user data
    const jobTips = [];
    
    if (cvs.length === 0) {
      jobTips.push({
        tip: 'Create your first CV to get started with job applications',
        source: 'CV Circle'
      });
    } else if (cvs.filter(cv => cv.status === 'published').length === 0) {
      jobTips.push({
        tip: 'Publish your CV to make it visible to potential employers',
        source: 'CV Circle'
      });
    } else {
      jobTips.push({
        tip: 'Customize your CV summary for each job application to increase your chances by 40%',
        source: 'CareerBuilder'
      });
    }

    if (jobs.length === 0) {
      jobTips.push({
        tip: 'Start tracking job applications to monitor your progress',
        source: 'CV Circle'
      });
    } else if (coverLetters.length === 0) {
      jobTips.push({
        tip: 'Create cover letters for your job applications to stand out',
        source: 'CV Circle'
      });
    } else {
      jobTips.push({
        tip: 'Follow up within 24-48 hours after applying to show your interest',
        source: 'LinkedIn'
      });
    }

    if (jobs.filter(job => job.status === 'interview').length === 0) {
      jobTips.push({
        tip: 'Focus on quality applications over quantity for better results',
        source: 'Indeed'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        cvHealthScore,
        vaultCounts: {
          cvs: cvs.length,
          coverLetters: coverLetters.length,
          jobDescriptions: jobs.length,
          notes: Math.floor((cvs.length + jobs.length + coverLetters.length) * 0.3)
        },
        aiGoal,
        aiMetrics,
        strengths: Array.from(allSkills).slice(0, 5),
        gaps: Array.from(skillGaps).slice(0, 3),
        jobTips
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
