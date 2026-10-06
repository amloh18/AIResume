import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, cvData, jobData, personalInfo, type } = await request.json();

    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await generateProfessionalSummary({
      cvData,
      jobData,
      personalInfo,
      type
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('AI summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI summary' },
      { status: 500 }
    );
  }
}

async function generateProfessionalSummary({
  cvData,
  jobData,
  personalInfo,
  type
}: {
  cvData: any;
  jobData: any;
  personalInfo: any;
  type: string;
}) {
  // Extract relevant information
  const name = personalInfo.name || 'Professional';
  const title = personalInfo.label || jobData?.title || 'Professional';
  const targetRole = jobData?.title || jobData?.jobTitle || title;
  const company = jobData?.company || 'target company';
  
  // Extract skills from CV
  const skills = cvData?.skills?.map((skill: any) => {
    if (skill.category) return skill.category;
    if (skill.name) return skill.name;
    if (Array.isArray(skill.skills)) return skill.skills[0];
    if (Array.isArray(skill.keywords)) return skill.keywords[0];
    return null;
  }).filter(Boolean).slice(0, 5) || [];
  
  // Extract experience years
  const experienceYears = calculateExperienceYears(cvData?.work || []);
  
  // Extract key technologies/tools from job description
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const keyTechnologies = extractKeyTechnologies(jobDescription);
  
  // Generate contextual summary based on available information
  let summary = '';
  
  if (experienceYears > 0) {
    summary += `${experienceYears}+ years experienced ${title} `;
  } else {
    summary += `Motivated ${title} `;
  }
  
  if (skills.length > 0) {
    summary += `with expertise in ${skills.slice(0, 3).join(', ')}. `;
  }
  
  if (keyTechnologies.length > 0) {
    summary += `Proficient in ${keyTechnologies.slice(0, 3).join(', ')} `;
  }
  
  summary += `with a proven track record of delivering high-quality solutions and driving business growth. `;
  
  if (targetRole && targetRole !== title) {
    summary += `Seeking to leverage technical expertise and leadership skills in a ${targetRole} role `;
    if (company !== 'target company') {
      summary += `at ${company} `;
    }
  }
  
  summary += `to contribute to innovative projects and achieve organizational objectives. Strong problem-solving abilities and excellent communication skills with experience in collaborative team environments.`;
  
  return summary;
}

function calculateExperienceYears(workExperience: any[]): number {
  if (!workExperience || workExperience.length === 0) return 0;
  
  let totalMonths = 0;
  const currentYear = new Date().getFullYear();
  
  workExperience.forEach(job => {
    const startYear = job.startDate ? parseInt(job.startDate.split('-')[0] || job.startDate.split('/')[2] || currentYear.toString()) : currentYear;
    const endYear = job.endDate && job.endDate !== 'Present' 
      ? parseInt(job.endDate.split('-')[0] || job.endDate.split('/')[2] || currentYear.toString())
      : currentYear;
    
    totalMonths += Math.max(0, (endYear - startYear) * 12);
  });
  
  return Math.round(totalMonths / 12);
}

function extractKeyTechnologies(jobDescription: string): string[] {
  const technologies = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js',
    'TypeScript', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'MongoDB',
    'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'GraphQL', 'REST API',
    'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Agile', 'Scrum'
  ];
  
  return technologies.filter(tech =>
    jobDescription.toLowerCase().includes(tech.toLowerCase())
  ).slice(0, 5);
}