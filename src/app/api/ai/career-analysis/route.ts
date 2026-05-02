// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limiter';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      rateLimitConfigs.ai
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Too many AI requests. Please wait ${Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)} seconds.` 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimitConfigs.ai.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    console.log('🚀 Starting career analysis...');
    
    // Add CORS headers
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400, headers }
      );
    }

    const { cvData, jobData, jobId, userId, userEmail }: { 
      cvData: UnifiedCVDataStructure; 
      jobData?: any; 
      jobId?: string;
      userId?: string;
      userEmail?: string;
    } = body;

    console.log('📊 Received request body:', {
      hasCvData: !!cvData,
      cvDataType: typeof cvData,
      cvDataKeys: cvData ? Object.keys(cvData) : [],
      workCount: cvData?.work?.length || 0,
      educationCount: cvData?.education?.length || 0,
      hasBasics: !!cvData?.basics,
      basicsName: cvData?.basics?.name || 'N/A',
      bodySize: JSON.stringify(body).length
    });

    if (!cvData) {
      console.log('❌ No CV data provided');
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400, headers }
      );
    }

    // Validate cvData structure
    if (typeof cvData !== 'object' || Array.isArray(cvData)) {
      console.log('❌ Invalid CV data structure - not an object');
      return NextResponse.json(
        { success: false, error: 'CV data must be an object' },
        { status: 400, headers }
      );
    }

    // Check if CV data has any meaningful content
    const hasMeaningfulData = !!(
      cvData.work?.length > 0 || 
      cvData.education?.length > 0 || 
      cvData.projects?.length > 0 ||
      cvData.basics?.name
    );

    if (!hasMeaningfulData) {
      console.log('❌ CV data is empty or lacks meaningful content');
      return NextResponse.json(
        { success: false, error: 'CV data is empty. Please provide work experience, education, or basic information.' },
        { status: 400, headers }
      );
    }

    // Normalize job description field (handle both jobDescription and description)
    const jobDescription = jobData?.jobDescription || jobData?.description || '';
    
    console.log('📊 Job data provided:', {
      hasJobData: !!jobData,
      jobId: jobId,
      jobTitle: jobData?.title || jobData?.jobTitle,
      hasDescription: !!jobDescription,
      descriptionLength: jobDescription.length
    });

    // Check if AI API keys are available
    if (!hasAIApiKeys()) {
      console.log('⚠️ No AI API keys found (gemini_api_key or gemini_api_key2), using fallback analysis');
      const fallbackAnalysis = generateFallbackAnalysis();
      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis,
        timestamp: new Date().toISOString(),
        note: 'Using fallback analysis - AI API keys not configured'
      }, { headers });
    }

    // Extract CV text for analysis
    const cvText = extractCVText(cvData);
    
    if (!cvText.trim()) {
      console.log('❌ No CV content found for analysis');
      return NextResponse.json(
        { success: false, error: 'No CV content found for analysis' },
        { status: 400, headers }
      );
    }

    console.log('📊 CV text extracted, length:', cvText.length);

    // Run all analyses in parallel for better performance
    console.log('🤖 Running AI analysis...');
    const [
      experienceLevelResult, 
      careerPathResult, 
      strategicSuggestionsResult,
      impactScoreResult,
      careerCoherenceResult,
      cvOptimizationResult,
      skillsGapResult,
      seniorTranslationResult,
      industrySpecializationResult
    ] = await Promise.all([
      analyzeExperienceLevel(cvText, jobData),
      analyzeCareerPath(cvText, jobData),
      analyzeStrategicSuggestions(cvText, jobData),
      analyzeImpactScore(cvText, jobData),
      analyzeCareerCoherence(cvText, jobData),
      analyzeCVOptimization(cvText, jobData),
      analyzeSkillsGap(cvText, jobData),
      analyzeSeniorTranslation(cvText, jobData),
      analyzeIndustrySpecialization(cvText, jobData)
    ]);

    const analysis = {
      experienceLevel: experienceLevelResult,
      careerPath: careerPathResult,
      strategicSuggestions: strategicSuggestionsResult,
      impactScore: impactScoreResult,
      careerCoherence: careerCoherenceResult,
      cvOptimization: cvOptimizationResult,
      skillsGap: skillsGapResult,
      seniorTranslation: seniorTranslationResult,
      industrySpecialization: industrySpecializationResult
    };

    console.log('✅ AI analysis completed successfully');

    // Log AI usage activity
    try {
      const { ActivityLogService } = await import('@/lib/services/activityLogService');
      
      // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
      const promptLength = JSON.stringify(cvData).length + (jobData ? JSON.stringify(jobData).length : 0);
      const responseLength = JSON.stringify(analysis).length;
      const estimatedTokens = Math.ceil((promptLength + responseLength) / 4);
      // Estimate cost (Gemini 2.5 Flash Lite: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens)
      const estimatedCost = (promptLength / 4 / 1000000 * 0.075) + (responseLength / 4 / 1000000 * 0.30);
      
      await ActivityLogService.logAI({
        userId: userId,
        userEmail: userEmail,
        model: 'gemini-2.0-flash-lite-preview-02-05',
        tokensUsed: estimatedTokens,
        cost: estimatedCost,
        responseLength: responseLength,
        action: 'career_analysis',
        status: 'success',
        metadata: {
          jobId: jobId
        }
      });
    } catch (logError) {
      console.error('Failed to log AI usage:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    }, { headers });

  } catch (error) {
    // Safely extract error message (handle Event objects)
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Check if it's an Event object
      if (error instanceof Event || ('target' in error && 'preventDefault' in error)) {
        errorMessage = 'Resource loading error occurred';
        console.error('❌ Career analysis error: Event object caught:', {
          type: (error as Event).type,
          target: (error as Event).target
        });
      } else {
        // Try to stringify safely
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = String(error);
        }
      }
    } else {
      errorMessage = String(error);
    }
    
    console.error('❌ Career analysis error:', errorMessage);
    
    // Fallback analysis if AI fails
    console.log('🔄 Using fallback analysis due to error');
    const fallbackAnalysis = generateFallbackAnalysis();
    
    return NextResponse.json({
      success: true,
      analysis: fallbackAnalysis,
      timestamp: new Date().toISOString(),
      note: 'Using fallback analysis due to AI service unavailability',
      error: errorMessage
    }, { headers: new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    })});
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function extractCVText(cvData: UnifiedCVDataStructure): string {
  const sections = [];
  
  // Basic info
  if (cvData.basics) {
    if (cvData.basics.name) sections.push(`Name: ${cvData.basics.name}`);
    if (cvData.basics.label) sections.push(`Title: ${cvData.basics.label}`);
    if (cvData.basics.summary) sections.push(`Summary: ${cvData.basics.summary}`);
  }
  
  // Work experience
  if (cvData.work && cvData.work.length > 0) {
    sections.push('\nWork Experience:');
    cvData.work.forEach(work => {
      if (work.position && work.name) {
        sections.push(`${work.position} at ${work.name}`);
        if (work.startDate) sections.push(`Duration: ${work.startDate} - ${work.endDate || 'Present'}`);
        if (work.summary) sections.push(`Description: ${work.summary}`);
        if (work.highlights && work.highlights.length > 0) {
          sections.push(`Achievements: ${work.highlights.join(', ')}`);
        }
      }
    });
  }
  
  // Education
  if (cvData.education && cvData.education.length > 0) {
    sections.push('\nEducation:');
    cvData.education.forEach(edu => {
      if (edu.studyType && edu.area) {
        sections.push(`${edu.studyType} in ${edu.area} from ${edu.institution || 'Unknown Institution'}`);
      }
    });
  }
  
  // Skills
  if (cvData.skills && cvData.skills.length > 0) {
    sections.push('\nSkills:');
    cvData.skills.forEach(skill => {
      if (skill.category && skill.skills) {
        sections.push(`${skill.category}: ${skill.skills.join(', ')}`);
      }
    });
  }
  
  // Projects
  if (cvData.projects && cvData.projects.length > 0) {
    sections.push('\nProjects:');
    cvData.projects.forEach(project => {
      if (project.name) {
        sections.push(`${project.name}: ${project.description || 'No description'}`);
      }
    });
  }
  
  return sections.join('\n');
}

async function analyzeExperienceLevel(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Company: ${jobData.company || jobData.companyName || 'Company'}
Job Description: ${jobDescription || 'No description available'}

` : '';

  const prompt = `Analyze this CV and determine the candidate's current career level.
Choose from: Junior, Mid-Level, Senior, Director, VP, C-Level

Consider:
- Years of experience
- Leadership responsibilities
- Scope of impact
- Technical depth vs breadth
${jobData ? '- How their experience aligns with the target job requirements' : ''}

${jobContext}CV Data: ${cvText}

Respond in JSON format:
{
  "level": "Senior",
  "rationale": "5+ years with team lead experience..."
}`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    // Try to parse JSON response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback parsing
    return {
      level: "Mid-Level",
      rationale: "Based on experience and responsibilities shown in the CV"
    };
  } catch (error) {
    console.error('Experience level analysis error:', error);
    return {
      level: "Mid-Level",
      rationale: "Unable to analyze experience level"
    };
  }
}

async function analyzeCareerPath(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Company: ${jobData.company || jobData.companyName || 'Company'}
Job Description: ${jobDescription || 'No description available'}

` : '';

  const prompt = `Based on this candidate's background, project the next 3 logical career steps.
${jobData ? 'Consider how their current experience positions them for the target role and beyond.' : ''}

${jobContext}CV Data: ${cvText}

For each step, provide:
1. Job title
2. Why this is a logical next step
${jobData ? '3. How it relates to the target job requirements' : ''}

Respond in JSON format:
{
  "step1": { "title": "Senior Software Engineer", "reasoning": "Natural progression from current role..." },
  "step2": { "title": "Tech Lead", "reasoning": "Building on technical expertise..." },
  "step3": { "title": "Engineering Manager", "reasoning": "Leadership and management growth..." }
}`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    // Try to parse JSON response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback
    return {
      step1: { title: "Senior Developer", reasoning: "Next logical step in technical progression" },
      step2: { title: "Tech Lead", reasoning: "Building leadership skills" },
      step3: { title: "Engineering Manager", reasoning: "Management and strategic growth" }
    };
  } catch (error) {
    console.error('Career path analysis error:', error);
    return {
      step1: { title: "Senior Developer", reasoning: "Next step in career progression" },
      step2: { title: "Tech Lead", reasoning: "Leadership development" },
      step3: { title: "Engineering Manager", reasoning: "Management growth" }
    };
  }
}

async function analyzeStrategicSuggestions(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Company: ${jobData.company || jobData.companyName || 'Company'}
Job Description: ${jobDescription || 'No description available'}

` : '';

  const prompt = `Given this CV, identify:

1. One critical HARD SKILL they lack (e.g., specific technology, certification)
2. One critical SOFT SKILL they need to develop (e.g., leadership, communication)
3. Rewrite their most recent work experience for greater impact (quantifiable, leadership-focused)
${jobData ? '4. Focus on skills and experience that align with the target job requirements' : ''}

${jobContext}CV Data: ${cvText}

Respond in JSON format:
{
  "hardSkill": { "skill": "Kubernetes", "rationale": "Essential for modern DevOps..." },
  "softSkill": { "skill": "Cross-team Leadership", "rationale": "Needed for senior roles..." },
  "experienceReframe": {
    "original": "Worked on backend systems...",
    "improved": "Led team of 4 engineers to develop scalable backend systems, increasing throughput by 40%...",
    "rationale": "More quantifiable and leadership-focused"
  }
}`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    // Try to parse JSON response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback
    return {
      hardSkill: { skill: "Cloud Technologies", rationale: "Essential for modern development" },
      softSkill: { skill: "Leadership", rationale: "Important for career advancement" },
      experienceReframe: {
        original: "Worked on various projects",
        improved: "Led development of key projects resulting in 25% efficiency improvement",
        rationale: "More specific and impactful"
      }
    };
  } catch (error) {
    console.error('Strategic suggestions analysis error:', error);
    return {
      hardSkill: { skill: "Advanced Technologies", rationale: "Keep skills current" },
      softSkill: { skill: "Communication", rationale: "Essential for growth" },
      experienceReframe: {
        original: "General work experience",
        improved: "Quantified achievements with measurable impact",
        rationale: "More compelling presentation"
      }
    };
  }
}

async function analyzeImpactScore(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Job Description: ${jobDescription || 'No description available'}

` : '';

  const prompt = `Analyze this CV for quantifiable achievements and impact metrics.

${jobContext}CV Data: ${cvText}

Provide analysis in JSON format:
{
  "quantifiableStatements": number,
  "highImpactVerbs": number,
  "industryKeywords": number,
  "insights": [
    {
      "type": "Critical Gap" | "Improvement Needed" | "Strength",
      "message": "Specific insight about the metric"
    }
  ]
}

Count:
1. Quantifiable statements (with numbers, percentages, metrics)
2. High-impact action verbs (Led, Spearheaded, Drove, etc.)
3. Industry-specific keywords relevance (0-100%)

Respond in JSON format only.`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      quantifiableStatements: 3,
      highImpactVerbs: 8,
      industryKeywords: 75,
      insights: [
        { type: "Critical Gap", message: "Only 3 out of 15 bullet points contain numbers or percentages" },
        { type: "Improvement Needed", message: "Shift from passive verbs to action verbs" }
      ]
    };
  } catch (error) {
    console.error('Impact score analysis error:', error);
    return {
      quantifiableStatements: 3,
      highImpactVerbs: 8,
      industryKeywords: 75,
      insights: [
        { type: "Critical Gap", message: "Limited quantifiable achievements" },
        { type: "Improvement Needed", message: "Need more action-oriented language" }
      ]
    };
  }
}

async function analyzeCareerCoherence(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Job Description: ${jobDescription || 'No description available'}

` : '';

  const prompt = `Analyze the career progression and coherence of this CV.

${jobContext}CV Data: ${cvText}

Provide analysis in JSON format:
{
  "score": number (0-100),
  "strengths": ["strength1", "strength2"],
  "redFlags": [
    {
      "issue": "Description of the issue",
      "impact": "Why this matters to recruiters",
      "action": "Recommended action"
    }
  ]
}

Consider:
- Job duration patterns
- Career progression logic
- Industry consistency
- Skill development trajectory

Respond in JSON format only.`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      score: 85,
      strengths: ["Consistent technical progression", "Strong problem-solving skills"],
      redFlags: [
        {
          issue: "Short job duration at previous role",
          impact: "Multiple short stints can signal 'job hopper' risk",
          action: "Clarify if this was a contract or layoff"
        }
      ]
    };
  } catch (error) {
    console.error('Career coherence analysis error:', error);
    return {
      score: 85,
      strengths: ["Consistent progression"],
      redFlags: []
    };
  }
}

async function analyzeCVOptimization(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Job Description: ${jobDescription || 'No description available'}

` : '';
  
  const prompt = `Analyze CV structure and optimization for recruiter scanning.
${jobData ? 'Consider how the CV structure aligns with the target job requirements.' : ''}

${jobContext}CV Data: ${cvText}

Provide analysis in JSON format:
{
  "totalLength": "1 Page" | "2 Pages" | "3+ Pages",
  "bulletPointLength": "Avg. X.X Lines",
  "educationPlacement": "Top" | "After Experience" | "At bottom",
  "recommendations": [
    {
      "area": "Area of improvement",
      "current": "Current state",
      "recommended": "Recommended change",
      "reason": "Why this matters"
    }
  ]
}

Consider:
- Total length appropriateness for experience level
- Bullet point conciseness
- Information hierarchy
- Recruiter scanning efficiency

Respond in JSON format only.`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      totalLength: "2 Pages",
      bulletPointLength: "Avg. 3.2 Lines",
      educationPlacement: "At bottom",
      recommendations: [
        {
          area: "Length",
          current: "2 Pages",
          recommended: "1 Page for mid-level",
          reason: "Recruiters won't read the second page"
        }
      ]
    };
  } catch (error) {
    console.error('CV optimization analysis error:', error);
    return {
      totalLength: "2 Pages",
      bulletPointLength: "Avg. 3.2 Lines",
      educationPlacement: "At bottom",
      recommendations: []
    };
  }
}

async function analyzeSkillsGap(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Job Requirements: ${jobDescription || 'No description available'}

` : '';

  const prompt = `Analyze skills depth vs frequency and focus distribution in this CV.

${jobContext}CV Data: ${cvText}

Provide analysis in JSON format:
{
  "skills": [
    {
      "name": "Skill name",
      "mentions": number,
      "quantifiedUse": number,
      "gapInsight": "Major Gap" | "Minor Gap" | "Targeted Gap" | "No Gap"
    }
  ],
  "focusDistribution": [
    {
      "area": "Area name",
      "percentage": number
    }
  ],
  "recommendations": [
    {
      "skill": "Skill name",
      "action": "Recommended action",
      "priority": "High" | "Medium" | "Low"
    }
  ]
}

Analyze:
- How often each skill is mentioned
- How often skills are used with quantifiable results
- Focus area distribution across the CV
- Skills gaps for career advancement

Respond in JSON format only.`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      skills: [
        { name: "SQL/Data Analysis", mentions: 4, quantifiedUse: 1, gapInsight: "Major Gap" },
        { name: "Stakeholder Management", mentions: 7, quantifiedUse: 5, gapInsight: "Minor Gap" }
      ],
      focusDistribution: [
        { area: "Feature Execution/Delivery", percentage: 50 },
        { area: "Long-term Strategy/Vision", percentage: 25 },
        { area: "People/Stakeholder Management", percentage: 15 },
        { area: "Data/Technical Details", percentage: 10 }
      ],
      recommendations: [
        { skill: "Data Analysis", action: "Add more quantified examples", priority: "High" }
      ]
    };
  } catch (error) {
    console.error('Skills gap analysis error:', error);
    return {
      skills: [],
      focusDistribution: [],
      recommendations: []
    };
  }
}

async function analyzeSeniorTranslation(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Job Description: ${jobDescription || 'No description available'}

` : '';
  
  const prompt = `Analyze and provide senior-level translations for mid-level experience statements.
${jobData ? 'Focus on translating experience to align with the target job requirements.' : ''}

${jobContext}CV Data: ${cvText}

Provide analysis in JSON format:
{
  "translations": [
    {
      "current": "Current mid-level statement",
      "improved": "Senior-level translation",
      "shift": "Type of shift (e.g., 'Execution → Strategy')"
    }
  ],
  "principles": [
    "Principle 1: Focus on impact and leadership",
    "Principle 2: Use quantifiable metrics",
    "Principle 3: Emphasize strategic thinking"
  ]
}

Transform mid-level language to senior-level by:
- Adding leadership and mentoring aspects
- Including strategic impact
- Using quantifiable results
- Emphasizing cross-functional collaboration

Respond in JSON format only.`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      translations: [
        {
          current: "Managed the product backlog and defined user stories",
          improved: "Owned the 12-month product roadmap, aligning it with executive-level OKRs",
          shift: "Execution → Strategy"
        },
        {
          current: "Worked with the engineering team to ship features",
          improved: "Mentored junior PMs and coached the Engineering Manager on agile best practices",
          shift: "Contributor → Leader"
        }
      ],
      principles: [
        "Focus on impact and leadership",
        "Use quantifiable metrics",
        "Emphasize strategic thinking"
      ]
    };
  } catch (error) {
    console.error('Senior translation analysis error:', error);
    return {
      translations: [],
      principles: []
    };
  }
}

async function analyzeIndustrySpecialization(cvText: string, jobData?: any) {
  // Normalize job description field
  const jobDescription = jobData?.jobDescription || jobData?.description || '';
  
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Job Description: ${jobDescription || 'No description available'}

` : '';
  
  const prompt = `Analyze industry specialization and identify critical keywords for this CV.
${jobData ? 'Prioritize keywords that match the target job requirements.' : ''}

${jobContext}CV Data: ${cvText}

Provide analysis in JSON format:
{
  "specialization": "Industry specialization identified",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "contactIssues": [
    {
      "issue": "Issue description",
      "action": "Recommended action"
    }
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}

Analyze:
- Industry patterns in work experience
- Critical keywords for that industry
- Contact information professionalism
- Industry-specific recommendations

Respond in JSON format only.`;

  try {
    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are an expert career analyst. Analyze CVs and provide insights in JSON format.',
      temperature: 0.7,
      maxTokens: 1024
    });
    
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      specialization: "Software Development",
      keywords: ["React", "Node.js", "TypeScript", "AWS", "Docker", "Kubernetes"],
      contactIssues: [
        {
          issue: "Using personal email domain",
          action: "Update to professional email domain"
        },
        {
          issue: "Using default LinkedIn URL",
          action: "Create custom LinkedIn URL"
        }
      ],
      recommendations: [
        "Emphasize industry-specific technologies",
        "Use relevant industry terminology"
      ]
    };
  } catch (error) {
    console.error('Industry specialization analysis error:', error);
    return {
      specialization: "General",
      keywords: [],
      contactIssues: [],
      recommendations: []
    };
  }
}

function generateFallbackAnalysis() {
  return {
    experienceLevel: {
      level: "Mid-Level",
      rationale: "Based on the experience and skills shown in your CV"
    },
    careerPath: {
      step1: { 
        title: "Senior Developer", 
        reasoning: "Natural progression building on current technical skills" 
      },
      step2: { 
        title: "Tech Lead", 
        reasoning: "Developing leadership and mentoring capabilities" 
      },
      step3: { 
        title: "Engineering Manager", 
        reasoning: "Strategic management and team building" 
      }
    },
    strategicSuggestions: {
      hardSkill: { 
        skill: "Cloud Technologies (AWS/Azure)", 
        rationale: "Essential for modern software development and deployment" 
      },
      softSkill: { 
        skill: "Cross-functional Leadership", 
        rationale: "Critical for senior roles and career advancement" 
      },
      experienceReframe: {
        original: "Worked on various development projects",
        improved: "Led development of scalable applications serving 10K+ users, improving performance by 30%",
        rationale: "More specific, quantifiable, and impactful presentation"
      }
    },
    impactScore: {
      quantifiableStatements: 3,
      highImpactVerbs: 8,
      industryKeywords: 75,
      insights: [
        { type: "Critical Gap", message: "Limited quantifiable achievements" },
        { type: "Improvement Needed", message: "Need more action-oriented language" }
      ]
    },
    careerCoherence: {
      score: 85,
      strengths: ["Consistent technical progression", "Strong problem-solving skills"],
      redFlags: []
    },
    cvOptimization: {
      totalLength: "2 Pages",
      bulletPointLength: "Avg. 3.2 Lines",
      educationPlacement: "At bottom",
      recommendations: []
    },
    skillsGap: {
      skills: [],
      focusDistribution: [],
      recommendations: []
    },
    seniorTranslation: {
      translations: [],
      principles: []
    },
    industrySpecialization: {
      specialization: "General",
      keywords: [],
      contactIssues: [],
      recommendations: []
    }
  };
}
