import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import LinkedInSnapshot from '@/models/LinkedInSnapshot';

/**
 * LinkedIn Enhancer API Endpoint
 * POST /api/linkedin-enhance
 * 
 * Transforms CV data into optimized LinkedIn profile content
 * using AI with comprehensive edge case handling.
 * 
 * Update: Now supports persistence via LinkedInSnapshot model.
 */

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cvId, cvType, tone = 'Professional', targetIndustry, cvData, regenerate = false } = body;

    if (!cvId && !cvData) {
      return NextResponse.json(
        { success: false, error: 'CV ID or CV data is required' },
        { status: 400 }
      );
    }

    // 1. Check for existing snapshot IF not forcing regeneration
    if (!regenerate && cvId) {
      try {
        const existingSnapshot = await LinkedInSnapshot.findOne({
          userId: session.user.id,
          sourceCvId: cvId
        }).sort({ updatedAt: -1 });

        if (existingSnapshot) {
          console.log('Returning cached LinkedIn enhancement for CV:', cvId);
          return NextResponse.json({
            success: true,
            ...existingSnapshot.generatedContent,
            fromCache: true
          });
        }
      } catch (err) {
        console.error('Error checking LinkedIn snapshot:', err);
        // Continue to generation if cache check fails
      }
    }

    // Use provided cvData or fetch it
    let cv = cvData;
    let fetchedCvId = cvId;

    if (!cv) {
      // Fetch CV data from internal API
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const endpoint = cvType === 'master' ? `${baseUrl}/api/cvs/master` : `${baseUrl}/api/cv/${cvId}`;

      const cvResponse = await fetch(endpoint, {
        headers: { cookie: request.headers.get('cookie') || '' },
      });

      if (!cvResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch CV' },
          { status: 404 }
        );
      }

      const data = await cvResponse.json();
      // Master CV response: { success, data: { masterCV: { cvData: {...} } } }
      cv = cvType === 'master'
        ? (data.data?.masterCV?.cvData || data.data?.masterCV || data.masterCv)
        : data;

      // Ensure we have the correct ID for saving
      if (cvType === 'master' && data.data?.masterCV?._id) {
        fetchedCvId = data.data.masterCV._id;
      }
    }

    // Build the AI prompt
    const prompt = buildLinkedInEnhancerPrompt(cv, tone, targetIndustry);

    // Call Gemini API with fallback
    let aiResponse: string | null = null;
    try {
      aiResponse = await callGeminiWithAllKeysFallback(prompt, {
        model: 'gemini-2.0-flash',
        temperature: 0.7,
        maxTokens: 4000,
      });
    } catch (error) {
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { success: false, error: 'AI enhancement failed. Please try again.' },
        { status: 500 }
      );
    }

    if (!aiResponse) {
      return NextResponse.json(
        { success: false, error: 'AI returned empty response' },
        { status: 500 }
      );
    }

    // Parse AI response
    const enhancedData = parseAIResponse(aiResponse);

    // 2. Save snapshot to database
    if (fetchedCvId || cvId) {
      try {
        const saveId = fetchedCvId || cvId;
        await LinkedInSnapshot.findOneAndUpdate(
          { userId: session.user.id, sourceCvId: saveId },
          {
            userId: session.user.id,
            sourceCvId: saveId,
            tone,
            targetIndustry,
            generatedContent: enhancedData,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );
        console.log('Saved LinkedIn enhancement snapshot for CV:', saveId);
      } catch (err) {
        console.error('Failed to save LinkedIn snapshot:', err);
        // Don't fail the request if save fails, just log it
      }
    }

    return NextResponse.json({
      success: true,
      ...enhancedData,
      fromCache: false
    });
  } catch (error) {
    console.error('LinkedIn Enhance API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build the comprehensive AI prompt with 50+ edge case handling
 */
function buildLinkedInEnhancerPrompt(cvData: any, tone: string, targetIndustry?: string): string {
  const cvJson = JSON.stringify(cvData, null, 2);

  return `# MISSION
You are a Senior Executive Career Brand Strategist. Your goal is to transform a CV JSON into a high-conversion LinkedIn Profile. You are optimized to handle 100+ complex professional edge cases, ensuring no profile is generic or broken.

# TONE INSTRUCTION
Apply the "${tone}" tone to all generated content:
- Professional: Authoritative, polished, formal business language
- Visionary: Future-focused, inspiring, thought leadership style
- Technical: Precise, data-driven, industry jargon appropriate
- Relatable: Warm, approachable, storytelling focus

${targetIndustry ? `# TARGET INDUSTRY: ${targetIndustry}\nOptimize keywords and skills for this specific industry.` : ''}

# 100+ EDGE CASE LOGIC (Strict Guidelines)
1. CAREER ANOMALIES: 
   - Gaps >1 year? Reframe as "Strategic Sabbatical" or "Focused Upskilling."
   - Job Hopping? Group roles by "Consulting/Project Basis" to show versatility.
   - Long Tenure (>10 years)? Nested promotion view to show upward trajectory.
2. INDUSTRY PIVOTS: 
   - Identify "Transferable Bridge Skills" (e.g., Nurse to Tech = Process Optimization).
   - Write an 'About' section that explains the 'Why' of the pivot.
3. SENIORITY VS JUNIOR:
   - Students: Focus on Projects & Potential. 
   - Executives: Focus on P&L, Board Influence, and ROI.
4. TECHNICAL & NICHE:
   - Handle extreme jargon by providing a "Layman's Hook" while keeping "Technical Proof" in bullets.
   - For Confidential Roles: Use "Abstracted Impact" (e.g., "Led classified logistics for [X] region").
5. STRUCTURAL ISSUES:
   - The Ghost Gap: 1+ years unexplained - suggest "Professional Development" placeholder
   - The Over-Tenured: 15+ years at one company - break into promotional entries
   - The Serial Jumper: 5 jobs in 2 years - pivot to "Consultant/Rapid Growth Specialist"
   - The Overlap: 2 full-time roles simultaneously - identify Primary vs Side Venture
6. CONTENT ISSUES:
   - Zero Metrics: Add placeholder [X]% for user to fill
   - Text Wall: Convert 10+ lines to 4 bullets max
   - Over-Buzzwords: Replace "Synergy" and "Passionate" with action verbs
   - Extreme Brevity: Expand based on industry standards
7. SKILL ISSUES:
   - Outdated Tech: Remove "Flash", "Word 2003" - suggest modern equivalents
   - Soft Skill Overload: Extract hard skills from experience text
   - Skill/Role Mismatch: Flag in improvement_notes

# SYSTEM CONSTRAINTS
- Headline: 220 chars max. Key value must be in first 60 chars (visible in search).
- About: 2,600 chars. Use "Hook -> Story -> Proof -> CTA" structure. Hook must be in first 200 chars (mobile visible).
- Experience Bullets: Start with strong Action Verbs. Use Unicode symbols for readability. Max 2000 chars per role.
- Formatting: Must strip all HTML and provide clean text for copy-pasting.

# OUTPUT JSON FORMAT
Return ONLY valid JSON, no other text:
{
  "audit": { 
    "detected_edge_cases": ["list of issues found and handled"], 
    "strategy_applied": "overall strategy description" 
  },
  "sections": {
    "hero": {
      "enhanced": {
        "headline": "max 220 chars, key value in first 60",
        "seo_keywords_used": ["keyword1", "keyword2"],
        "location_suggestion": "optimized location string",
        "rationale": "why this headline works"
      }
    },
    "about": {
      "enhanced": {
        "hook": "first 200 chars - attention grabbing",
        "body": "main content with proof points",
        "cta": "call to action",
        "character_count": 0,
        "narrative_strategy": "why this structure"
      }
    },
    "experience": [
      {
        "id": "original role id or generated",
        "enhanced_data": {
          "title": "optimized title max 100 chars",
          "description_bullets": ["bullet 1", "bullet 2"],
          "tagged_skills": ["skill1", "skill2"],
          "improvement_notes": "what was improved and why"
        }
      }
    ],
    "skills_matrix": {
      "top_3_priority": ["most important skills for profile"],
      "suggested_additions": ["skills to add"],
      "industry_specific": ["industry skills"],
      "interpersonal": ["soft skills"]
    }
  },
  "side_cards": {
    "profile_strength_score": 85,
    "skill_gap_analysis": "what skills are missing",
    "recommended_actions": ["action1", "action2"],
    "affiliate_courses": [
      {
        "title": "course name",
        "provider": "Coursera",
        "affiliate_url": "#",
        "logic": "why this course is recommended"
      }
    ],
    "networking": [
      { "group_name": "relevant group", "members": "50k+" }
    ],
    "career_pathway": {
      "next_step": "suggested next role",
      "missing_skill": "what's needed"
    }
  },
  "career_guide": {
    "salary_insight": "market salary context",
    "next_steps": ["step1", "step2"],
    "missing_credentials": ["cert1", "cert2"]
  }
}

# USER INPUT (CV JSON)
${cvJson}`;
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(response: string): any {
  try {
    // Clean up the response - remove markdown code blocks if present
    let cleaned = response;
    if (cleaned.includes('```json')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    }
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```\s*/g, '');
    }

    // Try to parse JSON
    const parsed = JSON.parse(cleaned.trim());

    // Validate required fields exist
    return {
      audit: parsed.audit || { detected_edge_cases: [], strategy_applied: '' },
      sections: {
        hero: { enhanced: parsed.sections?.hero?.enhanced || {} },
        about: { enhanced: parsed.sections?.about?.enhanced || {} },
        experience: parsed.sections?.experience || [],
        projects: parsed.sections?.projects || [],
        skills_matrix: parsed.sections?.skills_matrix || {},
      },
      side_cards: parsed.side_cards || {
        profile_strength_score: 50,
        skill_gap_analysis: '',
        recommended_actions: [],
        affiliate_courses: [],
        networking: [],
        career_pathway: { next_step: '', missing_skill: '' },
      },
      career_guide: parsed.career_guide || null,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response.substring(0, 500));

    // Return fallback structure
    return {
      audit: { detected_edge_cases: [], strategy_applied: 'Parsing failed' },
      sections: {
        hero: { enhanced: {} },
        about: { enhanced: {} },
        experience: [],
        projects: [],
        skills_matrix: {},
      },
      side_cards: {
        profile_strength_score: 50,
        skill_gap_analysis: 'Unable to analyze',
        recommended_actions: ['Please try regenerating'],
        affiliate_courses: [],
        networking: [],
        career_pathway: { next_step: '', missing_skill: '' },
      },
      career_guide: null,
    };
  }
}
