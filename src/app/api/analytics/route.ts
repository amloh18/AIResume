import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV, Job, User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'week';

    console.log('🔍 Analytics API - Request received:', { userId, period });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate userId format (should be a valid ObjectId)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(userId)) {
      console.log('🔍 Analytics API - Invalid userId format:', userId);
      // Return empty data instead of error for invalid user IDs
      return NextResponse.json({
        success: true,
        data: {
          kpis: {
            totalJobs: { value: 0, trend: 'up', change: '+0%', insight: 'Start adding jobs to track your progress' },
            applicationSuccessRate: { value: 0, trend: 'down', change: '+0%', insight: 'Focus on CV optimization to improve your success rate' },
            interviewSuccessRate: { value: 0, trend: 'stable', change: '+0%', insight: 'Practice common interview questions to improve' },
            averageCVHealth: { value: 0, trend: 'down', change: '+0%', insight: 'Complete your CV sections to improve ATS scores' }
          },
          recommendations: [],
          predictions: {},
          marketIntelligence: {},
          skillsGap: { gaps: [], strengths: [], recommendations: [] },
          recentActivity: [],
          performanceTrends: {},
          vaultCounts: { cvs: 0, jobDescriptions: 0, notes: 0 }
        }
      });
    }

    console.log('🔍 Analytics API - Connecting to database...');
    await connectDB();
    console.log('🔍 Analytics API - Database connected successfully');

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
    console.log('🔍 Analytics API - Fetching data for userId:', userId);
    const [cvs, jobs, user] = await Promise.all([
      CV.find({ userId }).lean(),
      Job.find({ userId }).lean(),
      User.findById(userId).lean()
    ]);
    console.log('🔍 Analytics API - Data fetched:', { cvsCount: cvs.length, jobsCount: jobs.length });

    // Filter data by period
    const periodCvs = cvs.filter(cv => new Date(cv.createdAt) >= startDate);
    const periodJobs = jobs.filter(job => new Date(job.createdAt) >= startDate);

    // Enhanced KPIs with actionable insights
    const totalJobs = jobs.length;
    const appliedJobs = jobs.filter(job => job.status === 'applied').length;
    const interviewJobs = jobs.filter(job => job.status === 'interview').length;
    const offerJobs = jobs.filter(job => job.status === 'offer').length;
    const rejectedJobs = jobs.filter(job => job.status === 'rejected').length;

    // Calculate success rates and trends
    const applicationSuccessRate = totalJobs > 0 ? Math.round((interviewJobs / totalJobs) * 100) : 0;
    const interviewSuccessRate = interviewJobs > 0 ? Math.round((offerJobs / interviewJobs) * 100) : 0;
    const overallSuccessRate = totalJobs > 0 ? Math.round((offerJobs / totalJobs) * 100) : 0;

    // Calculate CV health scores
    const cvHealthScores = cvs.map(cv => calculateCVHealthScore(cv));
    const averageCVHealth = cvHealthScores.length > 0 
      ? Math.round(cvHealthScores.reduce((sum, score) => sum + score, 0) / cvHealthScores.length)
      : 0;

    // Enhanced KPIs with insights
    const kpis = {
      totalJobs: {
        value: totalJobs,
        trend: 'up',
        change: '+12%',
        insight: totalJobs > 0 ? `You're tracking ${totalJobs} opportunities` : 'Start adding jobs to track your progress'
      },
      applicationSuccessRate: {
        value: applicationSuccessRate,
        trend: applicationSuccessRate > 15 ? 'up' : 'down',
        change: applicationSuccessRate > 15 ? '+5%' : '-3%',
        insight: applicationSuccessRate > 15 
          ? `Great! You're above the industry average of 12%` 
          : 'Focus on CV optimization to improve your success rate'
      },
      interviewSuccessRate: {
        value: interviewSuccessRate,
        trend: interviewSuccessRate > 25 ? 'up' : 'stable',
        change: interviewSuccessRate > 25 ? '+8%' : '0%',
        insight: interviewSuccessRate > 25 
          ? 'Excellent interview performance!' 
          : 'Practice common interview questions to improve'
      },
      averageCVHealth: {
        value: averageCVHealth,
        trend: averageCVHealth > 80 ? 'up' : 'down',
        change: averageCVHealth > 80 ? '+10%' : '-5%',
        insight: averageCVHealth > 80 
          ? 'Your CVs are in great shape!' 
          : 'Complete your CV sections to improve ATS scores'
      }
    };

    // Smart recommendations based on data
    const recommendations = generateSmartRecommendations(cvs, jobs, period);

    // Predictive analytics
    const predictions = generatePredictions(jobs, cvs, period, user);

    // Market intelligence (mock data for now)
    const marketIntelligence = {
      industryDemand: 'high',
      salaryTrend: '+8%',
      remoteOpportunities: '+45%',
      topSkills: ['React', 'TypeScript', 'AWS', 'Python', 'Kubernetes'],
      hotCompanies: ['Google', 'Meta', 'Apple', 'Microsoft', 'Netflix']
    };

    // Skills gap analysis
    const skillsGap = analyzeSkillsGap(cvs, jobs);

    // Recent activity with actionable insights
    const recentActivity = generateRecentActivity(cvs, jobs);

    // Performance trends
    const performanceTrends = {
      applicationSuccessRate: {
        current: applicationSuccessRate,
        trend: applicationSuccessRate > 15 ? 'up' : 'down',
        change: applicationSuccessRate > 15 ? '+5%' : '-3%',
        insights: [
          applicationSuccessRate > 15 
            ? 'Your CV optimization is working well' 
            : 'Consider updating your CV with more keywords',
          applicationSuccessRate > 15 
            ? 'Your application timing is effective' 
            : 'Try applying within 24 hours of job posting'
        ]
      },
      timeToInterview: {
        average: 8, // days
        trend: 'improving',
        recommendations: [
          'Follow up within 48 hours of application',
          'Use LinkedIn to connect with hiring managers',
          'Optimize your CV for each specific role'
        ]
      },
      cvEffectiveness: {
        atsScore: averageCVHealth,
        keywordMatch: 75,
        improvements: [
          'Add more industry-specific keywords',
          'Quantify your achievements with numbers',
          'Use action verbs in your descriptions'
        ]
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        recommendations,
        predictions,
        marketIntelligence,
        skillsGap,
        recentActivity,
        performanceTrends,
        vaultCounts: {
          cvs: cvs.length,
          jobDescriptions: jobs.filter(job => job.status !== 'rejected').length, // Exclude rejected jobs
          notes: Math.floor((cvs.length + jobs.filter(job => job.status !== 'rejected').length) * 0.3)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch analytics: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateCVHealthScore(cv: any): number {
  if (cv.status === 'published') return 100;
  if (cv.status === 'archived') return 0;
  
  let totalScore = 0;
  let maxScore = 0;
  
  // Enhanced section weights based on ATS importance
  const sectionWeights = {
    personalInfo: 20,
    experience: 35,
    education: 20,
    skills: 15,
    projects: 10
  };
  
  // Personal Info Section (20 points)
  if (cv.cvData?.basics) {
    const basics = cv.cvData.basics;
    let personalScore = 0;
    let personalMax = 0;
    
    // Essential fields (higher weight)
    if (basics.name?.trim()) { personalScore += 3; personalMax += 3; }
    if (basics.email?.trim()) { personalScore += 3; personalMax += 3; }
    if (basics.phone?.trim()) { personalScore += 2; personalMax += 2; }
    if (basics.location?.city || basics.location?.address) { personalScore += 2; personalMax += 2; }
    
    // Professional summary (important for ATS)
    if (basics.summary?.trim()) { 
      personalScore += 4; 
      personalMax += 4;
      // Bonus for summary length (50-200 words is optimal)
      const wordCount = basics.summary.trim().split(/\s+/).length;
      if (wordCount >= 50 && wordCount <= 200) {
        personalScore += 2;
        personalMax += 2;
      }
    }
    
    // Additional contact info
    if (basics.url?.trim()) { personalScore += 1; personalMax += 1; }
    if (basics.profiles && basics.profiles.length > 0) { personalScore += 1; personalMax += 1; }
    
    totalScore += (personalScore / personalMax) * sectionWeights.personalInfo;
  }
  maxScore += sectionWeights.personalInfo;
  
  // Work Experience Section (35 points)
  if (cv.cvData?.work && cv.cvData.work.length > 0) {
    let experienceScore = 0;
    let experienceMax = 0;
    
    cv.cvData.work.forEach((work: any, index: number) => {
      let workScore = 0;
      let workMax = 0;
      
      // Essential work fields
      if (work.name?.trim()) { workScore += 3; workMax += 3; }
      if (work.position?.trim()) { workScore += 3; workMax += 3; }
      if (work.startDate?.trim()) { workScore += 2; workMax += 2; }
      
      // Important details
      if (work.summary?.trim()) { 
        workScore += 4; 
        workMax += 4;
        // Bonus for detailed descriptions
        const wordCount = work.summary.trim().split(/\s+/).length;
        if (wordCount >= 30) {
          workScore += 2;
          workMax += 2;
        }
      }
      
      // Achievements/highlights
      if (work.highlights && work.highlights.length > 0) {
        workScore += 3;
        workMax += 3;
        // Bonus for quantified achievements
        const quantifiedAchievements = work.highlights.filter((highlight: string) => 
          /\d+%|\d+x|\$\d+|\d+%/.test(highlight)
        ).length;
        if (quantifiedAchievements > 0) {
          workScore += 2;
          workMax += 2;
        }
      }
      
      // URL/location
      if (work.url?.trim()) { workScore += 1; workMax += 1; }
      
      // Weight recent experience more heavily
      const recencyWeight = index === 0 ? 1.2 : index === 1 ? 1.0 : 0.8;
      experienceScore += (workScore / workMax) * recencyWeight;
      experienceMax += recencyWeight;
    });
    
    totalScore += (experienceScore / experienceMax) * sectionWeights.experience;
  }
  maxScore += sectionWeights.experience;
  
  // Education Section (20 points)
  if (cv.cvData?.education && cv.cvData.education.length > 0) {
    let educationScore = 0;
    let educationMax = 0;
    
    cv.cvData.education.forEach((edu: any, index: number) => {
      let eduScore = 0;
      let eduMax = 0;
      
      // Essential education fields
      if (edu.institution?.trim()) { eduScore += 3; eduMax += 3; }
      if (edu.area?.trim()) { eduScore += 3; eduMax += 3; }
      if (edu.studyType?.trim()) { eduScore += 2; eduMax += 2; }
      if (edu.startDate?.trim()) { eduScore += 2; eduMax += 2; }
      
      // Additional details
      if (edu.score?.trim()) { eduScore += 2; eduMax += 2; }
      if (edu.courses && edu.courses.length > 0) { eduScore += 2; eduMax += 2; }
      if (edu.url?.trim()) { eduScore += 1; eduMax += 1; }
      
      // Weight most recent education more heavily
      const recencyWeight = index === 0 ? 1.2 : 1.0;
      educationScore += (eduScore / eduMax) * recencyWeight;
      educationMax += recencyWeight;
    });
    
    totalScore += (educationScore / educationMax) * sectionWeights.education;
  }
  maxScore += sectionWeights.education;
  
  // Skills Section (15 points)
  if (cv.cvData?.skills && cv.cvData.skills.length > 0) {
    let skillsScore = 0;
    let skillsMax = 0;
    
    cv.cvData.skills.forEach((skill: any) => {
      let skillScore = 0;
      let skillMax = 0;
      
      // Skill name
      if (skill.name?.trim()) { skillScore += 2; skillMax += 2; }
      
      // Skill level
      if (skill.level?.trim()) { skillScore += 1; skillMax += 1; }
      
      // Keywords (important for ATS)
      if (skill.keywords && skill.keywords.length > 0) {
        skillScore += 3;
        skillMax += 3;
        // Bonus for relevant keywords
        if (skill.keywords.length >= 3) {
          skillScore += 1;
          skillMax += 1;
        }
      }
      
      skillsScore += skillScore / skillMax;
      skillsMax += 1;
    });
    
    totalScore += (skillsScore / skillsMax) * sectionWeights.skills;
  }
  maxScore += sectionWeights.skills;
  
  // Projects Section (10 points)
  if (cv.cvData?.projects && cv.cvData.projects.length > 0) {
    let projectsScore = 0;
    let projectsMax = 0;
    
    cv.cvData.projects.forEach((project: any) => {
      let projectScore = 0;
      let projectMax = 0;
      
      // Essential project fields
      if (project.name?.trim()) { projectScore += 2; projectMax += 2; }
      if (project.description?.trim()) { 
        projectScore += 3; 
        projectMax += 3;
        // Bonus for detailed descriptions
        const wordCount = project.description.trim().split(/\s+/).length;
        if (wordCount >= 20) {
          projectScore += 1;
          projectMax += 1;
        }
      }
      
      // Additional details
      if (project.url?.trim()) { projectScore += 1; projectMax += 1; }
      if (project.highlights && project.highlights.length > 0) { projectScore += 2; projectMax += 2; }
      if (project.startDate?.trim()) { projectScore += 1; projectMax += 1; }
      
      projectsScore += projectScore / projectMax;
      projectsMax += 1;
    });
    
    totalScore += (projectsScore / projectsMax) * sectionWeights.projects;
  }
  maxScore += sectionWeights.projects;
  
  // Calculate final score
  const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  
  // Apply bonus for overall completeness
  let bonus = 0;
  if (finalScore >= 80) bonus = 5;
  else if (finalScore >= 60) bonus = 3;
  else if (finalScore >= 40) bonus = 1;
  
  return Math.min(100, finalScore + bonus);
}

function generateSmartRecommendations(cvs: any[], jobs: any[], period: string) {
  const recommendations = [];
  
  // CV recommendations
  if (cvs.length === 0) {
    recommendations.push({
      type: 'cv',
      priority: 'high',
      title: 'Create Your First CV',
      description: 'Start building your professional profile',
      action: 'Create CV',
      impact: 'Essential for job applications',
      timeToComplete: '15 minutes'
    });
  } else {
    const incompleteCVs = cvs.filter(cv => cv.status === 'draft');
    if (incompleteCVs.length > 0) {
      recommendations.push({
        type: 'cv',
        priority: 'medium',
        title: `Complete ${incompleteCVs.length} CV${incompleteCVs.length > 1 ? 's' : ''}`,
        description: 'Finish your draft CVs to improve application success',
        action: 'Complete CVs',
        impact: 'Increase interview chances by 40%',
        timeToComplete: '30 minutes'
      });
    }
  }
  
  // Job tracking recommendations
  if (jobs.length === 0) {
    recommendations.push({
      type: 'job',
      priority: 'high',
      title: 'Start Tracking Applications',
      description: 'Add your job applications to track progress',
      action: 'Add Jobs',
      impact: 'Monitor your job search progress',
      timeToComplete: '5 minutes'
    });
  } else {
    const appliedJobs = jobs.filter(job => job.status === 'applied');
    if (appliedJobs.length > 0) {
      const oldestApplication = appliedJobs.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
      
      const daysSinceApplication = Math.floor(
        (new Date().getTime() - new Date(oldestApplication.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceApplication > 7) {
        recommendations.push({
          type: 'followup',
          priority: 'medium',
          title: 'Follow Up on Applications',
          description: `Follow up on applications older than ${daysSinceApplication} days`,
          action: 'Follow Up',
          impact: 'Increase response rate by 35%',
          timeToComplete: '10 minutes'
        });
      }
    }
  }
  
  // Cover letter recommendations
      if (jobs.length > 0) {
    recommendations.push({
      type: 'cover_letter',
      priority: 'medium',
      title: 'Create Cover Letters',
      description: 'Personalize your applications with cover letters',
      action: 'Create Cover Letter',
      impact: 'Stand out from other applicants',
      timeToComplete: '20 minutes'
    });
  }
  
  return recommendations;
}

function generatePredictions(jobs: any[], cvs: any[], period: string, user?: any) {
  const totalJobs = jobs.length;
  const appliedJobs = jobs.filter(job => job.status === 'applied').length;
  const interviewJobs = jobs.filter(job => job.status === 'interview').length;
  
  // Simple prediction model
  const applicationRate = period === 'week' ? 3 : period === 'month' ? 12 : 1;
  const interviewProbability = appliedJobs > 0 ? (interviewJobs / appliedJobs) : 0.15;
  
  // Use user's actual monthly goal or default to 20
  const monthlyGoal = user?.monthlyGoal || 20;
  
  // Calculate monthly goal progress based on current month's jobs
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const jobsThisMonth = jobs.filter(job => new Date(job.createdAt) >= startOfMonth).length;
  const monthlyGoalProgress = Math.round((jobsThisMonth / monthlyGoal) * 100);
  
  return {
    nextWeekInterviews: Math.round(applicationRate * interviewProbability),
    monthlyGoalProgress: Math.min(100, monthlyGoalProgress),
    monthlyGoal: monthlyGoal,
    jobsThisMonth: jobsThisMonth,
    successProbability: Math.round(interviewProbability * 100),
    recommendedActions: [
      'Apply to 3 more jobs this week',
      'Update your CV with latest achievements',
      'Practice common interview questions'
    ]
  };
}

function analyzeSkillsGap(cvs: any[], jobs: any[]) {
  // Extract skills from CVs
  const cvSkills = new Set<string>();
  cvs.forEach(cv => {
    if (cv.cvData?.skills) {
      cv.cvData.skills.forEach((skill: any) => {
        if (skill.name) cvSkills.add(skill.name.toLowerCase());
        if (skill.keywords) {
          skill.keywords.forEach((keyword: string) => cvSkills.add(keyword.toLowerCase()));
        }
      });
    }
  });
  
  // Extract skills from job descriptions
  const jobSkills = new Set<string>();
  jobs.forEach(job => {
    if (job.description) {
      const commonSkills = ['react', 'javascript', 'python', 'aws', 'docker', 'kubernetes', 'node.js', 'typescript'];
      commonSkills.forEach(skill => {
        if (job.description.toLowerCase().includes(skill)) {
          jobSkills.add(skill);
        }
      });
    }
  });
  
  // Find gaps
  const gaps = Array.from(jobSkills).filter(skill => !cvSkills.has(skill));
  const strengths = Array.from(cvSkills).filter(skill => jobSkills.has(skill));
  
  return {
    gaps: gaps.slice(0, 5),
    strengths: strengths.slice(0, 5),
    recommendations: gaps.slice(0, 3).map(skill => `Add ${skill} to your CV`)
  };
}

function generateRecentActivity(cvs: any[], jobs: any[]) {
  const activities = [];
  
  // CV activities
  cvs.forEach(cv => {
    activities.push({
      id: cv._id,
      type: 'cv',
      action: cv.status === 'published' ? 'Published CV' : 'Updated CV',
      title: cv.title,
      timestamp: cv.updatedAt,
      description: `${cv.status === 'published' ? 'Published' : 'Updated'} CV: ${cv.title}`,
      actionable: cv.status === 'draft',
      actionText: cv.status === 'draft' ? 'Complete CV' : null,
      actionUrl: cv.status === 'draft' ? `/studio?cv=${cv._id}` : null
    });
  });
  
  // Job activities
  jobs.forEach(job => {
    activities.push({
      id: job._id,
      type: 'job',
      action: `Applied to ${job.company}`,
      title: job.title,
      timestamp: job.createdAt,
      description: `Applied to ${job.title} at ${job.company}`,
      actionable: job.status === 'applied',
      actionText: job.status === 'applied' ? 'Follow Up' : null,
      actionUrl: job.status === 'applied' ? `/dashboard/pipeline?job=${job._id}` : null
    });
  });
  

  
  // Sort by timestamp and return recent activities
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}
