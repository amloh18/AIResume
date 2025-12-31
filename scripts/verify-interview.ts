
import { InterviewCoachService } from '../src/lib/services/interviewCoachService';
import { SkillGapAnalysisService } from '../src/lib/services/skillGapAnalysisService';
import dotenv from 'dotenv';
import { UnifiedCVDataStructure } from '../src/types/unified-cv-schema';

dotenv.config({ path: '.env.local' });

// Mock SkillGapAnalysisService to avoid DB/server-only issues
SkillGapAnalysisService.analyzeSkillGap = async () => {
    return {
        categories: [
            { id: 'backend', name: 'Backend', skills: [{ name: 'Node.js', priority: 'critical' }] }
        ],
        summary: 'Mock Summary',
        overallMatch: 80
    } as any;
};

async function verifyInterviewGeneration() {
    try {
        console.log('🚀 Starting Interview Plan Generation (Mocked DB)...');

        // Mock Data
        const jobTitle = "Senior Frontend Engineer";
        const company = "Tech Corp";
        const jobDescription = "We are looking for a Senior Frontend Engineer with React, TypeScript, and Node.js experience.";
        const cvData: UnifiedCVDataStructure = {
            basics: {
                name: "John Doe",
                email: "john@example.com",
                label: "Frontend Engineer"
            },
            work: [
                {
                    name: "Old Corp",
                    position: "Frontend Developer",
                    startDate: "2020-01-01",
                    highlights: ["Built React apps", "Optimized performance"]
                }
            ],
            skills: [
                { name: "React", level: "Senior" },
                { name: "TypeScript", level: "Senior" }
            ]
        } as any;

        const startTime = Date.now();

        const plan = await InterviewCoachService.generateInterviewPlan(
            jobDescription,
            cvData,
            jobTitle,
            company
        );

        const duration = Date.now() - startTime;
        console.log(`✅ Generation completed in ${duration}ms`);

        console.log('\n--- Modules ---');
        plan.modules.forEach(m => console.log(`- [${m.type}] ${m.title} (ID: ${m.id})`));

        console.log(`\n--- Questions (${plan.questions.length}) ---`);
        plan.questions.slice(0, 3).forEach(q => {
            console.log(`\nQ: ${q.content.question}`);
            console.log(`   Type: ${q.content.tags?.join(', ')}`);
            console.log(`   Context: ${q.content.whyAsked}`);
        });

        if (plan.modules.length > 0 && plan.questions.length > 0) {
            console.log('\n✅ VERIFICATION SUCCESS: Structure looks correct.');
        } else {
            console.error('\n❌ VERIFICATION FAILED: Empty modules or questions.');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ VERIFICATION ERROR:', error);
        console.error(error);
        process.exit(1);
    }
}

verifyInterviewGeneration();
