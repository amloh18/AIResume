"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNormalizedSkills = extractNormalizedSkills;
const SKILL_TAXONOMY = [
    { canonical: 'JavaScript', aliases: /\b(javascript|js|es6|ecmascript)\b/i },
    { canonical: 'TypeScript', aliases: /\b(typescript|ts)\b/i },
    { canonical: 'React', aliases: /\b(react|react\.js|reactjs)\b/i },
    { canonical: 'Node.js', aliases: /\b(node|node\.js|nodejs)\b/i },
    { canonical: 'Next.js', aliases: /\b(next|next\.js|nextjs)\b/i },
    { canonical: 'Python', aliases: /\b(python|py|django|fastapi|flask)\b/i },
    { canonical: 'Go', aliases: /\b(golang|go)\b/i },
    { canonical: 'Rust', aliases: /\b(rust|rustlang)\b/i },
    { canonical: 'Java', aliases: /\b(java|spring boot|spring)\b/i },
    { canonical: 'C#', aliases: /\b(c#|\.net|dotnet)\b/i },
    { canonical: 'C++', aliases: /\b(c\+\+)\b/i },
    { canonical: 'SQL', aliases: /\b(sql|relational database)\b/i },
    { canonical: 'PostgreSQL', aliases: /\b(postgres|postgresql)\b/i },
    { canonical: 'MongoDB', aliases: /\b(mongo|mongodb|nosql)\b/i },
    { canonical: 'Redis', aliases: /\b(redis)\b/i },
    { canonical: 'AWS', aliases: /\b(aws|amazon web services|ec2|s3|lambda)\b/i },
    { canonical: 'GCP', aliases: /\b(gcp|google cloud)\b/i },
    { canonical: 'Azure', aliases: /\b(azure|microsoft cloud)\b/i },
    { canonical: 'Docker', aliases: /\b(docker|containers)\b/i },
    { canonical: 'Kubernetes', aliases: /\b(kubernetes|k8s)\b/i },
    { canonical: 'GraphQL', aliases: /\b(graphql|apollo)\b/i },
    { canonical: 'REST API', aliases: /\b(rest|restful|rest api)\b/i },
    { canonical: 'Machine Learning', aliases: /\b(machine learning|ml|deep learning|nlp|llm|generative ai)\b/i },
    { canonical: 'PyTorch', aliases: /\b(pytorch)\b/i },
    { canonical: 'TensorFlow', aliases: /\b(tensorflow|tf)\b/i },
    { canonical: 'Tailwind CSS', aliases: /\b(tailwind|tailwindcss)\b/i },
    { canonical: 'CI/CD', aliases: /\b(ci\/cd|github actions|gitlab ci|jenkins)\b/i },
    { canonical: 'Product Management', aliases: /\b(product management|product strategy|roadmapping)\b/i },
    { canonical: 'Agile/Scrum', aliases: /\b(agile|scrum|kanban|sprints)\b/i },
];
function extractNormalizedSkills(title, description) {
    const combinedText = `${title} ${description}`;
    const matchedSkills = new Set();
    for (const item of SKILL_TAXONOMY) {
        if (item.aliases.test(combinedText)) {
            matchedSkills.add(item.canonical);
        }
    }
    return Array.from(matchedSkills);
}
//# sourceMappingURL=normalizeSkills.js.map