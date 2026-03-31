/**
 * AI Bullet Point Generation Service
 * 
 * Uses existing AI infrastructure:
 * - /api/ai/section-generate for CAR-framework bullet rewriting
 * - /api/ai/generate-suggestions for suggestion variations
 */

interface BulletContext {
  sectionType: 'experience' | 'education' | 'project';
  entryData: Record<string, any>;
  existingBullets: string[];
  profileSummary?: string;
}

interface GenerateBulletResponse {
  success: boolean;
  bullet: string;
  error?: string;
}

/**
 * Generate a new bullet point based on context using existing AI service
 */
export async function generateBullet(context: BulletContext): Promise<GenerateBulletResponse> {
  try {
    const prompt = buildPrompt(context);

    const response = await fetch('/api/ai/section-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionType: context.sectionType,
        content: prompt,
        mode: 'generate-new',
        context: {
          entryData: context.entryData,
          existingBullets: context.existingBullets,
          profileSummary: context.profileSummary,
        },
      }),
    });

    if (!response.ok) {
      // Fallback: try generate-suggestions endpoint
      return await generateViaSuggestions(context);
    }

    const data = await response.json();
    return {
      success: true,
      bullet: data.bullet || data.content || data.suggestion || '',
    };
  } catch (error) {
    console.error('AI bullet generation failed:', error);
    return {
      success: false,
      bullet: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fallback: generate via suggestions API
 */
async function generateViaSuggestions(context: BulletContext): Promise<GenerateBulletResponse> {
  try {
    const response = await fetch('/api/ai/generate-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionType: context.sectionType,
        content: buildPrompt(context),
        variationType: 'STAR',
        experienceLevel: 'Mid-Level',
      }),
    });

    if (!response.ok) {
      throw new Error(`Suggestions API returned ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.suggestions || [];
    const first = suggestions[0];

    return {
      success: true,
      bullet: first?.content || first?.text || '',
    };
  } catch (error) {
    return {
      success: false,
      bullet: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build the AI prompt from context
 */
function buildPrompt(context: BulletContext): string {
  const { sectionType, entryData, existingBullets, profileSummary } = context;

  const parts: string[] = [];

  parts.push(`Generate ONE new achievement bullet point for a ${sectionType} entry.`);

  if (sectionType === 'experience') {
    if (entryData.company) parts.push(`Company: ${entryData.company}`);
    if (entryData.position) parts.push(`Position: ${entryData.position}`);
  } else if (sectionType === 'education') {
    if (entryData.institution) parts.push(`Institution: ${entryData.institution}`);
    if (entryData.studyType || entryData.area) {
      parts.push(`Degree: ${[entryData.studyType, entryData.area].filter(Boolean).join(' in ')}`);
    }
  } else if (sectionType === 'project') {
    if (entryData.name) parts.push(`Project: ${entryData.name}`);
  }

  if (existingBullets.length > 0) {
    parts.push(`\nExisting bullet points:\n${existingBullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}`);
    parts.push('\nThe new bullet point should complement the existing ones. Do not repeat what is already covered.');
  }

  if (profileSummary) {
    parts.push(`\nCandidate profile: ${profileSummary}`);
  }

  parts.push('\nGenerate a single, impactful bullet point. Start with a strong action verb. Include metrics where possible. Return ONLY the bullet point text, no numbering or prefix.');

  return parts.join('\n');
}
