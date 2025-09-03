import { NextRequest, NextResponse } from 'next/server';

interface RestructureRequest {
  cvContent: string;
  jobDescription: string;
  section: 'summary' | 'experience' | 'skills' | 'all';
}

export async function POST(request: NextRequest) {
  try {
    const body: RestructureRequest = await request.json();
    const { cvContent, jobDescription, section } = body;

    if (!cvContent || !jobDescription) {
      return NextResponse.json(
        { error: 'CV content and job description are required' },
        { status: 400 }
      );
    }

    // Extract key requirements from job description
    const jobKeywords = extractKeywords(jobDescription);
    const jobRequirements = extractRequirements(jobDescription);

    // Restructure CV content based on section
    let restructuredContent = '';
    
    switch (section) {
      case 'summary':
        restructuredContent = restructureSummary(cvContent, jobKeywords, jobRequirements);
        break;
      case 'experience':
        restructuredContent = restructureExperience(cvContent, jobKeywords, jobRequirements);
        break;
      case 'skills':
        restructuredContent = restructureSkills(cvContent, jobKeywords);
        break;
      case 'all':
        restructuredContent = restructureAll(cvContent, jobKeywords, jobRequirements);
        break;
      default:
        restructuredContent = cvContent;
    }

    return NextResponse.json({
      success: true,
      restructuredContent,
      jobKeywords,
      suggestions: generateRestructureSuggestions(cvContent, jobKeywords)
    });

  } catch (error) {
    console.error('CV restructuring error:', error);
    return NextResponse.json(
      { error: 'Failed to restructure CV content' },
      { status: 500 }
    );
  }
}

function extractKeywords(jobDescription: string): string[] {
  const keywords = [
    // Technical skills
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes',
    'machine learning', 'ai', 'data analysis', 'frontend', 'backend', 'full stack', 'devops', 'agile',
    'scrum', 'git', 'api', 'rest', 'graphql', 'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby',
    // Soft skills
    'leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'organized',
    'detail oriented', 'multitasking', 'time management', 'collaboration', 'mentoring', 'presentation',
    'negotiation', 'customer service', 'project management'
  ];

  return keywords.filter(keyword => 
    jobDescription.toLowerCase().includes(keyword)
  );
}

function extractRequirements(jobDescription: string): string[] {
  const requirements: string[] = [];
  const lines = jobDescription.split('\n');
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('requirement') || 
        lowerLine.includes('qualification') || 
        lowerLine.includes('must have') || 
        lowerLine.includes('should have') ||
        lowerLine.includes('experience with') ||
        lowerLine.includes('knowledge of')) {
      requirements.push(line.trim());
    }
  }
  
  return requirements;
}

function restructureSummary(originalSummary: string, keywords: string[], requirements: string[]): string {
  let summary = originalSummary;
  
  // Add missing keywords naturally
  const missingKeywords = keywords.filter(keyword => 
    !summary.toLowerCase().includes(keyword)
  );
  
  if (missingKeywords.length > 0) {
    const relevantKeywords = missingKeywords.slice(0, 3); // Limit to 3 most relevant
    const keywordPhrases = relevantKeywords.map(keyword => {
      switch (keyword) {
        case 'javascript': return 'JavaScript development';
        case 'python': return 'Python programming';
        case 'react': return 'React.js development';
        case 'node.js': return 'Node.js backend development';
        case 'sql': return 'SQL database management';
        case 'mongodb': return 'MongoDB database systems';
        case 'aws': return 'AWS cloud services';
        case 'docker': return 'Docker containerization';
        case 'kubernetes': return 'Kubernetes orchestration';
        case 'machine learning': return 'machine learning algorithms';
        case 'ai': return 'artificial intelligence';
        case 'data analysis': return 'data analysis';
        case 'frontend': return 'frontend development';
        case 'backend': return 'backend development';
        case 'full stack': return 'full-stack development';
        case 'devops': return 'DevOps practices';
        case 'agile': return 'Agile methodologies';
        case 'scrum': return 'Scrum framework';
        case 'git': return 'Git version control';
        case 'api': return 'API development';
        case 'rest': return 'RESTful APIs';
        case 'graphql': return 'GraphQL APIs';
        case 'typescript': return 'TypeScript development';
        case 'angular': return 'Angular framework';
        case 'vue': return 'Vue.js development';
        case 'php': return 'PHP development';
        case 'c++': return 'C++ programming';
        case 'c#': return 'C# development';
        case 'ruby': return 'Ruby programming';
        default: return keyword;
      }
    });
    
    if (keywordPhrases.length > 0) {
      const keywordSentence = `with expertise in ${keywordPhrases.join(', ')}`;
      summary = summary.replace(/\.$/, `, ${keywordSentence}.`);
    }
  }
  
  return summary;
}

function restructureExperience(experience: string, keywords: string[], requirements: string[]): string {
  let restructured = experience;
  
  // Add action verbs from requirements
  const actionVerbs = [
    'developed', 'designed', 'implemented', 'managed', 'led', 'coordinated', 'analyzed', 'created', 'built',
    'maintained', 'optimized', 'improved', 'enhanced', 'delivered', 'executed', 'planned', 'organized', 'supervised',
    'trained', 'mentored', 'collaborated', 'communicated', 'presented', 'negotiated', 'resolved', 'troubleshooted',
    'deployed', 'tested', 'debugged', 'documented', 'researched', 'evaluated', 'assessed', 'recommended', 'strategized'
  ];
  
  // Find missing action verbs in the job requirements
  const requiredVerbs = actionVerbs.filter(verb => 
    requirements.some(req => req.toLowerCase().includes(verb))
  );
  
  const missingVerbs = requiredVerbs.filter(verb => 
    !experience.toLowerCase().includes(verb)
  );
  
  if (missingVerbs.length > 0) {
    const verbToAdd = missingVerbs[0]; // Add the first missing verb
    restructured = restructured.replace(/^/, `${verbToAdd.charAt(0).toUpperCase() + verbToAdd.slice(1)} `);
  }
  
  return restructured;
}

function restructureSkills(skills: string, keywords: string[]): string {
  let skillList = skills;
  
  // Remove any bullet points or list markers
  skillList = skillList.replace(/^[-•*]\s*/gm, '');
  
  // Add missing keywords as skills
  const missingKeywords = keywords.filter(keyword => 
    !skillList.toLowerCase().includes(keyword)
  );
  
  if (missingKeywords.length > 0) {
    const relevantSkills = missingKeywords.slice(0, 5); // Limit to 5 most relevant
    if (skillList.trim()) {
      skillList += `, ${relevantSkills.join(', ')}`;
    } else {
      skillList = relevantSkills.join(', ');
    }
  }
  
  return skillList;
}

function restructureAll(content: string, keywords: string[], requirements: string[]): string {
  // Apply all restructuring techniques
  let restructured = content;
  
  // Remove any bullet points or list markers from the entire content
  restructured = restructured.replace(/^[-•*]\s*/gm, '');
  
  // Restructure summary if present
  if (content.toLowerCase().includes('summary') || content.toLowerCase().includes('profile')) {
    const summaryMatch = content.match(/(summary|profile)[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (summaryMatch) {
      const originalSummary = summaryMatch[2];
      const newSummary = restructureSummary(originalSummary, keywords, requirements);
      restructured = restructured.replace(originalSummary, newSummary);
    }
  }
  
  // Restructure experience sections
  const experienceSections = content.match(/(experience|work)[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/gis);
  if (experienceSections) {
    experienceSections.forEach(section => {
      const restructuredSection = restructureExperience(section, keywords, requirements);
      restructured = restructured.replace(section, restructuredSection);
    });
  }
  
  // Restructure skills section
  const skillsMatch = content.match(/(skills|technologies)[:\s]*(.*?)(?=\n\n|\n[A-Z]|$)/is);
  if (skillsMatch) {
    const originalSkills = skillsMatch[2];
    const newSkills = restructureSkills(originalSkills, keywords);
    restructured = restructured.replace(originalSkills, newSkills);
  }
  
  return restructured;
}

function generateRestructureSuggestions(originalContent: string, keywords: string[]): string[] {
  const suggestions: string[] = [];
  
  const missingKeywords = keywords.filter(keyword => 
    !originalContent.toLowerCase().includes(keyword)
  );
  
  if (missingKeywords.length > 0) {
    suggestions.push(`Consider adding these keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
  }
  
  // Check for action verbs
  const actionVerbs = ['developed', 'designed', 'implemented', 'managed', 'led', 'coordinated'];
  const hasActionVerbs = actionVerbs.some(verb => 
    originalContent.toLowerCase().includes(verb)
  );
  
  if (!hasActionVerbs) {
    suggestions.push('Use more action verbs to describe your achievements');
  }
  
  // Check for quantifiable achievements
  const hasNumbers = /\d+/.test(originalContent);
  if (!hasNumbers) {
    suggestions.push('Add quantifiable achievements and metrics where possible');
  }
  
  return suggestions;
}
