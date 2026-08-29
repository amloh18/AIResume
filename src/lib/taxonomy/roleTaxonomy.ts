/**
 * Role Taxonomy
 *
 * Server-side, maintainable configuration for job role families.
 * Used by: query normalization, candidate retrieval, demand tracking, scoring.
 *
 * Each family defines:
 * - primary: exact titles that are direct matches
 * - related: close variants (e.g., "Technical Support" for IT_SUPPORT)
 * - adjacent: broader roles that may interest the same candidates
 * - keywords: searchable terms that map to this family
 * - skills: commonly associated skills
 * - category: grouping for admin UI
 */

export interface RoleFamily {
  id: string;
  label: string;
  primary: string[];
  related: string[];
  adjacent: string[];
  keywords: string[];
  skills: string[];
  category: string;
}

function p(...titles: string[]): string[] {
  return titles.map((t) => t.toLowerCase());
}

export const ROLE_TAXONOMY: Record<string, RoleFamily> = {
  // ── Software & Tech ────────────────────────────────────────────────────
  SOFTWARE_ENGINEERING: {
    id: 'SOFTWARE_ENGINEERING',
    label: 'Software Engineering',
    primary: p('Software Engineer', 'Software Developer', 'Full Stack Developer', 'Full Stack Engineer'),
    related: p('Application Developer', 'Systems Developer', 'Platform Engineer', 'Web Developer'),
    adjacent: p('DevOps Engineer', 'Site Reliability Engineer', 'Data Engineer'),
    keywords: p('developer', 'programmer', 'coder', 'swe', 'fullstack', 'full-stack'),
    skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'React', 'Node.js', 'SQL'],
    category: 'engineering',
  },
  FRONTEND: {
    id: 'FRONTEND',
    label: 'Frontend Engineering',
    primary: p('Frontend Engineer', 'Frontend Developer', 'UI Engineer', 'React Developer', 'Web Developer'),
    related: p('Front-End Engineer', 'Front-End Developer', 'JavaScript Developer', 'Vue Developer', 'Angular Developer'),
    adjacent: p('Full Stack Developer', 'UI/UX Developer', 'Mobile Developer'),
    keywords: p('frontend', 'front-end', 'react', 'vue', 'angular', 'svelte', 'ui', 'css', 'html'),
    skills: ['React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS', 'Next.js'],
    category: 'engineering',
  },
  BACKEND: {
    id: 'BACKEND',
    label: 'Backend Engineering',
    primary: p('Backend Engineer', 'Backend Developer', 'Server-Side Developer', 'API Engineer'),
    related: p('Back-End Engineer', 'Back-End Developer', 'Systems Programmer', 'Java Developer', 'Python Developer', 'Go Developer'),
    adjacent: p('Full Stack Developer', 'Platform Engineer', 'Data Engineer'),
    keywords: p('backend', 'back-end', 'api', 'server', 'microservices', 'rest', 'grpc'),
    skills: ['Node.js', 'Python', 'Java', 'Go', 'Rust', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker'],
    category: 'engineering',
  },
  FULLSTACK: {
    id: 'FULLSTACK',
    label: 'Full Stack Development',
    primary: p('Full Stack Developer', 'Full Stack Engineer', 'Full-Stack Developer', 'Full-Stack Engineer'),
    related: p('Software Engineer', 'Web Developer', 'Application Developer'),
    adjacent: p('Frontend Developer', 'Backend Developer'),
    keywords: p('full stack', 'fullstack', 'full-stack', 'fullstack developer', 'generalist'),
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'MongoDB', 'Docker'],
    category: 'engineering',
  },
  DEVOPS: {
    id: 'DEVOPS',
    label: 'DevOps / Cloud / SRE',
    primary: p('DevOps Engineer', 'Site Reliability Engineer', 'SRE', 'Platform Engineer', 'Cloud Engineer'),
    related: p('Infrastructure Engineer', 'Systems Engineer', 'Release Engineer', 'Cloud Architect'),
    adjacent: p('Security Engineer', 'Data Engineer', 'Backend Engineer'),
    keywords: p('devops', 'sre', 'reliability', 'infrastructure', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'terraform'),
    skills: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Linux', 'Python', 'Bash'],
    category: 'engineering',
  },
  MOBILE: {
    id: 'MOBILE',
    label: 'Mobile Development',
    primary: p('Mobile Developer', 'iOS Developer', 'Android Developer', 'React Native Developer', 'Flutter Developer'),
    related: p('Mobile Engineer', 'iOS Engineer', 'Android Engineer', 'Cross-Platform Developer'),
    adjacent: p('Frontend Developer', 'Software Engineer'),
    keywords: p('mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'xamarin'),
    skills: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'iOS', 'Android', 'TypeScript', 'Dart'],
    category: 'engineering',
  },
  QA: {
    id: 'QA',
    label: 'Quality Assurance',
    primary: p('QA Engineer', 'Quality Assurance Engineer', 'Test Engineer', 'SDET', 'QA Analyst'),
    related: p('Automation Engineer', 'QA Lead', 'Software Development Engineer in Test', 'Performance Tester'),
    adjacent: p('DevOps Engineer', 'Software Engineer'),
    keywords: p('qa', 'quality assurance', 'testing', 'sdet', 'automation', 'test engineer', 'regression'),
    skills: ['Selenium', 'Cypress', 'Playwright', 'Jest', 'pytest', 'Postman', 'JIRA', 'Test Automation'],
    category: 'engineering',
  },
  SECURITY: {
    id: 'SECURITY',
    label: 'Cybersecurity',
    primary: p('Security Engineer', 'Cybersecurity Engineer', 'Information Security Engineer', 'Application Security Engineer'),
    related: p('Security Analyst', 'Penetration Tester', 'Security Consultant', 'SOC Analyst'),
    adjacent: p('DevOps Engineer', 'Backend Engineer'),
    keywords: p('security', 'cybersecurity', 'infosec', 'appsec', 'penetration', 'vulnerability', 'owasp'),
    skills: ['OWASP', 'Penetration Testing', 'SIEM', 'Python', 'Linux', 'Network Security', 'Encryption', 'OAuth'],
    category: 'engineering',
  },

  // ── Data & AI ──────────────────────────────────────────────────────────
  DATA_SCIENCE: {
    id: 'DATA_SCIENCE',
    label: 'Data Science',
    primary: p('Data Scientist', 'Senior Data Scientist', 'Research Scientist', 'Applied Scientist'),
    related: p('Machine Learning Scientist', 'Quantitative Analyst', 'Statistical Analyst'),
    adjacent: p('Data Analyst', 'ML Engineer', 'Analytics Engineer'),
    keywords: p('data science', 'machine learning', 'statistics', 'research', 'analytics', 'modeling'),
    skills: ['Python', 'R', 'SQL', 'TensorFlow', 'PyTorch', 'Pandas', 'Scikit-learn', 'Statistics', 'A/B Testing'],
    category: 'data',
  },
  DATA_ENGINEERING: {
    id: 'DATA_ENGINEERING',
    label: 'Data Engineering',
    primary: p('Data Engineer', 'Senior Data Engineer', 'ETL Developer', 'Data Platform Engineer'),
    related: p('Analytics Engineer', 'Big Data Engineer', 'Data Infrastructure Engineer'),
    adjacent: p('Data Scientist', 'Backend Engineer', 'DevOps Engineer'),
    keywords: p('data engineering', 'etl', 'pipeline', 'spark', 'kafka', 'airflow', 'dbt', 'data warehouse'),
    skills: ['Python', 'SQL', 'Apache Spark', 'Kafka', 'Airflow', 'dbt', 'Snowflake', 'Databricks', 'AWS'],
    category: 'data',
  },
  DATA_ANALYTICS: {
    id: 'DATA_ANALYTICS',
    label: 'Data Analytics',
    primary: p('Data Analyst', 'Business Intelligence Analyst', 'BI Analyst', 'Reporting Analyst'),
    related: p('Analytics Analyst', 'Product Analyst', 'Business Analyst', 'Operations Analyst'),
    adjacent: p('Data Scientist', 'Data Engineer', 'Product Manager'),
    keywords: p('data analyst', 'business analyst', 'bi analyst', 'reporting', 'analytics', 'dashboard'),
    skills: ['SQL', 'Excel', 'Tableau', 'Power BI', 'Looker', 'Python', 'R', 'Google Analytics'],
    category: 'data',
  },
  ML_ENGINEERING: {
    id: 'ML_ENGINEERING',
    label: 'Machine Learning Engineering',
    primary: p('Machine Learning Engineer', 'ML Engineer', 'AI Engineer'),
    related: p('Deep Learning Engineer', 'NLP Engineer', 'Computer Vision Engineer'),
    adjacent: p('Data Scientist', 'Data Engineer', 'Backend Engineer'),
    keywords: p('machine learning', 'ml', 'ai', 'deep learning', 'nlp', 'computer vision', 'mlops'),
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'MLflow', 'Kubeflow', 'Docker', 'Kubernetes'],
    category: 'data',
  },

  // ── Product & Project ──────────────────────────────────────────────────
  PRODUCT_MANAGEMENT: {
    id: 'PRODUCT_MANAGEMENT',
    label: 'Product Management',
    primary: p('Product Manager', 'Senior Product Manager', 'Staff Product Manager', 'Product Owner'),
    related: p('Technical Product Manager', 'Group Product Manager', 'Product Lead', 'Director of Product'),
    adjacent: p('Project Manager', 'UX Designer', 'Engineering Manager'),
    keywords: p('product manager', 'product owner', 'pm', 'product lead', 'product strategy', 'roadmap'),
    skills: ['Roadmapping', 'User Research', 'Data Analysis', 'A/B Testing', 'SQL', 'JIRA', 'Figma'],
    category: 'product',
  },
  PROJECT_MANAGEMENT: {
    id: 'PROJECT_MANAGEMENT',
    label: 'Project Management',
    primary: p('Project Manager', 'Senior Project Manager', 'Program Manager', 'Delivery Manager'),
    related: p('Scrum Master', 'Engagement Manager', 'Technical Program Manager'),
    adjacent: p('Product Manager', 'Engineering Manager'),
    keywords: p('project manager', 'program manager', 'scrum master', 'delivery', 'agile', 'pmp'),
    skills: ['Agile', 'Scrum', 'JIRA', 'Risk Management', 'Stakeholder Management', 'Budgeting'],
    category: 'product',
  },

  // ── Design & Creative ──────────────────────────────────────────────────
  UX_DESIGN: {
    id: 'UX_DESIGN',
    label: 'UX Design',
    primary: p('UX Designer', 'User Experience Designer', 'UX Researcher', 'Interaction Designer'),
    related: p('UX/UI Designer', 'User Interface Designer', 'Usability Analyst'),
    adjacent: p('Product Designer', 'UI Designer', 'Product Manager'),
    keywords: p('ux', 'user experience', 'usability', 'wireframe', 'prototype', 'user research'),
    skills: ['Figma', 'Sketch', 'Adobe XD', 'User Research', 'Wireframing', 'Prototyping', 'Usability Testing'],
    category: 'design',
  },
  UI_DESIGN: {
    id: 'UI_DESIGN',
    label: 'UI Design',
    primary: p('UI Designer', 'Visual Designer', 'User Interface Designer'),
    related: p('Graphic Designer', 'Digital Designer', 'Brand Designer'),
    adjacent: p('UX Designer', 'Product Designer', 'Frontend Developer'),
    keywords: p('ui', 'visual design', 'graphic design', 'interface', 'brand', 'layout'),
    skills: ['Figma', 'Photoshop', 'Illustrator', 'Sketch', 'Adobe XD', 'CSS', 'Design Systems'],
    category: 'design',
  },
  PRODUCT_DESIGN: {
    id: 'PRODUCT_DESIGN',
    label: 'Product Design',
    primary: p('Product Designer', 'Senior Product Designer', 'Design Lead'),
    related: p('UX/UI Designer', 'UX Designer', 'UI Designer'),
    adjacent: p('Product Manager', 'Frontend Developer'),
    keywords: p('product designer', 'design lead', 'head of design'),
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Interaction Design', 'CSS'],
    category: 'design',
  },

  // ── Marketing & Growth ─────────────────────────────────────────────────
  DIGITAL_MARKETING: {
    id: 'DIGITAL_MARKETING',
    label: 'Digital Marketing',
    primary: p('Digital Marketing Manager', 'Digital Marketing Specialist', 'Online Marketing Manager'),
    related: p('Marketing Manager', 'Marketing Specialist', 'Performance Marketer'),
    adjacent: p('Content Marketer', 'SEO Specialist', 'Growth Marketer'),
    keywords: p('digital marketing', 'online marketing', 'marketing manager', 'advertising', 'campaign'),
    skills: ['Google Ads', 'Facebook Ads', 'SEO', 'Google Analytics', 'HubSpot', 'Email Marketing'],
    category: 'marketing',
  },
  CONTENT_MARKETING: {
    id: 'CONTENT_MARKETING',
    label: 'Content Marketing',
    primary: p('Content Marketer', 'Content Marketing Manager', 'Content Strategist'),
    related: p('Copywriter', 'Content Writer', 'Blog Writer'),
    adjacent: p('SEO Specialist', 'Social Media Manager', 'Digital Marketing'),
    keywords: p('content', 'copywriting', 'blog', 'editorial', 'content strategy'),
    skills: ['SEO', 'WordPress', 'Copywriting', 'Content Strategy', 'Social Media', 'Google Analytics'],
    category: 'marketing',
  },
  SEO: {
    id: 'SEO',
    label: 'SEO',
    primary: p('SEO Specialist', 'SEO Manager', 'Search Engine Optimization Specialist'),
    related: p('SEO Analyst', 'Organic Search Manager', 'Technical SEO Specialist'),
    adjacent: p('Digital Marketing', 'Content Marketer', 'Growth Marketer'),
    keywords: p('seo', 'search engine optimization', 'organic search', 'serp', 'backlink'),
    skills: ['Google Search Console', 'Ahrefs', 'SEMrush', 'Screaming Frog', 'Google Analytics', 'HTML'],
    category: 'marketing',
  },
  GROWTH_MARKETING: {
    id: 'GROWTH_MARKETING',
    label: 'Growth Marketing',
    primary: p('Growth Marketer', 'Growth Marketing Manager', 'Growth Hacker'),
    related: p('Performance Marketer', 'Marketing Analyst', 'Conversion Rate Optimizer'),
    adjacent: p('Product Manager', 'Data Analyst', 'Digital Marketing'),
    keywords: p('growth', 'growth marketing', 'growth hacking', 'conversion', 'a/b testing', 'funnel'),
    skills: ['A/B Testing', 'SQL', 'Google Analytics', 'Python', 'Mixpanel', 'Amplitude', 'HubSpot'],
    category: 'marketing',
  },

  // ── Sales & Customer Success ───────────────────────────────────────────
  SALES: {
    id: 'SALES',
    label: 'Sales',
    primary: p('Sales Manager', 'Sales Representative', 'Account Executive', 'Business Development Manager'),
    related: p('Sales Lead', 'Enterprise Sales', 'Solutions Consultant', 'Sales Executive'),
    adjacent: p('Account Manager', 'Customer Success Manager'),
    keywords: p('sales', 'account executive', 'business development', 'b2b', 'saas sales', 'revenue'),
    skills: ['Salesforce', 'CRM', 'Negotiation', 'Cold Calling', 'Pipeline Management', 'HubSpot'],
    category: 'sales',
  },
  ACCOUNT_EXECUTIVE: {
    id: 'ACCOUNT_EXECUTIVE',
    label: 'Account Management',
    primary: p('Account Executive', 'Account Manager', 'Key Account Manager'),
    related: p('Client Manager', 'Relationship Manager', 'Enterprise Account Executive'),
    adjacent: p('Sales Manager', 'Customer Success Manager'),
    keywords: p('account executive', 'account manager', 'key account', 'client management'),
    skills: ['Salesforce', 'CRM', 'Relationship Management', 'Upselling', 'Contract Negotiation'],
    category: 'sales',
  },
  CUSTOMER_SUCCESS: {
    id: 'CUSTOMER_SUCCESS',
    label: 'Customer Success',
    primary: p('Customer Success Manager', 'Customer Success Lead', 'CS Manager'),
    related: p('Client Success Manager', 'Customer Experience Manager'),
    adjacent: p('Account Manager', 'Support Engineer', 'Product Manager'),
    keywords: p('customer success', 'client success', 'retention', 'onboarding', 'churn'),
    skills: ['Salesforce', 'Intercom', 'Zendesk', 'Data Analysis', 'Communication', 'Problem Solving'],
    category: 'sales',
  },
  CUSTOMER_SUPPORT: {
    id: 'CUSTOMER_SUPPORT',
    label: 'Customer Support',
    primary: p('Customer Support Specialist', 'Customer Support Representative', 'Support Agent'),
    related: p('Technical Support Specialist', 'Help Desk Analyst', 'Client Support'),
    adjacent: p('Customer Success Manager', 'IT Support'),
    keywords: p('customer support', 'client support', 'help desk', 'support agent', 'ticketing'),
    skills: ['Zendesk', 'Intercom', 'Freshdesk', 'Communication', 'Problem Solving', 'Empathy'],
    category: 'support',
  },

  // ── Operations & Finance ───────────────────────────────────────────────
  OPERATIONS: {
    id: 'OPERATIONS',
    label: 'Operations',
    primary: p('Operations Manager', 'Operations Analyst', 'Business Operations Manager'),
    related: p('Chief Operating Officer', 'COO', 'Operations Director', 'Process Improvement Manager'),
    adjacent: p('Project Manager', 'Finance Manager', 'HR Manager'),
    keywords: p('operations', 'business operations', 'process improvement', 'efficiency', 'supply chain'),
    skills: ['Excel', 'SQL', 'Process Improvement', 'Lean', 'Six Sigma', 'Project Management'],
    category: 'operations',
  },
  FINANCE: {
    id: 'FINANCE',
    label: 'Finance',
    primary: p('Financial Analyst', 'Finance Manager', 'Senior Financial Analyst'),
    related: p('FP&A Analyst', 'Treasury Analyst', 'Investment Analyst'),
    adjacent: p('Accountant', 'Operations Manager', 'Data Analyst'),
    keywords: p('finance', 'financial analyst', 'fp&a', 'budgeting', 'forecasting', 'accounting'),
    skills: ['Excel', 'Financial Modeling', 'SQL', 'SAP', 'Oracle', 'GAAP', 'IFRS'],
    category: 'operations',
  },
  ACCOUNTING: {
    id: 'ACCOUNTING',
    label: 'Accounting',
    primary: p('Accountant', 'Senior Accountant', 'Chartered Accountant', 'CPA'),
    related: p('Accounts Payable', 'Accounts Receivable', 'Audit Manager', 'Tax Specialist'),
    adjacent: p('Financial Analyst', 'Finance Manager'),
    keywords: p('accounting', 'accountant', 'cpa', 'audit', 'tax', 'bookkeeping', 'ledger'),
    skills: ['QuickBooks', 'SAP', 'Excel', 'GAAP', 'IFRS', 'Tax Preparation', 'Audit'],
    category: 'operations',
  },

  // ── HR & Recruiting ────────────────────────────────────────────────────
  HR: {
    id: 'HR',
    label: 'Human Resources',
    primary: p('HR Manager', 'HR Specialist', 'Human Resources Manager', 'People Operations Manager'),
    related: p('HR Business Partner', 'HR Director', 'People Manager'),
    adjacent: p('Recruiter', 'Talent Acquisition', 'Training Manager'),
    keywords: p('hr', 'human resources', 'people operations', 'employee relations', 'compensation'),
    skills: ['HRIS', 'Workday', 'BambooHR', 'Recruitment', 'Employee Relations', 'Compliance'],
    category: 'hr',
  },
  RECRUITING: {
    id: 'RECRUITING',
    label: 'Recruiting',
    primary: p('Recruiter', 'Technical Recruiter', 'Talent Acquisition Specialist'),
    related: p('Recruitment Consultant', 'Head of Talent', 'Sourcing Specialist'),
    adjacent: p('HR Manager', 'People Operations'),
    keywords: p('recruiter', 'recruiting', 'talent acquisition', 'sourcing', 'hiring'),
    skills: ['LinkedIn Recruiter', 'Greenhouse', 'Lever', 'ATS', 'Boolean Search', 'Sourcing'],
    category: 'hr',
  },

  // ── Support (IT) ───────────────────────────────────────────────────────
  IT_SUPPORT: {
    id: 'IT_SUPPORT',
    label: 'IT Support',
    primary: p('IT Support', 'IT Support Engineer', 'IT Support Specialist', 'IT Help Desk'),
    related: p(
      'Technical Support', 'Technical Support Engineer', 'Service Desk Analyst',
      'Desktop Support', 'Helpdesk Technician', 'Application Support',
      'Systems Support', 'IT Operations Support'
    ),
    adjacent: p(
      'Customer Technical Support', 'Technical Account Manager',
      'IT Operations Analyst', 'Network Support Engineer'
    ),
    keywords: p(
      'helpdesk', 'help desk', 'desktop support', '1st line', '2nd line', '3rd line',
      'it support', 'technical support', 'service desk', 'incident management'
    ),
    skills: ['Active Directory', 'Microsoft 365', 'Windows', 'Networking', 'Ticketing', 'TCP/IP', 'DNS', 'DHCP'],
    category: 'support',
  },
  DESKTOP_SUPPORT: {
    id: 'DESKTOP_SUPPORT',
    label: 'Desktop Support',
    primary: p('Desktop Support Engineer', 'Desktop Support Technician', 'Field Support Engineer'),
    related: p('IT Support Engineer', 'Hardware Technician', 'Workplace Support'),
    adjacent: p('IT Support', 'Network Support', 'Systems Administrator'),
    keywords: p('desktop support', 'hardware', 'workplace', 'break fix', 'imaging'),
    skills: ['Windows', 'macOS', 'Active Directory', 'Hardware Troubleshooting', 'Imaging', 'SCCM'],
    category: 'support',
  },
  SERVICE_DESK: {
    id: 'SERVICE_DESK',
    label: 'Service Desk',
    primary: p('Service Desk Analyst', 'Service Desk Engineer', 'Service Desk Manager'),
    related: p('IT Support Analyst', 'Help Desk Analyst', 'Incident Manager'),
    adjacent: p('IT Support', 'IT Operations', 'Change Manager'),
    keywords: p('service desk', 'itsm', 'incident', 'change management', 'itil'),
    skills: ['ITIL', 'ServiceNow', 'JIRA Service Desk', 'Incident Management', 'Change Management'],
    category: 'support',
  },
  NETWORK_SUPPORT: {
    id: 'NETWORK_SUPPORT',
    label: 'Network Support',
    primary: p('Network Support Engineer', 'Network Engineer', 'Network Administrator'),
    related: p('Network Analyst', 'Telecom Engineer', 'Infrastructure Engineer'),
    adjacent: p('IT Support', 'DevOps Engineer', 'Systems Administrator'),
    keywords: p('network', 'cisco', 'firewall', 'router', 'switch', 'vpn', 'lan', 'wan'),
    skills: ['Cisco', 'Juniper', 'Firewall', 'TCP/IP', 'DNS', 'VPN', 'MPLS', 'LAN', 'WAN'],
    category: 'support',
  },

  // ── Additional Engineering ─────────────────────────────────────────────
  DATA_PLATFORM: {
    id: 'DATA_PLATFORM',
    label: 'Data Platform',
    primary: p('Data Platform Engineer', 'Data Infrastructure Engineer'),
    related: p('Data Engineer', 'Analytics Engineer'),
    adjacent: p('Backend Engineer', 'DevOps Engineer'),
    keywords: p('data platform', 'data infrastructure', 'data lake', 'data warehouse'),
    skills: ['Spark', 'Kafka', 'Airflow', 'Snowflake', 'Databricks', 'AWS', 'Python', 'SQL'],
    category: 'data',
  },
  EMBEDDED_SYSTEMS: {
    id: 'EMBEDDED_SYSTEMS',
    label: 'Embedded Systems',
    primary: p('Embedded Systems Engineer', 'Embedded Software Engineer', 'Firmware Engineer'),
    related: p('IoT Engineer', 'Hardware Engineer', 'Real-Time Systems Engineer'),
    adjacent: p('Software Engineer', 'Systems Engineer'),
    keywords: p('embedded', 'firmware', 'iot', 'microcontroller', 'rtos', 'c++', 'rust'),
    skills: ['C', 'C++', 'Rust', 'RTOS', 'ARM', 'Linux', 'SPI', 'I2C', 'UART'],
    category: 'engineering',
  },
  GAME_DEVELOPMENT: {
    id: 'GAME_DEVELOPMENT',
    label: 'Game Development',
    primary: p('Game Developer', 'Game Programmer', 'Gameplay Engineer'),
    related: p('Unity Developer', 'Unreal Developer', 'Graphics Programmer'),
    adjacent: p('Software Engineer', 'Graphics Engineer'),
    keywords: p('game', 'unity', 'unreal', 'gameplay', 'graphics', 'shader'),
    skills: ['Unity', 'Unreal Engine', 'C#', 'C++', 'Python', 'Graphics Programming', 'Physics'],
    category: 'engineering',
  },

  // ── Additional Business ────────────────────────────────────────────────
  BUSINESS_ANALYST: {
    id: 'BUSINESS_ANALYST',
    label: 'Business Analysis',
    primary: p('Business Analyst', 'Senior Business Analyst', 'Systems Analyst'),
    related: p('Requirements Analyst', 'Process Analyst', 'Functional Analyst'),
    adjacent: p('Data Analyst', 'Product Manager', 'Project Manager'),
    keywords: p('business analyst', 'requirements', 'use case', 'stakeholder', 'process mapping'),
    skills: ['SQL', 'Excel', 'JIRA', 'Confluence', 'UML', 'BPMN', 'Data Analysis'],
    category: 'product',
  },
  TECHNICAL_WRITER: {
    id: 'TECHNICAL_WRITER',
    label: 'Technical Writing',
    primary: p('Technical Writer', 'Technical Documentation Specialist', 'API Writer'),
    related: p('Content Developer', 'Information Developer', 'Technical Communicator'),
    adjacent: p('Product Manager', 'Developer Advocate'),
    keywords: p('technical writer', 'documentation', 'api docs', 'knowledge base'),
    skills: ['Markdown', 'Git', 'API Documentation', 'DITA', 'MadCap Flare', 'Confluence'],
    category: 'product',
  },
  DEVELOPER_ADVOCATE: {
    id: 'DEVELOPER_ADVOCATE',
    label: 'Developer Advocacy',
    primary: p('Developer Advocate', 'Developer Relations Engineer', 'DevRel Engineer'),
    related: p('Developer Evangelist', 'Community Manager', 'Technical Community Manager'),
    adjacent: p('Technical Writer', 'Product Manager', 'Software Engineer'),
    keywords: p('developer advocate', 'devrel', 'developer relations', 'community', 'evangelist'),
    skills: ['Public Speaking', 'Technical Writing', 'JavaScript', 'Python', 'Social Media', 'Community Building'],
    category: 'engineering',
  },
};

// ── Utility functions ───────────────────────────────────────────────────────

const _familyLookupCache = new Map<string, string>();

/**
 * Build a reverse lookup: normalized title/keyword → roleFamily ID
 */
function buildLookup(): Map<string, string> {
  if (_familyLookupCache.size > 0) return _familyLookupCache;

  for (const [familyId, family] of Object.entries(ROLE_TAXONOMY)) {
    for (const title of family.primary) {
      _familyLookupCache.set(title, familyId);
    }
    for (const title of family.related) {
      if (!_familyLookupCache.has(title)) {
        _familyLookupCache.set(title, familyId);
      }
    }
    for (const kw of family.keywords) {
      if (!_familyLookupCache.has(kw)) {
        _familyLookupCache.set(kw, familyId);
      }
    }
  }

  return _familyLookupCache;
}

/**
 * Resolve a job title to its role family ID.
 * Returns null if no match found.
 */
export function resolveRoleFamily(title: string): string | null {
  const normalized = title.toLowerCase().trim();
  const lookup = buildLookup();

  // Exact match
  if (lookup.has(normalized)) return lookup.get(normalized)!;

  // Substring match against primary titles (longest match first)
  let bestMatch: string | null = null;
  let bestLength = 0;

  for (const [pattern, familyId] of lookup) {
    if (normalized.includes(pattern) && pattern.length > bestLength) {
      bestMatch = familyId;
      bestLength = pattern.length;
    }
  }

  if (bestMatch) return bestMatch;

  // Word-level match
  const words = normalized.split(/\s+/);
  for (const [pattern, familyId] of lookup) {
    const patternWords = pattern.split(/\s+/);
    const overlap = patternWords.filter((pw) => words.some((w) => w.includes(pw) || pw.includes(w)));
    if (overlap.length >= Math.ceil(patternWords.length * 0.6)) {
      return familyId;
    }
  }

  return null;
}

/**
 * Get all related family IDs for a given family (adjacent + same category).
 */
export function getRelatedFamilies(familyId: string): string[] {
  const family = ROLE_TAXONOMY[familyId];
  if (!family) return [];

  const related = new Set<string>();

  // Add adjacent families
  for (const keyword of family.adjacent) {
    const resolved = resolveRoleFamily(keyword);
    if (resolved && resolved !== familyId) related.add(resolved);
  }

  // Add families in the same category
  for (const [id, f] of Object.entries(ROLE_TAXONOMY)) {
    if (f.category === family.category && id !== familyId) {
      related.add(id);
    }
  }

  return Array.from(related);
}

/**
 * Get all searchable keywords for a family (primary + related + keywords).
 */
export function getFamilySearchTerms(familyId: string): string[] {
  const family = ROLE_TAXONOMY[familyId];
  if (!family) return [];

  return [...new Set([...family.primary, ...family.related, ...family.keywords])];
}
