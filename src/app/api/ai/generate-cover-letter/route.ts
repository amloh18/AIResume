import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cvInfo, jobInfo } = body;

    // Validate input
    if (!cvInfo || !jobInfo) {
      return NextResponse.json(
        { success: false, error: 'CV and job information are required' },
        { status: 400 }
      );
    }

    // Generate cover letter content based on CV and job information
    const coverLetterContent = generateCoverLetterContent(cvInfo, jobInfo);

    return NextResponse.json({
      success: true,
      content: coverLetterContent
    });
  } catch (error) {
    console.error('Error generating cover letter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}

function generateCoverLetterContent(cvInfo: any, jobInfo: any): string {
  const { name, summary, experience, skills } = cvInfo;
  const { title, company, description } = jobInfo;

  // Extract key skills from job description
  const jobSkills = extractSkillsFromDescription(description);
  
  // Find matching skills between CV and job
  const matchingSkills = skills
    .filter((skill: any) => jobSkills.some((jobSkill: string) => 
      skill.name.toLowerCase().includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(skill.name.toLowerCase())
    ))
    .slice(0, 3);

  // Generate cover letter content
  let content = `Dear Hiring Manager,\n\n`;

  // Opening paragraph
  content += `I am writing to express my strong interest in the ${title} position at ${company}. `;
  content += `With my background in ${experience.length > 0 ? experience[0].position : 'professional work'} `;
  content += `and my passion for ${matchingSkills.length > 0 ? matchingSkills[0].name : 'excellence'}, `;
  content += `I am confident that I would be a valuable addition to your team.\n\n`;

  // Experience paragraph
  if (experience.length > 0) {
    content += `In my most recent role as ${experience[0].position} at ${experience[0].name}, `;
    content += `I ${experience[0].summary ? experience[0].summary.slice(0, 100) + '...' : 'demonstrated strong leadership and technical skills'}. `;
    content += `This experience has equipped me with the skills and knowledge necessary to excel in the ${title} position.\n\n`;
  }

  // Skills paragraph
  if (matchingSkills.length > 0) {
    content += `My expertise in ${matchingSkills.map((skill: any) => skill.name).join(', ')} `;
    content += `aligns perfectly with the requirements for this role. `;
    content += `I am particularly excited about the opportunity to apply these skills in a dynamic environment like ${company}.\n\n`;
  }

  // Closing paragraph
  content += `I am eager to discuss how my background, skills, and enthusiasm can contribute to ${company}'s continued success. `;
  content += `I would welcome the opportunity to speak with you about how I can add value to your team.\n\n`;
  content += `Thank you for considering my application. I look forward to hearing from you.\n\n`;
  content += `Best regards,\n${name}`;

  return content;
}

function extractSkillsFromDescription(description: string): string[] {
  if (!description) return [];
  
  // Common technical skills to look for
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'MongoDB',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'Agile', 'Scrum', 'Machine Learning',
    'Data Analysis', 'Project Management', 'Leadership', 'Communication',
    'Problem Solving', 'Teamwork', 'Customer Service', 'Sales', 'Marketing'
  ];

  const foundSkills = commonSkills.filter(skill => 
    description.toLowerCase().includes(skill.toLowerCase())
  );

  return foundSkills.slice(0, 5); // Return top 5 matching skills
}
