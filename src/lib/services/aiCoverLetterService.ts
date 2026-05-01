import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';

export interface ModularCoverLetterGenerationParams {
    cvData: any;
    jobData: any;
    recipientName?: string;
    companyName?: string;
    promptOverride?: string;
}

export const aiCoverLetterService = {
    async generateModularCoverLetter({
        cvData,
        jobData,
        recipientName,
        companyName,
        promptOverride
    }: ModularCoverLetterGenerationParams): Promise<{ structuredContent: any; legacyBody: string }> {
        const prompt = createCoverLetterPrompt({
            cvData,
            jobData,
            recipientName,
            companyName,
            promptOverride
        });

        console.log('🤖 aiCoverLetterService - Generating modular cover letter...');
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

function createCoverLetterPrompt({
    cvData,
    jobData,
    recipientName,
    companyName,
    promptOverride
}: {
    cvData: any;
    jobData: any;
    recipientName?: string;
    companyName?: string;
    promptOverride?: string;
}) {
    if (!promptOverride) {
        return createModularCoverLetterPrompt({
            cvData,
            jobData,
            recipientName,
            companyName
        });
    }

    const targetCompany = companyName || jobData?.company || 'Target Company';
    const targetLocation = jobData?.location || '';

    return `${promptOverride}

### Output JSON Format
You must return only valid JSON matching this schema:
{
  "header": {
    "recipient": "Hiring Manager",
    "company": "${targetCompany}",
    "location": "${targetLocation}"
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
    "tone": "Ambitious/Analytical"
  }
}`;
}

// --- Helper Functions (Logic moved from previously modified route) ---

function extractJsonFromResponse(content: string): any {
    try {
        return JSON.parse(content);
    } catch (e) {
        const jsonMatch = content.match(/```json([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1].trim());
            } catch (e2) {
                // Continue
            }
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

function calculateExperienceLevel(cvData: any): 'Senior' | 'Mid-Level' | 'Junior' {
    if (!cvData?.work || cvData.work.length === 0) return 'Junior';
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
                if (monthsDiff > 0) totalMonths += monthsDiff;
            } catch (e) { }
        }
    });
    const totalYears = totalMonths / 12;
    if (totalYears >= 7) return 'Senior';
    if (totalYears >= 3) return 'Mid-Level';
    return 'Junior';
}

function createModularCoverLetterPrompt({
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
    const cvJson = JSON.stringify(cvData).substring(0, 15000);
    const jdText = JSON.stringify(jobData).substring(0, 5000);
    const targetRole = jobData?.title || jobData?.jobTitle || 'Target Role';
    const targetCompany = companyName || jobData?.company || 'Target Company';
    const candidateName = cvData?.basics?.name || 'Candidate';

    return `Analyze the candidate's CV and the target Job Description to generate a modular cover letter.

### Input Data
- **Candidate Name:** ${candidateName}
- **Target Role:** ${targetRole}
- **Target Company:** ${targetCompany}
- **CV Context:** ${cvJson}
- **JD Context:** ${jdText}

### Generation Requirements
1. **Introduction:** Hook the recruiter by referencing the company mission and the candidate's specific enthusiasm.
2. **The Match (Strategic Bridges):** Identify the two strongest quantified achievements in the CV that solve specific JD requirements.
3. **Motivation:** Address the cultural alignment or specific motivation for this role/company.
4. **Closing:** A bold Call to Action (CTA).

### Output JSON Format
You must return only valid JSON matching this schema:
{
  "header": {
    "recipient": "Hiring Manager",
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
    "tone": "Ambitious/Analytical"
  }
}`;
}
