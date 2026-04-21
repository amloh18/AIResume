import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import { JobService } from '@/lib/services/jobService';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SkillCategory = { category: string; skills: string[] };

function normalizeSkill(skill: string) {
  return skill.trim().replace(/\s+/g, ' ').toLowerCase();
}

function extractExistingSkills(cvData: any): string[] {
  const skills = cvData?.skills;
  if (!Array.isArray(skills)) return [];
  const out: string[] = [];
  for (const group of skills) {
    if (Array.isArray(group?.skills)) out.push(...group.skills);
  }
  return out.filter(Boolean);
}

function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const key = normalizeSkill(s);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.trim());
  }
  return out;
}

function fallbackCategories(role: string, existing: string[]): SkillCategory[] {
  const roleLower = role.toLowerCase();
  const existingSet = new Set(existing.map(normalizeSkill));

  const addIfMissing = (list: string[]) => list.filter(s => !existingSet.has(normalizeSkill(s)));

  if (/(designer|ux|ui)/.test(roleLower)) {
    return [
      { category: 'Core', skills: addIfMissing(['Figma', 'Wireframing', 'Prototyping', 'Design Systems', 'User Research']) },
      { category: 'Tools', skills: addIfMissing(['Adobe XD', 'Illustrator', 'Photoshop', 'Miro']) },
      { category: 'Collaboration', skills: addIfMissing(['Stakeholder Management', 'Cross-functional Collaboration', 'Communication']) }
    ].filter(c => c.skills.length > 0);
  }

  if (/(data|analyst|analytics)/.test(roleLower)) {
    return [
      { category: 'Core', skills: addIfMissing(['SQL', 'Data Modeling', 'ETL', 'Statistics']) },
      { category: 'Tools', skills: addIfMissing(['Tableau', 'Power BI', 'Excel', 'Looker']) },
      { category: 'Programming', skills: addIfMissing(['Python', 'Pandas']) }
    ].filter(c => c.skills.length > 0);
  }

  if (/(software|engineer|developer|frontend|backend|full stack)/.test(roleLower)) {
    return [
      { category: 'Core', skills: addIfMissing(['JavaScript', 'TypeScript', 'Git', 'REST APIs']) },
      { category: 'Frameworks', skills: addIfMissing(['React', 'Next.js', 'Node.js']) },
      { category: 'Cloud & DevOps', skills: addIfMissing(['Docker', 'AWS', 'CI/CD']) }
    ].filter(c => c.skills.length > 0);
  }

  return [
    { category: 'Core', skills: addIfMissing(['Communication', 'Problem Solving', 'Teamwork']) },
    { category: 'Tools', skills: addIfMissing(['Microsoft Excel', 'Google Workspace']) }
  ].filter(c => c.skills.length > 0);
}

function convertAISuggestionsToCategories(suggestions: any[]): SkillCategory[] {
  const categories: SkillCategory[] = [];
  const byCategory = new Map<string, string[]>();

  for (const s of suggestions || []) {
    const field = typeof s?.field === 'string' ? s.field : '';
    const content = typeof s?.content === 'string' ? s.content : '';
    const match = content.split(':').slice(1).join(':').split(',').map(v => v.trim()).filter(Boolean);
    if (match.length === 0) continue;
    const key = field || 'Suggested Skills';
    const prev = byCategory.get(key) || [];
    byCategory.set(key, [...prev, ...match]);
  }

  for (const [category, skills] of byCategory.entries()) {
    const unique = uniqueSkills(skills);
    if (unique.length === 0) continue;
    categories.push({ category, skills: unique });
  }

  return categories;
}

export async function POST(req: NextRequest) {
  try {
    const { cvId, jobId, role } = await req.json();

    if (!cvId) {
      return NextResponse.json({ success: false, error: 'CV ID is required' }, { status: 400 });
    }

    const cv = await UnifiedCVService.getCV(cvId);
    if (!cv?.cvData) {
      return NextResponse.json({ success: false, error: 'CV not found' }, { status: 404 });
    }

    const cvData = cv.cvData;
    const existingSkills = extractExistingSkills(cvData);

    let resolvedRole = typeof role === 'string' && role.trim().length > 0 ? role.trim() : 'General';
    let categories: SkillCategory[] = [];

    if (jobId) {
      try {
        const jobData = await JobService.getJob(jobId);
        resolvedRole = jobData?.title || jobData?.jobTitle || resolvedRole;
        const suggestions = await AIAssistantService.mapSkillsAndKeywords(cvData, jobData);
        categories = convertAISuggestionsToCategories(suggestions);
      } catch {
        categories = [];
      }
    }

    if (categories.length === 0) {
      if (hasAIApiKeys() && resolvedRole !== 'General') {
        const profile = {
          role: resolvedRole,
          summary: cvData?.basics?.summary || '',
          recentTitles: Array.isArray(cvData?.work) ? cvData.work.slice(0, 3).map((w: any) => w?.position || w?.name).filter(Boolean) : [],
          existingSkills: uniqueSkills(existingSkills).slice(0, 80),
        };

        const prompt = `You are an expert resume analyst. Suggest skills to add to a CV for the target role.\n\nReturn ONLY valid JSON with this shape:\n{\n  \"categories\": [\n    { \"category\": \"Core\", \"skills\": [\"Skill 1\", \"Skill 2\"] },\n    { \"category\": \"Tools\", \"skills\": [\"Skill 1\", \"Skill 2\"] }\n  ]\n}\n\nRules:\n- Use the CV context and target role.\n- Do NOT include duplicates of existingSkills.\n- Keep skills concise (1-3 words).\n- Provide 2-4 categories and up to 8 skills each.\n\nCV CONTEXT:\n${JSON.stringify(profile)}\n`;

        const aiResponse = await callAIWithFallback({ prompt, maxTokens: 1200, temperature: 0.2 });
        let parsed: any = null;
        try {
          parsed = JSON.parse(aiResponse?.content || '');
        } catch {
          parsed = null;
        }

        if (parsed?.categories && Array.isArray(parsed.categories)) {
          categories = parsed.categories
            .map((c: any) => ({
              category: typeof c?.category === 'string' ? c.category : 'Suggested Skills',
              skills: uniqueSkills(Array.isArray(c?.skills) ? c.skills : []),
            }))
            .filter((c: SkillCategory) => c.skills.length > 0)
            .map((c: SkillCategory) => ({
              category: c.category,
              skills: c.skills.filter(s => !existingSkills.map(normalizeSkill).includes(normalizeSkill(s))),
            }))
            .filter((c: SkillCategory) => c.skills.length > 0);
        }
      }

      if (categories.length === 0) {
        categories = fallbackCategories(resolvedRole, existingSkills);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        categories,
        meta: { role: resolvedRole }
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate skills suggestions' },
      { status: 500 }
    );
  }
}
