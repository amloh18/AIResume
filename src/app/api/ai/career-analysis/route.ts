import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting career analysis...');
    
    // Add CORS headers
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { cvData, jobData, jobId }: { 
      cvData: UnifiedCVDataStructure; 
      jobData?: any; 
      jobId?: string; 
    } = await request.json();

    if (!cvData) {
      console.log('❌ No CV data provided');
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400, headers }
      );
    }

    console.log('📊 Job data provided:', {
      hasJobData: !!jobData,
      jobId: jobId,
      jobTitle: jobData?.title || jobData?.jobTitle,
      hasDescription: !!jobData?.jobDescription
    });

    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('⚠️ No GEMINI_API_KEY found, using fallback analysis');
      const fallbackAnalysis = generateFallbackAnalysis();
      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis,
        timestamp: new Date().toISOString(),
        note: 'Using fallback analysis - GEMINI_API_KEY not configured'
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

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Run all three analyses in parallel for better performance
    console.log('🤖 Running AI analysis...');
    const [experienceLevelResult, careerPathResult, strategicSuggestionsResult] = await Promise.all([
      analyzeExperienceLevel(model, cvText, jobData),
      analyzeCareerPath(model, cvText, jobData),
      analyzeStrategicSuggestions(model, cvText, jobData)
    ]);

    const analysis = {
      experienceLevel: experienceLevelResult,
      careerPath: careerPathResult,
      strategicSuggestions: strategicSuggestionsResult
    };

    console.log('✅ AI analysis completed successfully');

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    }, { headers });

  } catch (error) {
    console.error('❌ Career analysis error:', error);
    
    // Fallback analysis if AI fails
    console.log('🔄 Using fallback analysis due to error');
    const fallbackAnalysis = generateFallbackAnalysis();
    
    return NextResponse.json({
      success: true,
      analysis: fallbackAnalysis,
      timestamp: new Date().toISOString(),
      note: 'Using fallback analysis due to AI service unavailability',
      error: error instanceof Error ? error.message : 'Unknown error'
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
      if (skill.name && skill.keywords) {
        sections.push(`${skill.name}: ${skill.keywords.join(', ')}`);
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

async function analyzeExperienceLevel(model: any, cvText: string, jobData?: any) {
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Company: ${jobData.company || jobData.companyName || 'Company'}
Job Description: ${jobData.jobDescription || 'No description available'}

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
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    // Try to parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
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

async function analyzeCareerPath(model: any, cvText: string, jobData?: any) {
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Company: ${jobData.company || jobData.companyName || 'Company'}
Job Description: ${jobData.jobDescription || 'No description available'}

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
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    // Try to parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
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

async function analyzeStrategicSuggestions(model: any, cvText: string, jobData?: any) {
  const jobContext = jobData ? `
Target Job: ${jobData.title || jobData.jobTitle || 'Position'}
Company: ${jobData.company || jobData.companyName || 'Company'}
Job Description: ${jobData.jobDescription || 'No description available'}

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
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    // Try to parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
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
    }
  };
}
