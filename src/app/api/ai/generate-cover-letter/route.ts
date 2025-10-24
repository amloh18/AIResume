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

/**
 * Calculate experience duration in years and months
 */
function calculateExperienceDuration(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate);
    const end = endDate.toLowerCase().includes('present') || !endDate ? new Date() : new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '';
    }
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0 && remainingMonths > 0) {
      return `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (remainingMonths > 0) {
      return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Calculate total years of experience
 */
function calculateTotalExperience(experiences: any[]): number {
  let totalMonths = 0;
  
  for (const exp of experiences) {
    try {
      const start = new Date(exp.startDate);
      const end = exp.endDate?.toLowerCase().includes('present') || !exp.endDate ? new Date() : new Date(exp.endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += Math.max(0, months);
      }
    } catch (error) {
      continue;
    }
  }
  
  return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
}

function generateCoverLetterContent(cvInfo: any, jobInfo: any): string {
  const { name, summary, experience = [], skills = [] } = cvInfo;
  const { title, company, description, requirements = [] } = jobInfo;
  
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalYears = calculateTotalExperience(experience);

  // Extract key skills from job description
  const jobSkills = extractSkillsFromDescription(description);
  
  // Find matching skills between CV and job
  const matchingSkills = skills
    .filter((skill: any) => jobSkills.some((jobSkill: string) => 
      skill.name?.toLowerCase().includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(skill.name?.toLowerCase())
    ))
    .slice(0, 4);

  // Get most recent and relevant experience
  const recentExperience = experience[0];
  const experienceDuration = recentExperience 
    ? calculateExperienceDuration(recentExperience.startDate, recentExperience.endDate)
    : '';

  // Build opening sentence based on experience level
  let openingExperience = '';
  if (totalYears >= 5) {
    openingExperience = `over ${Math.floor(totalYears)} years of professional experience`;
  } else if (totalYears >= 2) {
    openingExperience = `${Math.floor(totalYears)}+ years of proven expertise`;
  } else if (totalYears >= 1) {
    openingExperience = `solid professional background`;
  } else {
    openingExperience = `strong foundation and enthusiasm`;
  }

  // Extract key achievements from experience
  const keyAchievements: string[] = [];
  for (const exp of experience.slice(0, 2)) {
    if (exp.highlights && Array.isArray(exp.highlights)) {
      keyAchievements.push(...exp.highlights.slice(0, 2));
    } else if (exp.summary) {
      keyAchievements.push(exp.summary);
    }
  }

  // Generate cover letter content
  let content = `${name}\n`;
  if (cvInfo.location) content += `${cvInfo.location} | `;
  if (cvInfo.phone) content += `${cvInfo.phone} | `;
  if (cvInfo.email) content += `${cvInfo.email}`;
  content += `\n\n${currentDate}\n\n`;
  content += `Hiring Manager\n${company}\n\n`;
  content += `Dear Hiring Manager,\n\n`;

  // Opening paragraph - strong hook
  content += `I am writing to express my strong interest in the ${title} position at ${company}. `;
  content += `With ${openingExperience}`;
  if (matchingSkills.length > 0) {
    content += ` in ${matchingSkills.slice(0, 2).map((s: any) => s.name).join(' and ')}`;
  }
  content += `, I am confident in my ability to contribute meaningfully to your team and help drive ${company}'s continued success.\n\n`;

  // Experience paragraph - focus on impact, NOT dates
  if (recentExperience) {
    content += `In my recent role as ${recentExperience.position} at ${recentExperience.name}`;
    if (experienceDuration) {
      content += ` (${experienceDuration})`;
    }
    content += `, I have `;
    
    // Use actual achievements, not dates
    if (keyAchievements.length > 0) {
      // Take first achievement and clean it up
      let achievement = keyAchievements[0];
      // Remove any dates or time periods from achievements
      achievement = achievement.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, ''); // Remove dates like 05/11/2022
      achievement = achievement.replace(/\d{4}-\d{2}-\d{2}/g, ''); // Remove dates like 2022-11-05
      achievement = achievement.replace(/\s+/g, ' ').trim(); // Clean up extra spaces
      
      // Make sure it starts with a lowercase letter if it's a continuation
      if (achievement.charAt(0) === achievement.charAt(0).toUpperCase() && achievement.length > 0) {
        achievement = achievement.charAt(0).toLowerCase() + achievement.slice(1);
      }
      
      content += achievement;
      if (!achievement.endsWith('.')) content += '.';
    } else if (recentExperience.summary) {
      let summary = recentExperience.summary;
      summary = summary.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '');
      summary = summary.replace(/\d{4}-\d{2}-\d{2}/g, '');
      summary = summary.replace(/\s+/g, ' ').trim();
      content += summary;
      if (!summary.endsWith('.')) content += '.';
    } else {
      content += `consistently delivered high-impact results and demonstrated strong problem-solving abilities.`;
    }
    content += ` This experience has equipped me with the expertise necessary to excel in the ${title} role.\n\n`;
  }

  // Skills & qualifications paragraph - match to job requirements
  if (matchingSkills.length > 0) {
    content += `My technical expertise includes ${matchingSkills.map((skill: any) => skill.name).join(', ')}, `;
    content += `which directly aligns with the key requirements for this position. `;
    
    // Add more specific achievement if available
    if (keyAchievements.length > 1) {
      let achievement = keyAchievements[1];
      achievement = achievement.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '');
      achievement = achievement.replace(/\d{4}-\d{2}-\d{2}/g, '');
      achievement = achievement.replace(/\s+/g, ' ').trim();
      
      content += `For example, I ${achievement}`;
      if (!achievement.endsWith('.')) content += '.';
      content += ` `;
    }
    
    content += `I am particularly excited about the opportunity to apply these skills at ${company} and contribute to your team's objectives.\n\n`;
  }

  // Closing paragraph - strong call to action
  content += `I am eager to discuss how my background, skills, and enthusiasm can contribute to ${company}'s success. `;
  content += `I would welcome the opportunity to speak with you about how I can add value to your team and help achieve your goals.\n\n`;
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
