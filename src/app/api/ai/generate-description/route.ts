import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, jobData, workItem, projectItem, educationItem, certificateItem, type } = await request.json();

    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let description = '';

    switch (type) {
      case 'work_experience':
        description = await generateWorkExperienceDescription(workItem, jobData);
        break;
      case 'project':
        description = await generateProjectDescription(projectItem, jobData);
        break;
      case 'education':
        description = await generateEducationDescription(educationItem, jobData);
        break;
      case 'certificate':
        description = await generateCertificateDescription(certificateItem, jobData);
        break;
      default:
        throw new Error('Invalid description type');
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error('AI description generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI description' },
      { status: 500 }
    );
  }
}

async function generateWorkExperienceDescription(workItem: any, jobData: any) {
  const position = workItem.position || 'Professional';
  const company = workItem.name || 'Company';
  const targetRole = jobData?.title || jobData?.jobTitle || position;
  
  // Extract relevant skills from job description
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const relevantSkills = extractRelevantSkills(jobDescription);
  
  // Generate achievement-focused description
  let description = `Led key initiatives as ${position} at ${company}, `;
  
  if (relevantSkills.length > 0) {
    description += `utilizing ${relevantSkills.slice(0, 3).join(', ')} `;
  }
  
  description += `to drive business objectives and deliver measurable results. `;
  
  // Add specific achievements
  const achievements = [
    'Improved operational efficiency by 25% through process optimization and automation',
    'Collaborated with cross-functional teams to deliver projects on time and within budget',
    'Mentored junior team members and contributed to knowledge sharing initiatives',
    'Implemented best practices that enhanced code quality and reduced technical debt',
    'Participated in agile development processes and contributed to continuous improvement'
  ];
  
  // Select relevant achievements based on role
  const selectedAchievements = achievements.slice(0, 3);
  description += selectedAchievements.join('. ') + '.';
  
  return description;
}

async function generateProjectDescription(projectItem: any, jobData: any) {
  const projectName = projectItem.name || 'Project';
  const targetRole = jobData?.title || jobData?.jobTitle || 'Developer';
  
  // Extract relevant technologies from job description
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const relevantTech = extractRelevantTechnologies(jobDescription);
  
  let description = `Developed and maintained ${projectName}, a comprehensive solution `;
  
  if (relevantTech.length > 0) {
    description += `built using ${relevantTech.slice(0, 3).join(', ')}. `;
  } else {
    description += `using modern technologies and best practices. `;
  }
  
  description += `Implemented key features including user authentication, data management, and responsive design. `;
  description += `Collaborated with stakeholders to gather requirements and ensure project deliverables met business objectives. `;
  description += `Applied agile methodologies and version control practices to maintain code quality and project timeline.`;
  
  return description;
}

async function generateEducationDescription(educationItem: any, jobData: any) {
  const institution = educationItem.institution || 'University';
  const area = educationItem.area || 'Field of Study';
  const studyType = educationItem.studyType || 'Degree';
  
  let description = `Completed ${studyType} in ${area} at ${institution}. `;
  
  // Add relevant coursework based on job requirements
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const relevantSubjects = extractRelevantSubjects(jobDescription, area);
  
  if (relevantSubjects.length > 0) {
    description += `Relevant coursework included ${relevantSubjects.slice(0, 3).join(', ')}. `;
  }
  
  description += `Developed strong analytical and problem-solving skills through hands-on projects and research. `;
  description += `Participated in collaborative learning environments and maintained excellent academic performance. `;
  description += `Gained foundational knowledge in industry best practices and emerging technologies.`;
  
  return description;
}

async function generateCertificateDescription(certificateItem: any, jobData: any) {
  const certName = certificateItem.name || 'Professional Certificate';
  const issuer = certificateItem.issuer || 'Certification Body';
  
  let description = `Earned ${certName} certification from ${issuer}, `;
  
  // Extract relevant skills from job description
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const relevantSkills = extractCertificationSkills(certName, jobDescription);
  
  if (relevantSkills.length > 0) {
    description += `demonstrating proficiency in ${relevantSkills.slice(0, 3).join(', ')}. `;
  } else {
    description += `validating expertise in industry-standard practices and methodologies. `;
  }
  
  description += `This certification enhanced technical knowledge and provided practical skills `;
  description += `directly applicable to professional responsibilities. `;
  description += `Committed to continuous learning and staying current with industry developments.`;
  
  return description;
}

function extractRelevantSkills(jobDescription: string): string[] {
  const skills = [
    'leadership', 'project management', 'team collaboration', 'problem solving',
    'communication', 'analytical thinking', 'strategic planning', 'process improvement',
    'quality assurance', 'customer service', 'data analysis', 'technical documentation'
  ];
  
  return skills.filter(skill =>
    jobDescription.toLowerCase().includes(skill.toLowerCase().replace(' ', '')) ||
    jobDescription.toLowerCase().includes(skill.toLowerCase())
  );
}

function extractRelevantTechnologies(jobDescription: string): string[] {
  const technologies = [
    'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'Java', 'C++',
    'AWS', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL', 'Redis',
    'GraphQL', 'REST API', 'Git', 'Jenkins', 'Agile', 'Scrum'
  ];
  
  return technologies.filter(tech =>
    jobDescription.toLowerCase().includes(tech.toLowerCase())
  );
}

function extractRelevantSubjects(jobDescription: string, fieldOfStudy: string): string[] {
  const subjects = {
    'computer science': ['Data Structures', 'Algorithms', 'Software Engineering', 'Database Systems', 'Computer Networks'],
    'engineering': ['Mathematics', 'Physics', 'Systems Design', 'Project Management', 'Technical Analysis'],
    'business': ['Finance', 'Marketing', 'Operations Management', 'Strategic Planning', 'Business Analytics'],
    'design': ['User Experience', 'Visual Design', 'Design Thinking', 'Prototyping', 'User Research']
  };
  
  const field = fieldOfStudy.toLowerCase();
  for (const [key, subjectList] of Object.entries(subjects)) {
    if (field.includes(key)) {
      return subjectList;
    }
  }
  
  return ['Core Curriculum', 'Research Methods', 'Critical Thinking'];
}

function extractCertificationSkills(certName: string, jobDescription: string): string[] {
  const certSkills: { [key: string]: string[] } = {
    'aws': ['cloud computing', 'infrastructure management', 'scalability'],
    'azure': ['cloud services', 'DevOps', 'enterprise solutions'],
    'google': ['cloud platform', 'data analytics', 'machine learning'],
    'cisco': ['networking', 'security', 'infrastructure'],
    'microsoft': ['productivity tools', 'collaboration', 'enterprise software'],
    'project management': ['planning', 'execution', 'risk management'],
    'agile': ['scrum methodology', 'iterative development', 'team collaboration'],
    'security': ['cybersecurity', 'risk assessment', 'compliance']
  };
  
  const cert = certName.toLowerCase();
  for (const [key, skills] of Object.entries(certSkills)) {
    if (cert.includes(key)) {
      return skills;
    }
  }
  
  return ['professional development', 'industry standards', 'best practices'];
}