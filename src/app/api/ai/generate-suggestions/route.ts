import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      userId, 
      jobData, 
      sectionData, 
      sectionType,
      currentText,
      cvData 
    } = await request.json();

    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check AI Quota before generating suggestions
    const { AIQuotaService } = await import('@/lib/services/ai-quota-service');
    const quotaStatus = await AIQuotaService.checkAndConsumeQuota(userId, 'ai_suggestions', true);
    
    if (!quotaStatus.allowed) {
      console.log('⚠️ AI Suggestions API - Quota exceeded for user:', userId);
      return NextResponse.json({
        error: 'quota_exceeded',
        quotaStatus
      }, { status: 403 });
    }

    // Generate 4 different variations
    const suggestions = await generateAISuggestions({
      jobData,
      sectionData,
      sectionType,
      currentText,
      cvData
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('AI suggestions generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI suggestions' },
      { status: 500 }
    );
  }
}

async function generateAISuggestions({
  jobData,
  sectionData,
  sectionType,
  currentText,
  cvData
}: {
  jobData: any;
  sectionData: any;
  sectionType: string;
  currentText: string;
  cvData: any;
}) {
  // Handle cases where jobData might be null/undefined (e.g., Master CV editing)
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const jobTitle = jobData?.title || jobData?.jobTitle || '';
  const company = jobData?.company || jobData?.companyName || '';

  // Create comprehensive prompt for generating 4 variations
  const prompt = createSuggestionsPrompt({
    jobDescription,
    jobTitle,
    company,
    sectionType,
    sectionData,
    currentText,
    cvData
  });

  try {
    const response = await callAIWithFallback({
      prompt,
      temperature: 0.8,
      maxTokens: 5000 // Increased for 8 suggestions
    });

    // Parse the response to extract suggestions
    const suggestions = parseSuggestions(response.content, sectionType);
    
    // For cover letter body, we need 4 variations; for others, 8
    const expectedCount = sectionType === 'cover_letter_body' ? 4 : 8;
    
    // Ensure we have the expected number of suggestions
    while (suggestions.length < expectedCount) {
      suggestions.push({
        method: `Method ${suggestions.length + 1}`,
        size: sectionType === 'cover_letter_body' ? 'Full' : (suggestions.length % 2 === 0 ? 'Short' : 'Detailed'),
        content: 'Generating...'
      });
    }

    return suggestions.slice(0, expectedCount);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    // Return fallback suggestions
    return generateFallbackSuggestions(sectionType, sectionData, jobDescription);
  }
}

function createSuggestionsPrompt({
  jobDescription,
  jobTitle,
  company,
  sectionType,
  sectionData,
  currentText,
  cvData
}: {
  jobDescription: string;
  jobTitle: string;
  company: string;
  sectionType: string;
  sectionData: any;
  currentText: string;
  cvData: any;
}): string {
  // Special handling for cover letter body
  if (sectionType === 'cover_letter_body') {
    return createCoverLetterBodyPrompt({
      jobDescription,
      jobTitle,
      company,
      currentText,
      cvData
    });
  }

  const sectionContext = getSectionContext(sectionType, sectionData);
  const hasJobContext = jobDescription && jobDescription.trim().length > 0;
  
  const jobContextSection = hasJobContext 
    ? `JOB CONTEXT:
- Job Title: ${jobTitle || 'Not specified'}
- Company: ${company || 'Not specified'}
- Job Description: ${jobDescription.substring(0, 2000)}

IMPORTANT: Tailor all suggestions to match the job description keywords and requirements.`
    : `NOTE: This is a Master CV (no specific job context). Generate general, professional content that highlights achievements and impact without job-specific tailoring.`;

  return `You are an expert career coach and resume writer specializing in transforming responsibilities into quantifiable achievements. Generate exactly 8 different, high-quality variations for a CV section.

${jobContextSection}

SECTION CONTEXT:
- Section Type: ${sectionType}
- Current Content: ${currentText || '(empty)'}
${sectionContext}

USER'S CV DATA (for context):
${JSON.stringify(cvData?.basics || {}, null, 2).substring(0, 500)}

CRITICAL REQUIREMENTS - NO HARDCODED OUTPUTS:
${hasJobContext 
  ? `- CRITICAL: Analyze ONLY the current text "${currentText || '(empty)'}" and the job description "${jobDescription.substring(0, 2000)}"
- Extract ALL information from these sources - DO NOT invent or hardcode achievements
- If current text is empty or minimal, infer reasonable achievements based on the job description requirements and section context
- Tailor ALL suggestions to match the job description keywords, technologies, and requirements
- Use the current text as the foundation - transform "what I did" into "what I achieved"
- Extract key skills, technologies, and requirements from the job description and incorporate them naturally`
  : `- CRITICAL: Analyze ONLY the current text "${currentText || '(empty)'}" and section context
- Extract ALL information from these sources - DO NOT invent or hardcode achievements
- If current text is empty, use section context to infer reasonable professional achievements
- Transform "what I did" into "what I achieved" based on the actual content provided`}

CORE REFINEMENT STRATEGY - TRANSFORM RESPONSIBILITIES INTO ACHIEVEMENTS:
Every suggestion must answer these questions:
1. **Quantifiable Result**: By how much did the outcome improve? (e.g., "by 20%", "from X to Y", "reduced by Z")
2. **Business Impact**: What was the benefit to the team/company? (e.g., "reduced support tickets", "increased user retention", "saved $X")
3. **Scale & Scope**: How large was the project/user base? (e.g., "used by 10,000 daily users", "impacting $50K revenue", "affecting 40% of users")

REQUIREMENTS:
Generate exactly 8 variations - each method (STAR, CAR, Quantified, Narrative) in both Short and Detailed formats:
- SIZE: 
  * Short: 2-3 concise bullet points or 1-2 sentences
  * Detailed: 4-5 bullet points or 2-3 comprehensive sentences
- METHOD: STAR, CAR, Quantified, or Narrative

SUGGESTION VARIATIONS (8 total):
1. STAR - Short
2. STAR - Detailed
3. CAR - Short
4. CAR - Detailed
5. Quantified - Short
6. Quantified - Detailed
7. Narrative - Short
8. Narrative - Detailed

METHOD-SPECIFIC GUIDELINES:

**Quantified Method (MOST IMPORTANT):**
- Focus on OUTCOMES, not effort (e.g., "cutting load time by 20%" not "implemented 15 features")
- Numbers must describe IMPACT (performance improvements, cost savings, user growth) not just work done
- Include specific technologies mentioned in job description
- Example transformation: "Implemented 15 features" → "Spearheaded front-end redesign using React.js/Redux, cutting average load time by 20% and reducing UI bugs by 35%"

**STAR Method:**
- Situation: Define SPECIFIC problem (e.g., "Legacy codebase was not responsive" or "User drop-off rate was 15%")
- Task: Clear responsibility tied to the problem
- Action: Specific technical actions taken (mention technologies from job description)
- Result: MAXIMIZE this section with quantifiable impact (e.g., "Improved render speed by 150ms, boosting CSAT scores")
- Present naturally without labels - flow as narrative

**CAR Method:**
- Challenge: SPECIFIC problem with context (e.g., "performance bottleneck affecting 40% of users")
- Action: Technical solutions implemented (use job description technologies)
- Result: DECISIVE quantifiable outcome (e.g., "Improved component render speed by 150ms, directly boosting CSAT scores")
- Present naturally without labels - flow as narrative

**Narrative Method:**
- Start with STRONG ACTION VERB (e.g., "Architected", "Spearheaded", "Transformed")
- Focus on most complex/impactful achievements
- Integrate impact upfront, not at the end
- Example: "Architected and optimized front-end performance of three core web applications (React.js), leading to 10% faster initial page load time"

CRITICAL WRITING RULES:
- Use PAST TENSE for all action verbs (e.g., "Spearheaded", "Architected", "Implemented")
- NO personal pronouns: Remove "I", "My", "I was assigned" - write in first person implied
- Target job description keywords: Include specific technologies, frameworks, and skills mentioned in the job posting
- Use strong action verbs: Replace weak verbs like "Developed", "Maintained", "Collaborated" with "Architected", "Spearheaded", "Integrated", "Optimized"
- DO NOT include labels like "- **Situation:**", "- **Task:**", "- **Action:**", "- **Result:**" in the output
- Present content naturally - flow as narrative or bullet points
- Ensure content is professional, polished, and ready to use without editing
- Format as bullet points (•) or paragraphs based on the size requirement
- Each variation should be distinctly different while maintaining relevance to the actual content provided

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "method": "STAR",
      "size": "Short",
      "content": "Faced [specific problem from current text/job]. Tasked with [responsibility]. Implemented [specific technical action with technologies]. Achieved [quantifiable result with impact]."
    },
    {
      "method": "STAR",
      "size": "Detailed",
      "content": "Faced [specific problem with context/scale]. Tasked with [responsibility tied to problem]. Implemented [specific technical actions with technologies from job description], including [additional details]. Achieved [quantifiable result], which led to [broader business impact]."
    },
    {
      "method": "CAR",
      "size": "Short",
      "content": "Addressed [specific challenge with context]. Led [technical action with technologies]. Delivered [quantifiable outcome] with [business impact]."
    },
    {
      "method": "CAR",
      "size": "Detailed",
      "content": "Addressed [specific challenge affecting X% of users/revenue]. Led [technical action using technologies from job description], collaborating with [team/stakeholders] to [additional actions]. Delivered [quantifiable outcome], resulting in [business impact] and [long-term value]."
    },
    {
      "method": "Quantified",
      "size": "Short",
      "content": "Spearheaded [action using technologies], cutting [metric] by [X]% and reducing [issue] by [Y]%. Managed [number] [resources/projects] resulting in [outcome]."
    },
    {
      "method": "Quantified",
      "size": "Detailed",
      "content": "Spearheaded [action using technologies from job description], cutting [metric] by [X]%, exceeding target by [Y]%. Managed [number] [resources/projects] with [budget/timeline], resulting in [outcome]. Reduced [cost/time] by [Z]% while improving [quality/efficiency], impacting [scale/scope]."
    },
    {
      "method": "Narrative",
      "size": "Short",
      "content": "Architected [key achievement using technologies]. Transformed [area] through [approach], resulting in [quantifiable outcome]."
    },
    {
      "method": "Narrative",
      "size": "Detailed",
      "content": "Architected [key achievement using technologies from job description]. Transformed [area] through [approach], collaborating with [team] to [actions]. Resulted in [quantifiable outcome], consistently delivering [results] while [additional value], impacting [scale/scope]."
    }
  ]
}

REMEMBER: All content must be derived from the current text and job description. Use [brackets] only as placeholders - replace with actual extracted information. Generate the 8 variations now:`;
}

function calculateExperienceLevel(cvData: any): 'Senior' | 'Mid-Level' | 'Junior' {
  if (!cvData?.work || cvData.work.length === 0) {
    return 'Junior';
  }

  // Calculate total years of experience
  let totalMonths = 0;
  const currentDate = new Date();
  
  cvData.work.forEach((job: any) => {
    if (job.startDate) {
      try {
        const startDate = new Date(job.startDate);
        let endDate = currentDate;
        
        if (job.endDate && job.endDate !== 'Present' && job.endDate !== 'Current') {
          endDate = new Date(job.endDate);
        }
        
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth());
        
        if (monthsDiff > 0) {
          totalMonths += monthsDiff;
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  });

  const totalYears = totalMonths / 12;

  if (totalYears >= 7) return 'Senior';
  if (totalYears >= 3) return 'Mid-Level';
  return 'Junior';
}

function createCoverLetterBodyPrompt({
  jobDescription,
  jobTitle,
  company,
  currentText,
  cvData
}: {
  jobDescription: string;
  jobTitle: string;
  company: string;
  currentText: string;
  cvData: any;
}): string {
  // Calculate experience level
  const experienceLevel = calculateExperienceLevel(cvData);
  
  // Extract CV metadata (career report analysis)
  const aiAnalysis = cvData?.metadata?.aiAnalysis || {};
  const impactScore = aiAnalysis?.impactScore || {};
  const skillsGap = aiAnalysis?.skillsGap || {};
  const industrySpecialization = aiAnalysis?.industrySpecialization || {};
  const cvOptimization = aiAnalysis?.cvOptimization || {};
  
  // Extract relevant CV sections
  const workExperience = cvData?.work || [];
  const projects = cvData?.projects || [];
  const education = cvData?.education || [];
  const skills = cvData?.skills || [];
  const basics = cvData?.basics || {};
  
  // Format work experience for prompt
  const workExperienceText = workExperience.map((work: any, idx: number) => {
    return `Work Experience ${idx + 1}:
- Position: ${work.position || 'N/A'}
- Company: ${work.name || 'N/A'}
- Duration: ${work.startDate || 'N/A'} - ${work.endDate || 'Present'}
- Summary: ${work.summary || 'N/A'}
- Highlights: ${work.highlights?.join(', ') || 'N/A'}`;
  }).join('\n\n');
  
  // Format projects for prompt
  const projectsText = projects.map((project: any, idx: number) => {
    return `Project ${idx + 1}:
- Name: ${project.name || 'N/A'}
- Description: ${project.description || 'N/A'}
- Technologies: ${project.keywords?.join(', ') || 'N/A'}
- URL: ${project.url || 'N/A'}`;
  }).join('\n\n');
  
  // Format education for prompt
  const educationText = education.map((edu: any, idx: number) => {
    return `Education ${idx + 1}:
- Institution: ${edu.institution || 'N/A'}
- Area: ${edu.area || 'N/A'}
- Study Type: ${edu.studyType || 'N/A'}
- GPA: ${edu.gpa || 'N/A'}`;
  }).join('\n\n');
  
  // Format skills for prompt
  const skillsText = skills.map((skill: any) => {
    if (typeof skill === 'string') return skill;
    const category = skill.category || skill.name || '';
    const skillItems = Array.isArray(skill.skills) ? skill.skills : Array.isArray(skill.keywords) ? skill.keywords : [];
    if (skillItems.length > 0) return `${category}: ${skillItems.join(', ')}`;
    return category || skill;
  }).join('\n');

  // Experience level-specific guidance
  const experienceGuidance = experienceLevel === 'Senior' 
    ? `CANDIDATE EXPERIENCE LEVEL: SENIOR (7+ years)
- Emphasize strategic leadership, cross-functional collaboration, and business impact
- Highlight experience managing teams, budgets, or large-scale projects
- Focus on transformation, innovation, and measurable business outcomes
- Use executive-level language: "spearheaded," "architected," "orchestrated," "drove"
- Demonstrate ability to influence stakeholders and deliver at scale
- Show depth of expertise and thought leadership`

    : experienceLevel === 'Mid-Level'
    ? `CANDIDATE EXPERIENCE LEVEL: MID-LEVEL (3-7 years)
- Balance technical expertise with growing leadership responsibilities
- Emphasize problem-solving, project ownership, and measurable contributions
- Highlight ability to work independently and mentor others
- Focus on specific achievements with quantifiable results
- Use action verbs: "developed," "implemented," "optimized," "delivered"
- Show progression and increasing responsibility over time`

    : `CANDIDATE EXPERIENCE LEVEL: JUNIOR/ENTRY-LEVEL (0-3 years)
- Emphasize learning agility, enthusiasm, and foundational skills
- Highlight relevant projects, internships, or academic achievements
- Focus on potential, growth mindset, and eagerness to contribute
- Use verbs: "contributed," "assisted," "learned," "supported," "collaborated"
- Connect education and projects to job requirements
- Show passion and commitment to the field`;

  return `You are an expert career marketing specialist and content strategist. Your primary goal is to draft the body (EXACTLY 3 paragraphs) of a highly personalized and persuasive cover letter designed to sell the candidate as the single best and most eligible fit for the specified job role.

${experienceGuidance}

CONSTRAINTS AND OUTPUT DIRECTIVES (STRICTLY ENFORCE):

OUTPUT FOCUS: Generate EXACTLY 3 paragraphs - no more, no less. Start with the salutation "Dear Hiring Manager," as the first line, followed by the 3 paragraphs. Do not include a subject line or a closing/sign-off (e.g., "Sincerely,").

PARAGRAPH STRUCTURE: Each paragraph must be substantial (3-5 sentences) and serve a distinct purpose:
- Paragraph 1: Hook and immediate value proposition
- Paragraph 2: Concrete evidence and proof of capabilities
- Paragraph 3: Forward-looking statement and fit

FLUFF REMOVAL: Eliminate all generic, filler language, platitudes, and clichés (e.g., "I am writing to express my interest," "highly motivated," "excellent communication skills").

ALIGNMENT MANDATE: Every sentence must directly link a specific piece of the candidate's Work Experience, Projects, or Education to a core duty, required skill, or objective listed in the Job Description. If a detail from the CV is not relevant to the JD, do not include it.

TONE: Maintain a confident, professional, and results-oriented tone appropriate for ${experienceLevel} level. Use strong, measurable action verbs and focus on quantifiable achievements (metrics, scale, impact).

--- JOB DESCRIPTION (JD) ---

Job Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}

${jobDescription || 'No job description provided'}

--- CANDIDATE CV/EXPERIENCE DATA ---

CANDIDATE PROFILE:
- Name: ${basics.name || 'Not specified'}
- Summary: ${basics.summary || 'N/A'}
- Location: ${basics.location ? (typeof basics.location === 'string' ? basics.location : `${basics.location.city || ''}, ${basics.location.region || ''}`) : 'N/A'}

WORK EXPERIENCE:
${workExperienceText || 'No work experience provided'}

PROJECTS:
${projectsText || 'No projects provided'}

EDUCATION:
${educationText || 'No education provided'}

SKILLS:
${skillsText || 'No skills provided'}

--- AI CAREER ANALYSIS INSIGHTS (from CV metadata) ---

${aiAnalysis ? `IMPACT SCORE ANALYSIS:
- Quantifiable Statements: ${impactScore.quantifiableStatements || 0}
- High Impact Verbs: ${impactScore.highImpactVerbs || 0}
- Industry Keywords: ${impactScore.industryKeywords || 0}
${impactScore.insights ? `- Insights: ${JSON.stringify(impactScore.insights)}` : ''}

SKILLS GAP ANALYSIS:
${skillsGap.skills ? skillsGap.skills.map((skill: any) => `- ${skill.name}: ${skill.gapInsight || 'N/A'}`).join('\n') : 'N/A'}

INDUSTRY SPECIALIZATION:
- Specialization: ${industrySpecialization.specialization || 'N/A'}
- Keywords: ${industrySpecialization.keywords?.join(', ') || 'N/A'}

CV OPTIMIZATION:
- Total Length: ${cvOptimization.totalLength || 'N/A'}
- Bullet Point Length: ${cvOptimization.bulletPointLength || 'N/A'}` : 'No AI analysis available'}

GENERATION TASK:

Draft the cover letter body using EXACTLY 3 paragraphs. Generate exactly 4 variations, each with a different approach tailored to ${experienceLevel} level:

VARIATION 1 - ACHIEVEMENT-FOCUSED:
Paragraph 1 (The Hook - 3-5 sentences): ${experienceLevel === 'Senior' ? 'Lead with your most significant strategic achievement that demonstrates leadership and business impact. Connect it directly to the company\'s main objectives or challenges mentioned in the job description.' : experienceLevel === 'Mid-Level' ? 'Open with your most relevant professional achievement that showcases your ability to deliver measurable results. Connect it to the job\'s primary requirements.' : 'Start with your most relevant project, internship, or academic achievement that demonstrates your potential and alignment with the role.'} Use specific metrics and quantifiable results.

Paragraph 2 (The Proof - 3-5 sentences): ${experienceLevel === 'Senior' ? 'Detail 1-2 major initiatives where you led cross-functional teams or managed significant resources. Highlight scale (budget, team size, impact scope) and reference specific technologies from the job description.' : experienceLevel === 'Mid-Level' ? 'Provide concrete examples from your work experience or projects that demonstrate mastery of the key skills required. Highlight the scale of your work (e.g., "improved performance by Y%," "supported Z users").' : 'Detail relevant projects, coursework, or internships that demonstrate your skills and eagerness to learn. Connect specific technologies or methodologies from your experience to the job requirements.'}

Paragraph 3 (The Close - 3-5 sentences): ${experienceLevel === 'Senior' ? 'Position yourself as a strategic leader who can drive transformation. Conclude with a forward-looking statement about how you will deliver measurable business outcomes and exceed expectations.' : experienceLevel === 'Mid-Level' ? 'Connect your growing expertise and proven track record to the role. Express confidence in your ability to deliver immediate value and contribute to the team\'s success.' : 'Connect your educational background, passion for the field, and eagerness to learn to the role\'s requirements. Express enthusiasm about contributing and growing with the company.'}

VARIATION 2 - SKILLS-ALIGNED:
Paragraph 1 (3-5 sentences): Open with a direct connection between your core competencies (from skills and ${experienceLevel === 'Junior' ? 'education/projects' : 'work experience'}) and the job's primary requirements. Reference specific technologies or methodologies mentioned in the job description.

Paragraph 2 (3-5 sentences): Provide detailed examples from your ${experienceLevel === 'Junior' ? 'projects, coursework, or internships' : 'work experience or projects'} that demonstrate ${experienceLevel === 'Junior' ? 'your ability to learn and apply' : 'mastery of'} the key skills required. ${experienceLevel !== 'Junior' ? 'Use quantifiable achievements and measurable impact.' : 'Show how you\'ve applied these skills in real-world scenarios.'}

Paragraph 3 (3-5 sentences): ${experienceLevel === 'Junior' ? 'Connect your educational background, relevant coursework, and passion for the field to the role. Express enthusiasm about the opportunity to contribute and grow.' : 'Connect your proven track record to the role\'s requirements, then express confidence in your ability to deliver immediate value and contribute to the team\'s success.'}

VARIATION 3 - IMPACT-DRIVEN:
Paragraph 1 (3-5 sentences): Lead with your most impressive ${experienceLevel === 'Senior' ? 'strategic' : 'quantifiable'} achievement that directly relates to the job's main objectives. ${experienceLevel !== 'Junior' ? 'Use numbers, percentages, and specific metrics.' : 'Highlight the impact of your work, even if on a smaller scale.'}

Paragraph 2 (3-5 sentences): Showcase how your past experiences have prepared you for the specific challenges mentioned in the job description. ${experienceLevel === 'Senior' ? 'Reference multiple initiatives or roles that demonstrate your breadth and depth of expertise.' : experienceLevel === 'Mid-Level' ? 'Reference multiple projects or roles that align with different aspects of the role.' : 'Reference relevant projects, coursework, or experiences that show your readiness for the role.'}

Paragraph 3 (3-5 sentences): Emphasize your unique value proposition and how your combination of ${experienceLevel === 'Junior' ? 'education, skills, and passion' : 'experience, skills, and achievements'} makes you the ideal candidate. ${experienceLevel === 'Senior' ? 'Position yourself as someone who can drive strategic initiatives and deliver transformational results.' : experienceLevel === 'Mid-Level' ? 'Show how you can hit the ground running and contribute meaningfully from day one.' : 'Express your eagerness to learn, contribute, and grow with the company.'}

VARIATION 4 - STRATEGIC FIT:
Paragraph 1 (3-5 sentences): Demonstrate understanding of the company's needs by connecting your experience to their business objectives mentioned in the job description. ${experienceLevel === 'Senior' ? 'Show strategic thinking and ability to see the big picture.' : experienceLevel === 'Mid-Level' ? 'Show how your experience aligns with their goals.' : 'Show how your skills and passion align with their mission.'}

Paragraph 2 (3-5 sentences): Provide evidence of your ability to handle the role's responsibilities through detailed examples from your ${experienceLevel === 'Junior' ? 'projects, education, or relevant experiences' : 'work history'}, emphasizing ${experienceLevel !== 'Junior' ? 'scale and ' : ''}impact.

Paragraph 3 (3-5 sentences): Position yourself as ${experienceLevel === 'Senior' ? 'a strategic contributor who can drive transformation and exceed expectations' : experienceLevel === 'Mid-Level' ? 'someone who can deliver results and contribute to the team\'s success' : 'an enthusiastic learner who is ready to contribute and grow'}, referencing specific skills and experiences that set you apart.

CRITICAL REQUIREMENTS:
- Each variation must be EXACTLY 3 paragraphs (no more, no less)
- Each paragraph must be 3-5 sentences
- NO salutations, greetings, or closings
- NO generic filler language
- Every claim must be backed by specific examples from the CV data
- Use quantifiable metrics wherever possible (adjust expectations for ${experienceLevel} level)
- Reference specific technologies, tools, or methodologies from the job description
- Maintain professional, confident tone appropriate for ${experienceLevel} level
- Focus on what you will achieve for the company, not why you are applying

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "method": "Achievement-Focused",
      "size": "Full",
      "content": "[EXACTLY 3 paragraphs, each 3-5 sentences, focusing on quantifiable achievements and direct alignment with job objectives, tailored for ${experienceLevel} level]"
    },
    {
      "method": "Skills-Aligned",
      "size": "Full",
      "content": "[EXACTLY 3 paragraphs, each 3-5 sentences, emphasizing skills and competencies matching job requirements, tailored for ${experienceLevel} level]"
    },
    {
      "method": "Impact-Driven",
      "size": "Full",
      "content": "[EXACTLY 3 paragraphs, each 3-5 sentences, highlighting measurable impact and results, tailored for ${experienceLevel} level]"
    },
    {
      "method": "Strategic Fit",
      "size": "Full",
      "content": "[EXACTLY 3 paragraphs, each 3-5 sentences, demonstrating strategic understanding and value proposition, tailored for ${experienceLevel} level]"
    }
  ]
}

CRITICAL: Generate EXACTLY 3 paragraphs for each variation. Each paragraph must be 3-5 sentences. Do not include salutations or closings. Tailor the language, tone, and focus to ${experienceLevel} level experience. Generate the 4 variations now, ensuring each is unique, compelling, and directly aligned with the job description and CV data provided.`;
}

function getSectionContext(sectionType: string, sectionData: any): string {
  switch (sectionType) {
    case 'work_experience':
      return `- Position: ${sectionData?.position || 'N/A'}
- Company: ${sectionData?.name || 'N/A'}
- Dates: ${sectionData?.startDate || 'N/A'} - ${sectionData?.endDate || 'N/A'}`;
    
    case 'education':
      return `- Institution: ${sectionData?.institution || 'N/A'}
- Field: ${sectionData?.area || 'N/A'}
- Degree: ${sectionData?.studyType || 'N/A'}`;
    
    case 'project':
      return `- Project Name: ${sectionData?.name || 'N/A'}
- URL: ${sectionData?.url || 'N/A'}`;
    
    case 'certificate':
      return `- Certificate: ${sectionData?.name || 'N/A'}
- Issuer: ${sectionData?.issuer || 'N/A'}`;
    
    case 'volunteer':
      return `- Organization: ${sectionData?.organization || 'N/A'}
- Position: ${sectionData?.position || 'N/A'}`;
    
    case 'summary':
      return `- Professional Summary for CV`;
    
    case 'cover_letter_body':
      return `- Cover Letter Body Content`;
    
    default:
      return `- Section: ${sectionType}`;
  }
}

function parseSuggestions(content: string, sectionType: string): Array<{ method: string; size: string; content: string }> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions.map((s: any) => ({
          method: s.method || 'Method',
          size: s.size || (sectionType === 'cover_letter_body' ? 'Full' : (s.method?.includes('Short') ? 'Short' : 'Detailed')),
          content: cleanContent(s.content || '')
        }));
      }
    }

    // If JSON parsing fails, try to extract sections based on section type
    const sections = content.split(/\n\n+/);
    const suggestions: Array<{ method: string; size: string; content: string }> = [];
    
    if (sectionType === 'cover_letter_body') {
      // Cover letter body has 4 variations
      const methods = ['Achievement-Focused', 'Skills-Aligned', 'Impact-Driven', 'Strategic Fit'];
      const sizes = ['Full', 'Full', 'Full', 'Full'];
      
      for (let i = 0; i < Math.min(4, sections.length); i++) {
        const section = sections[i].trim();
        if (section.length > 20) {
          suggestions.push({
            method: methods[i] || `Method ${i + 1}`,
            size: sizes[i] || 'Full',
            content: cleanContent(section)
          });
        }
      }
    } else {
      // Other sections have 8 variations
      const methods = ['STAR', 'STAR', 'CAR', 'CAR', 'Quantified', 'Quantified', 'Narrative', 'Narrative'];
      const sizes = ['Short', 'Detailed', 'Short', 'Detailed', 'Short', 'Detailed', 'Short', 'Detailed'];
      
      for (let i = 0; i < Math.min(8, sections.length); i++) {
        const section = sections[i].trim();
        if (section.length > 20) {
          suggestions.push({
            method: methods[i] || `Method ${Math.floor(i / 2) + 1}`,
            size: sizes[i] || (i % 2 === 0 ? 'Short' : 'Detailed'),
            content: cleanContent(section)
          });
        }
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Error parsing suggestions:', error);
    return [];
  }
}

function cleanContent(content: string): string {
  if (!content) return '';
  
  // Remove markdown bold labels like "- **Situation:**", "- **Task:**", "- **Action:**", "- **Result:**"
  // Also remove "- **Challenge:**", "- **Action:**", "- **Result:**"
  // Handle various formats: with/without dash, with/without bold, with/without colon spacing
  // Only remove labels that appear at start of line or after bullet points
  let cleaned = content
    // Remove markdown bold labels with dash/bullet prefix (most common format)
    .replace(/^-\s*\*\*Situation:\*\*\s*/gim, '')
    .replace(/^-\s*\*\*Task:\*\*\s*/gim, '')
    .replace(/^-\s*\*\*Action:\*\*\s*/gim, '')
    .replace(/^-\s*\*\*Result:\*\*\s*/gim, '')
    .replace(/^-\s*\*\*Challenge:\*\*\s*/gim, '')
    // Remove markdown bold labels without colon in bold
    .replace(/^-\s*\*\*Situation\*\*:\s*/gim, '')
    .replace(/^-\s*\*\*Task\*\*:\s*/gim, '')
    .replace(/^-\s*\*\*Action\*\*:\s*/gim, '')
    .replace(/^-\s*\*\*Result\*\*:\s*/gim, '')
    .replace(/^-\s*\*\*Challenge\*\*:\s*/gim, '')
    // Remove plain text labels with dash/bullet
    .replace(/^-\s*Situation:\s*/gim, '')
    .replace(/^-\s*Task:\s*/gim, '')
    .replace(/^-\s*Action:\s*/gim, '')
    .replace(/^-\s*Result:\s*/gim, '')
    .replace(/^-\s*Challenge:\s*/gim, '')
    // Remove labels at start of line (without dash)
    .replace(/^\*\*Situation:\*\*\s*/gim, '')
    .replace(/^\*\*Task:\*\*\s*/gim, '')
    .replace(/^\*\*Action:\*\*\s*/gim, '')
    .replace(/^\*\*Result:\*\*\s*/gim, '')
    .replace(/^\*\*Challenge:\*\*\s*/gim, '')
    .replace(/^Situation:\s*/gim, '')
    .replace(/^Task:\s*/gim, '')
    .replace(/^Action:\s*/gim, '')
    .replace(/^Result:\s*/gim, '')
    .replace(/^Challenge:\s*/gim, '')
    // Also handle bullet point variations (•, *, etc.)
    .replace(/^[•*]\s*\*\*Situation:\*\*\s*/gim, '')
    .replace(/^[•*]\s*\*\*Task:\*\*\s*/gim, '')
    .replace(/^[•*]\s*\*\*Action:\*\*\s*/gim, '')
    .replace(/^[•*]\s*\*\*Result:\*\*\s*/gim, '')
    .replace(/^[•*]\s*\*\*Challenge:\*\*\s*/gim, '')
    .replace(/^[•*]\s*Situation:\s*/gim, '')
    .replace(/^[•*]\s*Task:\s*/gim, '')
    .replace(/^[•*]\s*Action:\s*/gim, '')
    .replace(/^[•*]\s*Result:\s*/gim, '')
    .replace(/^[•*]\s*Challenge:\s*/gim, '')
    // Clean up extra whitespace and newlines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim();
  
  return cleaned;
}

function generateFallbackSuggestions(sectionType: string, sectionData: any, jobDescription: string): Array<{ method: string; size: string; content: string }> {
  // Fallback should only be used if AI generation fails completely
  // Return empty suggestions to prompt user to try again rather than showing generic templates
  return [
    {
      method: 'STAR',
      size: 'Short',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    },
    {
      method: 'STAR',
      size: 'Detailed',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    },
    {
      method: 'CAR',
      size: 'Short',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    },
    {
      method: 'CAR',
      size: 'Detailed',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    },
    {
      method: 'Quantified',
      size: 'Short',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    },
    {
      method: 'Quantified',
      size: 'Detailed',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    },
    {
      method: 'Narrative',
      size: 'Short',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    },
    {
      method: 'Narrative',
      size: 'Detailed',
      content: 'Unable to generate suggestion. Please ensure you have entered content in this field and try again.'
    }
  ];
}

