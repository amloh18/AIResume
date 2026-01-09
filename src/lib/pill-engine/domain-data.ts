export interface DomainKnowledge {
    id: string;
    keywords: string[]; // for matching targetJobTitle
    mustHaveSkills: string[];
    powerVerbs: string[];
    metrics: string[]; // Generic description of metrics, or specific regex/keywords if refined later
    triggerInfo: string;
}

export const DOMAIN_KNOWLEDGE: DomainKnowledge[] = [
    {
        id: 'tech',
        keywords: ['software', 'developer', 'engineer', 'architect', 'stack', 'programmer', 'web'],
        mustHaveSkills: ['Git', 'CI/CD', 'AWS', 'Azure', 'Docker', 'Testing', 'Agile', 'API', 'Rest', 'React', 'Node', 'Python', 'Java', 'Kubernetes'],
        powerVerbs: ['Architected', 'Refactored', 'Deployed', 'Automated', 'Scaled', 'Debugged'],
        metrics: ['Uptime', 'Latency', 'Coverage', 'Velocity'],
        triggerInfo: "Avoid listing 'Microsoft Word'—it's assumed. Focus on your tech stack (e.g., React, Python, Kubernetes)."
    },
    {
        id: 'data',
        keywords: ['data', 'analyst', 'scientist', 'analytics', 'tableau', 'power bi', 'bi developer', 'etl'],
        mustHaveSkills: ['SQL', 'Python', 'R', 'Tableau', 'PowerBI', 'ETL', 'Statistics', 'Machine Learning', 'Modeling'],
        powerVerbs: ['Visualized', 'Forecasted', 'Cleaned', 'Modeled', 'Extracted', 'Interpreted'],
        metrics: ['Accuracy', 'Processing time', 'Adoption'],
        triggerInfo: "Data Analysts live by tools. Ensure you’ve specified *which* visualization tool you used (Tableau vs PowerBI)."
    },
    {
        id: 'finance',
        keywords: ['finance', 'accountant', 'accounting', 'auditor', 'controller', 'cpa', 'analyst'],
        mustHaveSkills: ['GAAP', 'P&L', 'Forecasting', 'Auditing', 'SAP', 'Oracle', 'Financial Modeling', 'Compliance'],
        powerVerbs: ['Reconciled', 'Audited', 'Allocated', 'Reduced', 'Analyzed'],
        metrics: ['Variance', 'Budget', 'Audit', 'Reporting speed'],
        triggerInfo: "Recruiters look for 'Reconciliation' and 'Compliance'. Make sure these appear in your experience bullets."
    },
    {
        id: 'marketing',
        keywords: ['marketing', 'seo', 'sem', 'content', 'social media', 'brand', 'growth', 'ppc', 'crm'],
        mustHaveSkills: ['SEO', 'SEM', 'Google Analytics', 'Content Strategy', 'CRM', 'PPC', 'Social Media'],
        powerVerbs: ['Spearheaded', 'Segmented', 'Optimized', 'Launched', 'Influenced'],
        metrics: ['ROAS', 'CTR', 'Conversion', 'Leads'],
        triggerInfo: "Marketing is all about results. If a bullet doesn't have a percentage (%) or dollar sign ($), it's considered weak."
    },
    {
        id: 'pm',
        keywords: ['project manager', 'product manager', 'program manager', 'scrum', 'agile', 'operations', 'logistics'],
        mustHaveSkills: ['Scrum', 'Kanban', 'Six Sigma', 'Logistics', 'Resource Planning', 'Jira', 'Agile', 'Waterfall'],
        powerVerbs: ['Orchestrated', 'Mitigated', 'Streamlined', 'Facilitated', 'Implemented'],
        metrics: ['Timeline', 'Budget', 'Stakeholders'],
        triggerInfo: "Highlight your methodology. Are you 'Agile' or 'Waterfall'? Mentioning the framework adds instant credibility."
    },
    {
        id: 'healthcare',
        keywords: ['nurse', 'nursing', 'doctor', 'medical', 'clinical', 'patient', 'health', 'rn', 'md'],
        mustHaveSkills: ['HIPAA', 'Patient Care', 'EHR', 'Epic', 'Cerner', 'ICU', 'ER', 'Triage', 'ACLS', 'BLS'],
        powerVerbs: ['Administered', 'Evaluated', 'Coordinated', 'Educated', 'Monitored'],
        metrics: ['Patient volume', 'Response time', 'Error reduction'],
        triggerInfo: "Certifications are king in healthcare. Ensure your BLS, ACLS, or specialized licenses are in the top 1/3 of the page."
    },
    {
        id: 'sales',
        keywords: ['sales', 'account executive', 'business development', 'sdr', 'ae', 'account manager'],
        mustHaveSkills: ['Salesforce', 'CRM', 'B2B', 'Cold Calling', 'Prospecting', 'Negotiation', 'Closing'],
        powerVerbs: ['Closed', 'Exceeded', 'Negotiated', 'Generated', 'Expanded', 'Won'],
        metrics: ['Revenue', 'Quota', 'Pipeline'],
        triggerInfo: "Sales resumes without 'Quota' numbers are often ignored. Mention if you were 'Top 5% of the team'."
    },
    {
        id: 'hr',
        keywords: ['human resources', 'hr', 'recruiter', 'talent', 'people', 'employee relations'],
        mustHaveSkills: ['ATS', 'Workday', 'Onboarding', 'Employee Relations', 'Labor Laws', 'DEI', 'Recruiting'],
        powerVerbs: ['Recruited', 'Mediated', 'Resolved', 'Standardized', 'Revamped'],
        metrics: ['Time-to-hire', 'Retention', 'Training completion'],
        triggerInfo: "Recruiting roles should mention the specific ATS (Applicant Tracking System) you've used previously."
    },
    {
        id: 'customer_success',
        keywords: ['customer success', 'csm', 'support', 'client success', 'onboarding'],
        mustHaveSkills: ['Zendesk', 'Intercom', 'Churn Reduction', 'NPS', 'SaaS', 'Upselling'],
        powerVerbs: ['Retained', 'Resolved', 'Advocated', 'Onboarded', 'Troubleshot'],
        metrics: ['CSAT', 'Churn', 'Renewal', 'Ticket volume'],
        triggerInfo: "Focus on 'Retention'. It’s more expensive to find a new customer than keep one—show how you kept them."
    },
    {
        id: 'design',
        keywords: ['designer', 'ui/ux', 'ux', 'ui', 'creative', 'art director', 'graphic'],
        mustHaveSkills: ['Figma', 'Adobe', 'Prototyping', 'Wireframing', 'User Research', 'Sketch', 'Photoshop'],
        powerVerbs: ['Wireframed', 'Iterated', 'Designed', 'Conceptualized', 'Prototyped'],
        metrics: ['Success rate', 'Adoption', 'Load time'],
        triggerInfo: "For UX/UI roles, your 'Skills' should differentiate between 'Visual Design' and 'Research/Logic'."
    },
    {
        id: 'education',
        keywords: ['teacher', 'educator', 'professor', 'tutor', 'curriculum', 'principal', 'academic'],
        mustHaveSkills: ['Pedagogy', 'Curriculum Dev', 'IEPs', 'EdTech', 'Classroom Mgmt', 'LMS'],
        powerVerbs: ['Facilitated', 'Mentored', 'Evaluated', 'Developed', 'Adapted'],
        metrics: ['Pass rates', 'Grants', 'Classroom size'],
        triggerInfo: "For academic roles, prioritize your 'Certifications' and 'Research' sections near the top."
    },
    {
        id: 'retail',
        keywords: ['retail', 'store manager', 'merchandiser', 'sales associate', 'cashier'],
        mustHaveSkills: ['Merchandising', 'Inventory Mgmt', 'POS', 'Loss Prevention', 'Visual Merchandising'],
        powerVerbs: ['Upsold', 'Stocked', 'Reconciled', 'Displayed', 'Coordinated'],
        metrics: ['Sales growth', 'Shrinkage', 'Customer count'],
        triggerInfo: "In retail, 'Customer Satisfaction' is your main KPI. Mention any awards or 'Employee of the Month' recognitions."
    },
    {
        id: 'construction',
        keywords: ['construction', 'civil engineer', 'site manager', 'foreman', 'surveyor'],
        mustHaveSkills: ['AutoCAD', 'OSHA', 'Blueprint Reading', 'Vendor Mgmt', 'Revit'],
        powerVerbs: ['Surveyed', 'Constructed', 'Estimated', 'Supervised', 'Inspected'],
        metrics: ['Budget', 'Safety record', 'Square footage'],
        triggerInfo: "Safety is the #1 priority for recruiters here. Ensure your 'OSHA-30' or 'PE License' is highlighted."
    },
    {
        id: 'legal',
        keywords: ['lawyer', 'attorney', 'paralegal', 'legal', 'litigation', 'counsel'],
        mustHaveSkills: ['Litigation', 'Case Mgmt', 'LexisNexis', 'E-Discovery', 'Legal Research', 'Drafting'],
        powerVerbs: ['Litigated', 'Drafted', 'Summarized', 'Filed', 'Documented'],
        metrics: ['Case volume', 'Billable hours', 'Accuracy'],
        triggerInfo: "Precision is key. Avoid flowery language; stick to professional, direct 'Legalese'."
    },
    {
        id: 'manufacturing',
        keywords: ['manufacturing', 'production', 'operator', 'assembler', 'quality', 'supply chain', 'warehouse'],
        mustHaveSkills: ['Lean Mfg', 'Supply Chain', 'ERP', 'SAP', 'Quality Assurance', 'Six Sigma', 'Logistics'],
        powerVerbs: ['Optimized', 'Dispatched', 'Fabricated', 'Inspected', 'assembled'],
        metrics: ['Cycle time', 'Accuracy', 'Throughput'],
        triggerInfo: "Focus on efficiency. Use verbs like 'Streamlined' to show how you saved time on the line."
    }
];
