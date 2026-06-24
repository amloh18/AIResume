import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';

export interface ModularCoverLetterGenerationParams {
    cvData: any;
    jobData: any;
    recipientName?: string;
    companyName?: string;
    promptOverride?: string;
    tone?: string;
    length?: string;
    creativity?: number;
    personalization?: number;
    skipExperience?: boolean;
    skipProjects?: boolean;
    mode?: 'manual' | 'assist' | 'full';
}

export const aiCoverLetterService = {
    async generateModularCoverLetter(params: ModularCoverLetterGenerationParams): Promise<{ structuredContent: any; legacyBody: string }> {
        const prompt = createCoverLetterPrompt(params);

        console.log('🤖 aiCoverLetterService - Generating modular cover letter with params:', {
            tone: params.tone,
            mode: params.mode,
            creativity: params.creativity
        });
        
        const generatedContent = await callGeminiWithAllKeysFallback(prompt);

        if (!generatedContent) {
            throw new Error('No content generated from AI');
        }

        const structuredContent = extractJsonFromResponse(generatedContent);

        if (!structuredContent) {
            console.error('❌ aiCoverLetterService - Failed to parse JSON:', generatedContent);
            throw new Error('Failed to parse generated content as JSON');
        }

        const legacyBody = formatLegacyBody(structuredContent);

        return {
            structuredContent,
            legacyBody
        };
    }
};

function createCoverLetterPrompt(params: ModularCoverLetterGenerationParams) {
    const {
        cvData,
        jobData,
        recipientName,
        companyName,
        promptOverride,
        tone = 'Professional',
        length = 'Medium',
        creativity = 50,
        personalization = 70,
        skipExperience = false,
        skipProjects = false,
        mode = 'assist'
    } = params;

    if (promptOverride) {
        const targetCompany = companyName || jobData?.company || 'Target Company';
        const targetLocation = jobData?.location || '';

        return `${promptOverride}

### Output JSON Format
You must return only valid JSON matching this schema:
{
  "header": { "recipient": "${recipientName || 'Hiring Manager'}", "company": "${targetCompany}", "location": "${targetLocation}" },
  "sections": {
    "introduction": { "title": "The Hook", "text": "[Generated Intro]" },
    "experience_bridge_1": { "title": "Key Skill 1", "jd_context": "[Requirement from JD]", "text": "[Persuasive Paragraph]" },
    "experience_bridge_2": { "title": "Key Skill 2", "jd_context": "[Requirement from JD]", "text": "[Persuasive Paragraph]" },
    "motivation": { "title": "Why This Role", "text": "[Generated Motivation]" },
    "closing": { "title": "Next Steps", "text": "[Generated Closing]" }
  },
  "metadata": { "primary_keywords": [], "tone": "${tone}" }
}`;
    }

    const cvJson = JSON.stringify(cvData).substring(0, 15000);
    const jdText = JSON.stringify(jobData).substring(0, 5000);
    const targetRole = jobData?.title || jobData?.jobTitle || 'Target Role';
    const targetCompany = companyName || jobData?.company || 'Target Company';
    const candidateName = cvData?.basics?.name || 'Candidate';

    return `Analyze the candidate's CV and the target Job Description to generate a modular cover letter.

### Input Context
- **Candidate Name:** ${candidateName}
- **Target Role:** ${targetRole}
- **Target Company:** ${targetCompany}
- **CV Context:** ${cvJson}
- **JD Context:** ${jdText}

### AI Writing Configuration
- **Tone:** ${tone} (e.g., Confident, Technical, Friendly)
- **Length:** ${length}
- **Creativity Level:** ${creativity}/100 (Higher means more expressive storytelling, lower means precise/formal)
- **Personalization Depth:** ${personalization}/100 (Higher means deeper integration of specific JD requirements)
- **Constraints:** ${skipExperience ? 'Avoid detailed work history. ' : ''}${skipProjects ? 'Avoid detailed project info. ' : ''}
- **Writing Mode:** ${mode}

### Generation Requirements
1. **Introduction:** Hook the recruiter by referencing the company mission and the candidate's specific enthusiasm.
2. **The Match:** Identify the strongest quantified achievements in the CV that solve specific JD requirements.
3. **Motivation:** Address cultural alignment and why the candidate is specifically excited about ${targetCompany}.
4. **Closing:** A bold Call to Action (CTA).
5. **Length Constraint:** The overall generated body text (the sum of the sections: introduction, experience_bridge_1, experience_bridge_2, motivation, closing) MUST be at least 1000 characters long, adhering to industry standards for thoroughness, detail, and professionalism. Do not write short placeholders or single-sentence paragraphs.

### Output JSON Format
You must return only valid JSON matching this schema:
{
  "header": {
    "recipient": "${recipientName || 'Hiring Manager'}",
    "company": "${targetCompany}",
    "location": "${jobData?.location || ''}"
  },
  "sections": {
    "introduction": {
      "title": "The Hook",
      "text": "[Generated Intro]"
    },
    "experience_bridge_1": {
      "title": "Key Skill 1",
      "jd_context": "[Requirement from JD]",
      "text": "[Persuasive Paragraph]"
    },
    "experience_bridge_2": {
      "title": "Key Skill 2",
      "jd_context": "[Requirement from JD]",
      "text": "[Persuasive Paragraph]"
    },
    "motivation": {
      "title": "Why This Role",
      "text": "[Generated Motivation]"
    },
    "closing": {
      "title": "Next Steps",
      "text": "[Generated Closing]"
    }
  },
  "metadata": {
    "primary_keywords": ["Keyword1", "Keyword2"],
    "tone": "${tone}",
    "match_quality": 85
  }
}`;
}

function extractJsonFromResponse(content: string): any {
    try {
        return JSON.parse(content);
    } catch (e) {
        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch (e2) { }
        }
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(cleanContent);
        } catch (e3) {
            return null;
        }
    }
}

function formatLegacyBody(structuredData: any): string {
    if (!structuredData?.sections) return '';
    const sections = structuredData.sections;
    const parts = [];

    if (sections.introduction?.text) parts.push(sections.introduction.text);
    if (sections.experience_bridge_1?.text) parts.push(sections.experience_bridge_1.text);
    if (sections.experience_bridge_2?.text) parts.push(sections.experience_bridge_2.text);
    if (sections.motivation?.text) parts.push(sections.motivation.text);
    if (sections.closing?.text) parts.push(sections.closing.text);

    return parts.join('\n\n');
}
