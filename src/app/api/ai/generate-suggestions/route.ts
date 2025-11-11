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
      maxTokens: 3000
    });

    // Parse the response to extract 4 suggestions
    const suggestions = parseSuggestions(response.content, sectionType);
    
    // Ensure we have exactly 4 suggestions
    while (suggestions.length < 4) {
      suggestions.push({
        method: `Method ${suggestions.length + 1}`,
        content: 'Generating...'
      });
    }

    return suggestions.slice(0, 4);
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
  const sectionContext = getSectionContext(sectionType, sectionData);
  const hasJobContext = jobDescription && jobDescription.trim().length > 0;
  
  const jobContextSection = hasJobContext 
    ? `JOB CONTEXT:
- Job Title: ${jobTitle || 'Not specified'}
- Company: ${company || 'Not specified'}
- Job Description: ${jobDescription.substring(0, 2000)}

IMPORTANT: Tailor all suggestions to match the job description keywords and requirements.`
    : `NOTE: This is a Master CV (no specific job context). Generate general, professional content that highlights achievements and impact without job-specific tailoring.`;

  return `You are an expert career coach and resume writer. Generate exactly 4 different, high-quality variations for a CV section.

${jobContextSection}

SECTION CONTEXT:
- Section Type: ${sectionType}
- Current Content: ${currentText || '(empty)'}
${sectionContext}

USER'S CV DATA (for context):
${JSON.stringify(cvData?.basics || {}, null, 2).substring(0, 500)}

REQUIREMENTS:
1. Generate exactly 4 different variations using different writing methods
2. Method 1: STAR Method (Situation, Task, Action, Result) - Use bullet points with clear situation, task, action, and result
3. Method 2: CAR Method (Challenge, Action, Result) - Focus on challenges faced and results achieved
4. Method 3: Quantified Achievements - Emphasize metrics, numbers, percentages, and measurable impact
5. Method 4: Impact-Focused Narrative - Tell a compelling story of impact and value delivered

CRITICAL INSTRUCTIONS:
${hasJobContext 
  ? '- Each variation must be tailored to the job description keywords and requirements'
  : '- Generate professional, impactful content suitable for a Master CV that can be adapted to any job'}
- Use strong action verbs and industry-relevant terminology
- Make content ATS-friendly with relevant keywords
- Keep each variation concise but impactful (3-5 bullet points or 2-3 sentences)
- Ensure content is professional, polished, and ready to use without editing
- Format Method 1 (STAR) as bullet points
- Format Methods 2-4 as appropriate (bullet points or paragraphs)

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "method": "STAR Method",
      "content": "bullet point format with Situation, Task, Action, Result"
    },
    {
      "method": "CAR Method",
      "content": "bullet point format focusing on Challenge, Action, Result"
    },
    {
      "method": "Quantified Achievements",
      "content": "bullet point format with metrics and numbers"
    },
    {
      "method": "Impact-Focused Narrative",
      "content": "narrative format telling a compelling story"
    }
  ]
}

Generate the 4 variations now:`;
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
    
    default:
      return `- Section: ${sectionType}`;
  }
}

function parseSuggestions(content: string, sectionType: string): Array<{ method: string; content: string }> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions.map((s: any) => ({
          method: s.method || 'Method',
          content: s.content || ''
        }));
      }
    }

    // If JSON parsing fails, try to extract 4 sections
    const sections = content.split(/\n\n+/);
    const suggestions: Array<{ method: string; content: string }> = [];
    
    const methods = ['STAR Method', 'CAR Method', 'Quantified Achievements', 'Impact-Focused Narrative'];
    
    for (let i = 0; i < Math.min(4, sections.length); i++) {
      const section = sections[i].trim();
      if (section.length > 20) {
        suggestions.push({
          method: methods[i] || `Method ${i + 1}`,
          content: section
        });
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Error parsing suggestions:', error);
    return [];
  }
}

function generateFallbackSuggestions(sectionType: string, sectionData: any, jobDescription: string): Array<{ method: string; content: string }> {
  const position = sectionData?.position || sectionData?.name || 'Professional';
  const company = sectionData?.name || sectionData?.organization || sectionData?.institution || 'Company';
  
  return [
    {
      method: 'STAR Method',
      content: `• Situation: Faced [challenge] in ${position} role${company !== 'Company' ? ` at ${company}` : ''}\n• Task: Responsible for [key responsibility]\n• Action: Implemented [action taken] using [skills/tools]\n• Result: Achieved [measurable result]`
    },
    {
      method: 'CAR Method',
      content: `• Challenge: Addressed [specific challenge]\n• Action: Led [action] to solve [problem]\n• Result: Delivered [outcome] with [impact]`
    },
    {
      method: 'Quantified Achievements',
      content: `• Increased [metric] by [X]% through [action]\n• Managed [number] [resources/projects] resulting in [outcome]\n• Reduced [cost/time] by [X]% while improving [quality]`
    },
    {
      method: 'Impact-Focused Narrative',
      content: `Drove significant value${position !== 'Professional' ? ` as ${position}` : ''}${company !== 'Company' ? ` at ${company}` : ''} by [key achievement]. Transformed [area] through [approach], resulting in [outcome]. Consistently delivered [results] while [additional value].`
    }
  ];
}

