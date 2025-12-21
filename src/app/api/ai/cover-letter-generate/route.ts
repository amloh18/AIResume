import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';

export async function POST(request: NextRequest) {
  try {
    const {
      cvData,
      jobData,
      recipientName,
      companyName
    } = await request.json();

    if (!cvData || !jobData) {
      return NextResponse.json(
        { success: false, error: 'CV data and job data are required' },
        { status: 400 }
      );
    }

    // Create the enhanced cover letter prompt
    const prompt = createCoverLetterPrompt({
      cvData,
      jobData,
      recipientName,
      companyName
    });

    // Generate content using Gemini with fallback
    let content = await callGeminiWithAllKeysFallback(prompt);

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No content generated' },
        { status: 500 }
      );
    }

    // Clean up the generated content to remove any headers, greetings, or closings
    // AI should ONLY generate the body content (main paragraphs)
    content = cleanupCoverLetterContent(content, cvData);

    return NextResponse.json({
      success: true,
      content: content.trim(), // This is the BODY only
      body: content.trim(), // Explicitly return as body
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}

/**
 * Clean up cover letter content to remove any unwanted headers, greetings, or closings
 */
function cleanupCoverLetterContent(content: string, cvData: any): string {
  let cleaned = content.trim();

  // STEP 1: Remove name if it appears at the start (all caps or Title Case)
  if (cvData?.basics?.name) {
    const nameUpper = cvData.basics.name.toUpperCase();
    const nameTitle = cvData.basics.name;
    // Remove name line (case insensitive, with optional newline)
    cleaned = cleaned.replace(new RegExp(`^${nameUpper}\\s*\\n`, 'mi'), '');
    cleaned = cleaned.replace(new RegExp(`^${nameTitle}\\s*\\n`, 'mi'), '');
  }

  // STEP 2: Remove any contact information lines (name, phone, email, location patterns)
  // This handles lines with pipes separating contact info (e.g., "location | phone | email")
  const contactPatterns = [
    /^.*\|.*\|.*@.*\n/m, // Line with pipes and email (most specific)
    /^.*\|\s*[+\d].*\|\s*.*@.*\n/m, // Line with pipes, phone, and email
    /^\[object Object\].*\n/m, // Remove "[object Object]" artifacts
    /^.*[+\d]{10,}.*@.*\..+\n/m, // Phone and email on same line
    /^.*@.*\.\w+.*\n/m, // Email line
  ];

  contactPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // STEP 3: Remove date lines at the start or after header
  cleaned = cleaned.replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s*\n/mi, '');
  cleaned = cleaned.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*\n/m, '');

  // STEP 4: Remove recipient info lines (Hiring Manager, Company Name, etc.)
  cleaned = cleaned.replace(/^(Hiring Manager|Recruitment Team|Human Resources|Dear Hiring Manager)\s*\n/mi, '');
  // Remove company name lines (typically after date)
  cleaned = cleaned.replace(/^[A-Z][a-zA-Z\s&,]+(?:Inc|LLC|Ltd|Corp|Corporation|Company)\.?\s*\n/m, '');
  cleaned = cleaned.replace(/^Company Address.*\n/mi, '');
  // Remove location lines (city, state patterns)
  cleaned = cleaned.replace(/^[A-Z][a-z]+,\s*[A-Z]{2}\s*\n/m, ''); // e.g., "Chicago, IL"

  // STEP 5: Remove "Dear..." greeting if present (including any variation)
  cleaned = cleaned.replace(/^Dear\s+[^,\n]+,?\s*\n*/mi, '');

  // STEP 6: Remove closing signatures
  const closingPatterns = [
    /\n*Sincerely,?\s*\n*.*/gi,
    /\n*Best regards,?\s*\n*.*/gi,
    /\n*Kind regards,?\s*\n*.*/gi,
    /\n*Yours (sincerely|faithfully),?\s*\n*.*/gi,
    /\n*Thank you for (your consideration|considering my application)[.,]?\s*\n*/gi,
    /\n*I look forward to (hearing from you|speaking with you)[.,]?\s*\n*.*/gi
  ];

  closingPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // STEP 7: Remove any remaining header artifacts at the beginning
  // Keep removing lines that look like headers until we hit actual content
  const lines = cleaned.split('\n');
  let startIndex = 0;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      startIndex = i + 1;
      continue;
    }

    // Check if this line looks like content (starts with "I" or has multiple words and punctuation)
    const isContent = /^I\s+/i.test(line) ||
      (/\w+.*\w+/.test(line) && line.length > 50) ||
      line.startsWith('With') ||
      line.startsWith('As') ||
      line.startsWith('Having');

    if (isContent) {
      startIndex = i;
      break;
    } else {
      startIndex = i + 1;
    }
  }

  cleaned = lines.slice(startIndex).join('\n');

  // STEP 8: Clean up excessive newlines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
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

function createCoverLetterPrompt({
  cvData,
  jobData,
  recipientName,
  companyName
}: {
  cvData: any;
  jobData: any;
  recipientName?: string;
  companyName?: string;
}) {
  // Calculate experience level
  const experienceLevel = calculateExperienceLevel(cvData);

  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  const jobTitle = jobData?.title || jobData?.jobTitle || 'Position';
  const company = companyName || jobData?.company || 'Company';
  const basics = cvData?.basics || {};

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
    return skill.name || skill;
  }).join(', ');

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

  return `**Role**: Expert Career Biographer & Persuasive Storyteller.
**Goal**: Write a humanized, compelling cover letter (300-400 words) that bridges the gap between a Master CV and a Job Description (JD).

### 1. THE "HUMAN" STYLE PROTOCOL (CRITICAL)
- **Avoid AI-isms**: Do not use "buzzwords" typically associated with LLMs (e.g., avoid: "delve," "tapestry," "pave the way," "multifaceted," "in today's digital landscape," "unlocking," "vibrant," "testament").
- **Sentence Variance**: Use a mix of short, punchy sentences and longer, complex ones. This creates a natural human "rhythm."
- **First-Person Narrative**: Write with a clear "voice." Instead of "The applicant possesses experience in...", use "I've spent the last two years learning how to..."
- **Authentic Transitions**: Use natural transitions (e.g., "That's why I'm so drawn to ${company}," or "Beyond the technical side of things...") instead of formal "Furthermore" or "Moreover."

### 2. THE "IDEAL CANDIDATE" STRATEGY
- **The Gap Bridge**: Address domain shifts or skill gaps by focusing on "Functional Logic." If a tool is missing, highlight the "Technical Foundation" that ensures rapid mastery.
- **The Personal Touch**: 
    - **Active Projects**: Mention one specific project the user is "Currently working on" from the Master CV. Explain the *excitement* behind it.
    - **Interests**: Connect a personal interest to a professional trait (e.g., "My background in competitive sports taught me the discipline I now bring to meeting sales targets").

### 3. COMPOSITION STRUCTURE
- **The Hook**: Start with a specific observation about the company (from the JD's "About Us"). Show them you've actually read their mission.
- **Pillar 1 (The Value)**: Share a "mini-story" of a win from the CV. Focus on the *human impact* and the result (%, $).
- **Pillar 2 (The Bridge & Project)**: "Right now, I'm deep-diving into [Project Name] because I'm fascinated by [Topic]..." Link this to the JD's requirements.
- **Pillar 3 (The Culture)**: Use the company's internal language (e.g., "Simpler, Better, Faster") to show you're already one of them.
- **The CTA**: Close with a direct, confident invitation to talk, focused on solving a specific company problem.

### 4. TECHNICAL CONSTRAINTS
- **Fact Anchoring**: Only use data present in the Master CV. No hallucinations.
- **Tone**: Entrepreneurial, warm, and professional.
- **Zero Prose**: Return ONLY the letter text.
- **Placeholders**: Use \`[Name]\`, \`[Date]\`, \`[Phone]\`, and \`[Email]\`.

--- JOB DESCRIPTION (JD) ---
Job Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

--- CANDIDATE PROFILE ---
Name: ${basics.name || 'Candidate'}
Summary: ${basics.summary || 'N/A'}

--- WORK EXPERIENCE ---
${workExperienceText}

--- PROJECTS ---
${projectsText}

--- EDUCATION ---
${educationText}

--- SKILLS ---
${skillsText}

--- SKILL GAP ANALYSIS (USE TO STRATEGIZE) ---
${skillsGap.skills ? skillsGap.skills.map((skill: any) => `- ${skill.name}: ${skill.gapInsight || 'N/A'}`).join('\n') : 'No specific gaps identified.'}

EXPERIENCE LEVEL: ${experienceLevel}
${experienceGuidance}

IMPORTANT FORMATTING INSTRUCTIONS:
- Generate the body content starting with the salutation "Dear Hiring Manager,"
- Include the salutation as the FIRST line of the body
- Do NOT include:
  * Header information (name, contact info, date, recipient)
  * Closing/signature (e.g., "Sincerely", "Thank you for considering")
- Start with: "Dear Hiring Manager," followed by the body paragraphs
- End with the last paragraph of the body
- Output 300-400 words of compelling body content (including salutation)

Output the cover letter body text starting with "Dear Hiring Manager," followed by 3 paragraphs (300-400 words total). No headers or closings.`;
}
