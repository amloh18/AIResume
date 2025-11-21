import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Get API key with fallback
function getGeminiApiKey(): string | null {
  return (
    process.env.gemini_api_key ||
    process.env.GEMINI_API_KEY ||
    process.env.gemini_api_key1 ||
    process.env.GEMINI_API_KEY1 ||
    null
  );
}

function getGeminiApiKey2(): string | null {
  return (
    process.env.gemini_api_key2 ||
    process.env.GEMINI_API_KEY2 ||
    process.env['GEMINI_API-KEY2'] ||
    process.env['gemini_api-key2'] ||
    null
  );
}

// Helper function to call Gemini with fallback
async function callGeminiWithFallback(prompt: string): Promise<string> {
  const apiKeys = [
    { name: 'gemini_api_key', key: getGeminiApiKey() },
    { name: 'gemini_api_key2', key: getGeminiApiKey2() }
  ].filter(k => k.key);

  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  let lastError: Error | null = null;

  for (const { name, key } of apiKeys) {
    try {
      console.log(`🔑 Attempting Gemini API call with ${name}...`);
      const genAI = new GoogleGenAI({ apiKey: key! });
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt
      });
      const text = result.text || '';

      if (text) {
        console.log(`✅ Gemini API call successful with ${name}`);
        return text;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${name} failed:`, errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (apiKeys.indexOf(apiKeys.find(k => k.name === name)!) === apiKeys.length - 1) {
        throw lastError;
      }
      console.log(`⏭️  Continuing to next API key...`);
    }
  }

  throw lastError || new Error('Failed to call Gemini API');
}

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
    let content = await callGeminiWithFallback(prompt);

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No content generated' },
        { status: 500 }
      );
    }

    // Clean up the generated content to remove any headers, greetings, or closings
    content = cleanupCoverLetterContent(content, cvData);

    return NextResponse.json({
      success: true,
      content: content.trim(),
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

  return `You are an expert Senior HR Recruiter and Career Marketing Specialist. Your goal is to write a highly persuasive, tailored cover letter that positions the candidate as the ideal fit for the role.

${experienceGuidance}

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

INSTRUCTIONS:
1. **HR Perspective**: Write from the perspective of what a recruiter wants to see: immediate value, cultural fit, and specific problem-solving abilities.
2. **Address Skill Gaps**: If the analysis identifies a gap (e.g., missing a specific tool), do NOT highlight the lack of it. Instead, emphasize *transferable skills* or *related experience* that demonstrates the ability to quickly learn or adapt. If the candidate has the skill but it wasn't explicitly listed, infer it from their experience if reasonable.
3. **Filter & Prioritize**: Do not just summarize the CV. Select only the 2-3 most relevant experiences or projects that directly address the top requirements in the JD. Ignore irrelevant experience.
4. **Quantifiable Impact**: Use numbers and metrics from the CV to prove claims (e.g., "Increased revenue by 20%").
5. **Structure (EXACTLY 3 Paragraphs)**:
   - **Para 1 (The Hook)**: State enthusiasm for the role/company and link a major achievement to the company's goals.
   - **Para 2 (The Proof)**: Deep dive into relevant experience. Connect past actions to future value for *this* company. Address key JD requirements.
   - **Para 3 (The Close)**: Reiterate fit, express confidence, and include a call to action.

CONSTRAINTS:
- EXACTLY 3 paragraphs.
- NO salutations (e.g., "Dear Hiring Manager") or closings (e.g., "Sincerely").
- NO placeholders like "[Your Name]".
- NO generic fluff ("I am a hard worker").
- Tone: Professional, confident, ${experienceLevel}.

Output ONLY the 3 body paragraphs.`;
}
