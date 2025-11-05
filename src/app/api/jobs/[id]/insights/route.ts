import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { JobApplication } from '@/models';

/**
 * GET /api/jobs/[id]/insights
 * 
 * Fetches dynamic insights and analytics for a specific job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const { id: jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Find the job
    const job = await JobApplication.findById(jobId).lean();
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Ensure job has required fields
    const jobData = job as any;
    if (!jobData.jobTitle && !jobData.company) {
      console.warn('⚠️ Job insights API - Job missing required fields:', { jobId, hasTitle: !!jobData.jobTitle, hasCompany: !!jobData.company });
    }

    // Calculate dynamic insights
    const insights = await calculateJobInsights(jobData);
    
    return NextResponse.json({
      success: true,
      data: {
        insights,
        jobId: jobData._id?.toString() || jobId,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error fetching job insights:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch job insights' },
      { status: 500 }
    );
  }
}

/**
 * Calculate dynamic job insights based on job data and market analysis
 */
async function calculateJobInsights(job: any) {
  try {
    // Calculate keyword match score based on job description analysis
    const keywordMatchScore = calculateKeywordMatchScore(job);
    
    // Analyze company hiring trend based on historical data
    const companyHiringTrend = await analyzeCompanyHiringTrend(job.company);
    
    // Identify skills gap based on job requirements vs user profile
    const skillsGap = await identifySkillsGap(job);
    
    // Calculate market competitiveness
    const marketCompetitiveness = await calculateMarketCompetitiveness(job);
    
    // Generate salary insights
    const salaryInsights = await generateSalaryInsights(job);
    
    return {
      keywordMatchScore,
      companyHiringTrend,
      skillsGap,
      marketCompetitiveness,
      salaryInsights,
      lastAnalyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating job insights:', error);
    return {
      keywordMatchScore: 0,
      companyHiringTrend: 'Unknown',
      skillsGap: 'Unable to analyze',
      marketCompetitiveness: 'Unknown',
      salaryInsights: null,
      lastAnalyzed: new Date().toISOString()
    };
  }
}

/**
 * Calculate keyword match score based on job description
 */
function calculateKeywordMatchScore(job: any): number {
  try {
    if (!job.jobDescription) return 0;
    
    // Define common keywords for different job types
    const keywordCategories = {
      technical: ['javascript', 'python', 'react', 'node.js', 'api', 'database', 'git'],
      design: ['figma', 'sketch', 'adobe', 'ux', 'ui', 'prototype', 'wireframe'],
      marketing: ['seo', 'analytics', 'campaign', 'social media', 'content', 'brand'],
      sales: ['crm', 'leads', 'revenue', 'client', 'negotiation', 'prospecting'],
      management: ['leadership', 'team', 'strategy', 'budget', 'project', 'stakeholder']
    };
    
    const description = job.jobDescription.toLowerCase();
    let totalMatches = 0;
    let totalKeywords = 0;
    
    // Count matches for each category
    Object.values(keywordCategories).forEach(keywords => {
      totalKeywords += keywords.length;
      keywords.forEach(keyword => {
        if (description.includes(keyword)) {
          totalMatches++;
        }
      });
    });
    
    // Calculate percentage
    const score = totalKeywords > 0 ? Math.round((totalMatches / totalKeywords) * 100) : 0;
    return Math.min(score, 100); // Cap at 100%
  } catch (error) {
    console.error('Error calculating keyword match score:', error);
    return 0;
  }
}

/**
 * Analyze company hiring trend
 */
async function analyzeCompanyHiringTrend(company: string): Promise<string> {
  try {
    if (!company) return 'Unknown';
    
    // Look for recent job postings from this company
    const recentJobs = await JobApplication.find({
      company: { $regex: new RegExp(company, 'i') },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).limit(10);
    
    if (recentJobs.length === 0) return 'No recent activity';
    if (recentJobs.length >= 5) return 'High activity';
    if (recentJobs.length >= 2) return 'Moderate activity';
    return 'Low activity';
  } catch (error) {
    console.error('Error analyzing company hiring trend:', error);
    return 'Unknown';
  }
}

/**
 * Identify skills gap based on job requirements
 */
async function identifySkillsGap(job: any): Promise<string> {
  try {
    if (!job.jobDescription) return 'Unable to analyze';
    
    const description = job.jobDescription.toLowerCase();
    
    // Common skills that might be missing
    const commonSkills = [
      'javascript', 'python', 'react', 'angular', 'vue', 'node.js',
      'sql', 'mongodb', 'postgresql', 'aws', 'docker', 'kubernetes',
      'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
      'agile', 'scrum', 'jira', 'confluence', 'slack'
    ];
    
    const mentionedSkills = commonSkills.filter(skill => 
      description.includes(skill)
    );
    
    if (mentionedSkills.length === 0) return 'No specific skills mentioned';
    if (mentionedSkills.length <= 2) return 'Basic requirements';
    if (mentionedSkills.length <= 5) return 'Moderate requirements';
    return 'High requirements';
  } catch (error) {
    console.error('Error identifying skills gap:', error);
    return 'Unable to analyze';
  }
}

/**
 * Calculate market competitiveness
 */
async function calculateMarketCompetitiveness(job: any): Promise<string> {
  try {
    if (!job.jobTitle) return 'Unknown';
    
    // Safely extract first word from job title
    const firstWord = job.jobTitle.split(' ')[0] || job.jobTitle;
    if (!firstWord) return 'Unknown';
    
    // Look for similar job titles in the database
    const similarJobs = await JobApplication.find({
      jobTitle: { $regex: new RegExp(firstWord, 'i') },
      _id: { $ne: job._id }
    }).limit(20);
    
    if (similarJobs.length === 0) return 'Unique opportunity';
    if (similarJobs.length <= 5) return 'Low competition';
    if (similarJobs.length <= 15) return 'Moderate competition';
    return 'High competition';
  } catch (error) {
    console.error('Error calculating market competitiveness:', error);
    return 'Unknown';
  }
}

/**
 * Generate salary insights
 */
async function generateSalaryInsights(job: any): Promise<any> {
  try {
    if (!job.salary || !job.salary.min || !job.salary.max) return null;
    
    // Safely extract first word from job title for search
    const firstWord = job.jobTitle?.split(' ')[0];
    if (!firstWord) return null;
    
    // Look for similar jobs with salary data
    const similarJobs = await JobApplication.find({
      'salary.min': { $exists: true },
      'salary.max': { $exists: true },
      jobTitle: { $regex: new RegExp(firstWord, 'i') },
      _id: { $ne: job._id }
    }).limit(10);
    
    if (similarJobs.length === 0) return null;
    
    // Calculate average salary range
    const salaries = similarJobs
      .filter(j => j.salary?.min && j.salary?.max)
      .map(j => ({
        min: j.salary.min,
        max: j.salary.max
      }));
    
    if (salaries.length === 0) return null;
    
    const avgMin = salaries.reduce((sum, s) => sum + s.min, 0) / salaries.length;
    const avgMax = salaries.reduce((sum, s) => sum + s.max, 0) / salaries.length;
    
    return {
      averageRange: {
        min: Math.round(avgMin),
        max: Math.round(avgMax)
      },
      sampleSize: salaries.length,
      currency: job.salary.currency || 'USD'
    };
  } catch (error) {
    console.error('Error generating salary insights:', error);
    return null;
  }
}
