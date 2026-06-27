import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import LinkedInSnapshot from '@/models/LinkedInSnapshot';
import fs from 'fs';
import path from 'path';

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
    // Also check if tone matches - if tone changed, we should regenerate
    if (!regenerate && cvId) {
      try {
        const existingSnapshot = await LinkedInSnapshot.findOne({
          userId: session.user.id,
          sourceCvId: cvId
        }).sort({ updatedAt: -1 });

        // Only return cached if tone matches
        if (existingSnapshot && existingSnapshot.tone === tone) {
          console.log('Returning cached LinkedIn enhancement for CV:', cvId);
          const cachedContent = existingSnapshot.generatedContent || {};
          
          return NextResponse.json({
            success: true,
            sections: {
              hero: cachedContent.hero || {},
              about: cachedContent.about || {},
              experience: cachedContent.experience || [],
              projects: cachedContent.projects || [],
              skills_matrix: cachedContent.skills_matrix || {},
            },
            side_cards: cachedContent.side_cards || {
              profile_strength_score: 50,
              skill_gap_analysis: '',
              recommended_actions: [],
              affiliate_courses: [],
              networking: [],
              career_pathway: { next_step: '', missing_skill: '' }
            },
            career_guide: cachedContent.career_guide || null,
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

    // Build the AI prompt with variation seed for regeneration
    const variationSeed = regenerate ? Date.now() : undefined;
    const prompt = buildLinkedInEnhancerPrompt(cv, tone, targetIndustry, variationSeed);

    // Call Gemini API with fallback
    let aiResponse: string | null = null;
    try {
      aiResponse = await callGeminiWithAllKeysFallback(prompt, {
        model: 'gemini-2.5-flash',
        temperature: regenerate ? 0.9 : 0.7, // Higher temperature for variations
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
        const dbContent = {
          hero: enhancedData.sections?.hero,
          about: enhancedData.sections?.about,
          experience: enhancedData.sections?.experience,
          projects: enhancedData.sections?.projects,
          skills_matrix: enhancedData.sections?.skills_matrix,
          career_guide: enhancedData.career_guide,
          side_cards: enhancedData.side_cards
        };

        await LinkedInSnapshot.findOneAndUpdate(
          { userId: session.user.id, sourceCvId: saveId },
          {
            userId: session.user.id,
            sourceCvId: saveId,
            tone,
            targetIndustry,
            generatedContent: dbContent,
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
function buildLinkedInEnhancerPrompt(cvData: any, tone: string, targetIndustry?: string, variationSeed?: number): string {
  const cvJson = JSON.stringify(cvData, null, 2);
  
  // Read prompt template from public/images/lindkedin_prompt.md
  let promptTemplate = '';
  try {
    const filePath = path.join(process.cwd(), 'public', 'images', 'lindkedin_prompt.md');
    promptTemplate = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('Failed to read linkedin_prompt.md, falling back to basic prompt', err);
    promptTemplate = `Transform CV data to LinkedIn Profile.\nTone: {{TONE_PREFERENCE}}\nCV: {{MASTER_CV_DATA}}`;
  }

  // Map tone from UI selector values to expected prompt keys
  const mappedTone = tone.toLowerCase();

  // Extract details for placeholder replacement
  const candidateName = cvData.basics?.name || 
    (cvData.personalInfo ? `${cvData.personalInfo.firstName || ''} ${cvData.personalInfo.lastName || ''}`.trim() : '') || 
    'Candidate';
  const targetRole = targetIndustry || cvData.basics?.label || cvData.personalInfo?.title || '';

  // Replace placeholders in the prompt template
  let finalPrompt = promptTemplate
    .replace('{{MASTER_CV_DATA}}', cvJson)
    .replace('{{TONE_PREFERENCE}}', mappedTone)
    .replace('{{TARGET_ROLE}}', targetRole)
    .replace('{{CANDIDATE_NAME}}', candidateName)
    .replace('{{EXISTING_LINKEDIN_DATA}}', '');

  // Add variation instruction if seed is provided for regeneration
  if (variationSeed) {
    finalPrompt += `\n\n# VARIATION REQUEST (Seed: ${variationSeed})
This is a regeneration request. Create a FRESH and DIFFERENT version of the LinkedIn profile:
- Use different wording and phrasing while maintaining the same professional quality
- Explore alternative narrative strategies for the About section
- Vary the bullet point structures in Experience
- Consider different SEO keyword combinations
- Ensure this feels like a distinct alternative, not a rehash`;
  }

  return finalPrompt;
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
