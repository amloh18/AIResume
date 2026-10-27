import { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs, FaqSection, JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/StructuredData'
import CardNav from '@/components/landing/CardNav'
import Footer from '@/components/landing/Footer'
import { navLinks } from '@/data/navigation'
import { ROLE_GUIDES } from '@/data/role-guides'

// Role data with unique content for each role
const roleData: Record<string, {
  name: string
  description: string
  skills: string[]
  summaryExample: string
  experienceExamples: string[]
  tips: string[]
  relatedRoles: string[]
}> = {
  'data-analyst': {
    name: 'Data Analyst',
    description: 'Create a professional Data Analyst resume that showcases your analytical skills, technical expertise, and business acumen. Our AI-powered builder helps you highlight the metrics that matter.',
    skills: [
      'Python', 'SQL', 'Excel', 'Tableau', 'Power BI', 'R Programming',
      'Data Visualization', 'Statistical Analysis', 'Machine Learning',
      'Data Cleaning', 'ETL Processes', 'Business Intelligence',
      'A/B Testing', 'Predictive Analytics', 'Data Warehousing',
      'Google Analytics', 'SAS', 'SPSS', 'Big Data'
    ],
    summaryExample: `Results-driven Data Analyst with 3+ years of experience transforming raw data into actionable business insights. Proven track record of increasing operational efficiency by 25% through data-driven decision making. Skilled in Python, SQL, and visualization tools with experience presenting findings to C-suite executives.`,
    experienceExamples: [
      'Analyzed customer behavior data to identify patterns, resulting in 15% increase in conversion rates',
      'Developed automated reporting dashboards reducing manual analysis time by 40 hours per week',
      'Collaborated with cross-functional teams to implement data-driven solutions for business challenges',
      'Conducted A/B testing on marketing campaigns, optimizing spend with 20% better ROI',
      'Cleaned and transformed datasets containing 1M+ records for predictive modeling'
    ],
    tips: [
      'Quantify your impact with specific numbers and percentages',
      'Highlight tools specific to data analysis (SQL, Tableau, Python)',
      'Include business outcomes, not just technical skills',
      'Showcase any experience with statistical testing and hypothesis',
      'Mention data visualization accomplishments prominently'
    ],
    relatedRoles: ['data-scientist', 'business-analyst', 'software-engineer']
  },
  'software-engineer': {
    name: 'Software Engineer',
    description: 'Build a standout Software Engineer resume that demonstrates your coding proficiency, problem-solving abilities, and project delivery track record. Our AI helps you showcase your technical depth.',
    skills: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust',
      'React', 'Node.js', 'Angular', 'Vue.js', 'REST APIs', 'GraphQL',
      'Git', 'AWS', 'Docker', 'Kubernetes', 'Microservices', 'Agile',
      'CI/CD', 'Testing', 'System Design', 'Database Design'
    ],
    summaryExample: `Passionate Software Engineer with 4 years of experience building scalable web applications. Expertise in full-stack development with React, Node.js, and cloud technologies. Delivered 15+ production features serving 100K+ users. Strong problem-solving skills with a focus on code quality and performance optimization.`,
    experienceExamples: [
      'Designed and implemented RESTful APIs handling 1M+ requests daily with 99.9% uptime',
      'Refactored legacy codebase reducing response times by 40% and technical debt by 25%',
      'Led development of new product feature from concept to deployment in 3 months',
      'Implemented automated testing pipeline increasing code coverage from 45% to 85%',
      'Mentored junior developers and conducted code reviews for team of 8 engineers'
    ],
    tips: [
      'Include GitHub contributions and open source projects',
      'List specific technologies and frameworks you master',
      'Showcase system design and architecture experience',
      'Quantify technical achievements with metrics',
      'Highlight collaboration and leadership experiences'
    ],
    relatedRoles: ['frontend-developer', 'backend-developer', 'fullstack-developer']
  },
  'frontend-developer': {
    name: 'Frontend Developer',
    description: 'Create a compelling Frontend Developer resume that highlights your user interface skills, framework expertise, and responsive design capabilities. Stand out to recruiters with our AI-optimized templates.',
    skills: [
      'React', 'Vue.js', 'Angular', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3',
      'SASS/SCSS', 'Tailwind CSS', 'Responsive Design', 'UI/UX', 'Webpack',
      'Vite', 'Next.js', 'Gatsby', 'GraphQL', 'REST APIs', 'Jest',
      'Cypress', 'Accessibility', 'Performance Optimization', 'Figma'
    ],
    summaryExample: `Creative Frontend Developer with 3 years of experience building responsive, user-friendly web applications. Expert in React and modern JavaScript with a keen eye for design and user experience. Proven ability to translate design mockups into pixel-perfect code while maintaining optimal performance.`,
    experienceExamples: [
      'Built responsive web applications using React, improving mobile user engagement by 35%',
      'Implemented component library reducing development time by 30% across multiple projects',
      'Optimized application bundle size, achieving 60% faster initial load times',
      'Collaborated with UX designers to implement accessible features meeting WCAG 2.1 AA',
      'Developed interactive data visualizations using D3.js for real-time dashboards'
    ],
    tips: [
      'Showcase portfolio projects with live links',
      'Highlight performance optimization achievements',
      'Emphasize accessibility and cross-browser compatibility',
      'Include design system and component library work',
      'List modern frameworks and tooling expertise'
    ],
    relatedRoles: ['ui-ux-designer', 'backend-developer', 'fullstack-developer']
  },
  'backend-developer': {
    name: 'Backend Developer',
    description: 'Craft a powerful Backend Developer resume that demonstrates your server-side expertise, API design skills, and database management abilities. Our AI helps you highlight infrastructure and scalability.',
    skills: [
      'Node.js', 'Python', 'Java', 'Go', 'Ruby', 'PHP', 'C#',
      'Express.js', 'Django', 'Spring Boot', 'FastAPI', 'PostgreSQL',
      'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GraphQL',
      'REST APIs', 'Microservices', 'CI/CD', 'Linux'
    ],
    summaryExample: `Backend Developer with 4 years of experience designing and deploying scalable server-side solutions. Proficient in Python, Node.js, and cloud infrastructure with track record of building high-availability systems serving millions of requests daily.`,
    experienceExamples: [
      'Architected microservices architecture handling 10M+ daily API requests with 99.99% uptime',
      'Optimized database queries reducing average response time from 500ms to 50ms',
      'Implemented OAuth 2.0 authentication system securing 500K+ user accounts',
      'Built automated deployment pipelines reducing release cycle from weekly to daily',
      'Designed data models for PostgreSQL and MongoDB databases supporting 1TB+ data'
    ],
    tips: [
      'Highlight system design and architecture experience',
      'Showcase performance optimization achievements',
      'Emphasize scalability and high-availability systems',
      'Include cloud platform certifications if available',
      'Mention experience with messaging systems (Kafka, RabbitMQ)'
    ],
    relatedRoles: ['software-engineer', 'devops-engineer', 'fullstack-developer']
  },
  'fullstack-developer': {
    name: 'Full Stack Developer',
    description: 'Build a comprehensive Full Stack Developer resume that showcases your end-to-end development capabilities. Our AI-powered builder helps you present both frontend and backend expertise.',
    skills: [
      'React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'Java',
      'Express.js', 'Django', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
      'AWS', 'GraphQL', 'REST APIs', 'Git', 'Agile', 'CI/CD',
      'Microservices', 'Testing', 'System Design', 'Vue.js', 'Next.js'
    ],
    summaryExample: `Versatile Full Stack Developer with 5 years of experience building complete web applications from concept to deployment. Strong in both frontend (React, Vue) and backend (Node.js, Python) with DevOps capabilities. Demonstrated success in leading projects and mentoring teams.`,
    experienceExamples: [
      'Led end-to-end development of e-commerce platform generating $2M+ in annual revenue',
      'Built real-time collaborative features using WebSockets for 50K+ concurrent users',
      'Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes',
      'Developed microservices handling 5M+ daily transactions across payment and inventory',
      'Created internal tooling reducing team operational overhead by 30%'
    ],
    tips: [
      'Showcase both frontend and backend projects clearly',
      'Highlight full product lifecycle experience',
      'Include cloud and DevOps capabilities',
      'Quantify business impact of your solutions',
      'Demonstrate leadership and mentoring'
    ],
    relatedRoles: ['frontend-developer', 'backend-developer', 'software-engineer']
  },
  'product-manager': {
    name: 'Product Manager',
    description: 'Create a strategic Product Manager resume that demonstrates your product vision, leadership skills, and track record of delivering successful products. Our AI helps you showcase business impact.',
    skills: [
      'Product Strategy', 'Roadmapping', 'User Research', 'Agile', 'Scrum',
      'Data Analysis', 'A/B Testing', 'SQL', 'Figma', 'Jira', 'Confluence',
      'Stakeholder Management', 'Competitive Analysis', 'Pricing Strategy',
      'Go-to-Market', 'Analytics', 'User Stories', 'Prioritization'
    ],
    summaryExample: `Strategic Product Manager with 5 years of experience leading products from ideation to launch. Data-driven decision maker with proven ability to increase user engagement by 40% and revenue by $1M+. Expert in agile methodologies and cross-functional team leadership.`,
    experienceExamples: [
      'Led product roadmap for flagship SaaS product, increasing ARR by 35% YoY',
      'Conducted user research identifying key pain points, resulting in 25% NPS improvement',
      'Launched new feature line generating $500K in first 6 months',
      'Managed $2M annual budget and prioritized backlog of 100+ feature requests',
      'Led cross-functional team of 15 members including engineering, design, and marketing'
    ],
    tips: [
      'Focus on business metrics and outcomes',
      'Showcase leadership and stakeholder management',
      'Include data analysis and experimentation',
      'Highlight product launches and their impact',
      'Demonstrate customer research experience'
    ],
    relatedRoles: ['project-manager', 'business-analyst', 'software-engineer']
  },
  'business-analyst': {
    name: 'Business Analyst',
    description: 'Develop a professional Business Analyst resume that bridges the gap between business needs and technical solutions. Our AI helps you highlight process improvement and analytical skills.',
    skills: [
      'Requirements Analysis', 'SQL', 'Excel', 'Data Modeling', 'Process Mapping',
      'Jira', 'Confluence', 'Visio', 'Power BI', 'Tableau', 'Agile', 'Scrum',
      'UML', 'User Stories', 'Gap Analysis', 'Stakeholder Management',
      'Root Cause Analysis', 'Testing', 'Documentation', 'BAYAA', 'CBAP'
    ],
    summaryExample: `Analytical Business Analyst with 4 years of experience bridging business requirements and technical solutions. Expert in requirements gathering, process optimization, and data analysis. Demonstrated success in reducing operational costs by 20% through process improvements.`,
    experienceExamples: [
      'Led requirements gathering for $5M software implementation project',
      'Analyzed sales data identifying $1M in revenue leakage and corrective actions',
      'Created process documentation reducing onboarding time by 30% for new hires',
      'Facilitated workshops with 50+ stakeholders to define product requirements',
      'Developed KPI dashboards improving management visibility into operations'
    ],
    tips: [
      'Highlight specific business outcomes achieved',
      'Showcase technical and soft skills balance',
      'Include process improvement achievements',
      'Demonstrate stakeholder management',
      'List relevant certifications (CBAP, IIBA)'
    ],
    relatedRoles: ['product-manager', 'data-analyst', 'project-manager']
  },
  'data-scientist': {
    name: 'Data Scientist',
    description: 'Build a cutting-edge Data Scientist resume that showcases your machine learning expertise, statistical analysis skills, and AI capabilities. Our AI builder highlights your technical depth.',
    skills: [
      'Python', 'R', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Machine Learning',
      'Deep Learning', 'NLP', 'Computer Vision', 'SQL', 'Data Visualization',
      'Statistics', 'A/B Testing', 'Pandas', 'NumPy', 'Spark', 'AWS',
      'Docker', 'Git', 'Jupyter', 'MLOps', 'Feature Engineering'
    ],
    summaryExample: `Innovative Data Scientist with 4 years of experience developing machine learning models that drive business value. PhD-level statistical expertise with practical experience deploying models to production. Published researcher with 10+ papers in top conferences.`,
    experienceExamples: [
      'Developed recommendation engine increasing user engagement by 45% and revenue by $2M',
      'Built predictive maintenance model reducing equipment downtime by 30%',
      'Created NLP pipeline processing 1M+ customer support tickets for sentiment analysis',
      'Implemented MLOps practices reducing model deployment time from weeks to days',
      'Presented research at NeurIPS and ICML, receiving best paper award'
    ],
    tips: [
      'Showcase ML projects with clear business impact',
      'Highlight research publications if available',
      'Include technical stack (TensorFlow, PyTorch, etc.)',
      'Demonstrate MLOps and deployment experience',
      'Quantify model performance improvements'
    ],
    relatedRoles: ['data-analyst', 'machine-learning-engineer', 'software-engineer']
  },
  'ui-ux-designer': {
    name: 'UI/UX Designer',
    description: 'Create a visually stunning UI/UX Designer resume that showcases your design skills, user research expertise, and portfolio. Our AI-optimized templates help you land your dream design role.',
    skills: [
      'Figma', 'Sketch', 'Adobe XD', 'Adobe Creative Suite', 'Prototyping',
      'User Research', 'Wireframing', 'UI Design', 'UX Design', 'Design Systems',
      'Interaction Design', 'Typography', 'Color Theory', 'HTML/CSS',
      'Accessibility', 'Usability Testing', 'Persona Development', 'Journey Mapping'
    ],
    summaryExample: `Creative UI/UX Designer with 4 years of experience creating intuitive digital experiences. Expert in Figma and design systems with track record of improving user satisfaction by 50%. Strong background in user research and iterative design processes.`,
    experienceExamples: [
      'Redesigned mobile app resulting in 40% increase in user retention and 4.8 star rating',
      'Created comprehensive design system used across 12 products, reducing design debt',
      'Conducted 50+ user interviews and usability tests informing product roadmap',
      'Led design sprint methodology reducing ideation-to-prototype time by 60%',
      'Collaborated with engineering to implement pixel-perfect designs in React'
    ],
    tips: [
      'Include link to portfolio with diverse projects',
      'Showcase before/after design improvements',
      'Highlight user research and testing experience',
      'Demonstrate design system work',
      'Emphasize collaboration with developers'
    ],
    relatedRoles: ['frontend-developer', 'product-designer', 'visual-designer']
  },
  'devops-engineer': {
    name: 'DevOps Engineer',
    description: 'Build a powerful DevOps Engineer resume that demonstrates your automation, infrastructure, and CI/CD expertise. Our AI helps you showcase your engineering excellence.',
    skills: [
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'Ansible',
      'Jenkins', 'GitLab CI', 'GitHub Actions', 'Linux', 'Bash', 'Python',
      'Prometheus', 'Grafana', 'ELK Stack', 'Splunk', 'Incident Management',
      'Security', 'Agile', 'Monitoring', 'Containerization'
    ],
    summaryExample: `Results-driven DevOps Engineer with 5 years of experience building and maintaining scalable infrastructure. Expert in cloud platforms, containerization, and automation with track record of reducing deployment times by 90%. Strong focus on reliability and security.`,
    experienceExamples: [
      'Designed AWS infrastructure supporting 10K+ requests/second with 99.99% uptime',
      'Implemented Kubernetes clusters reducing infrastructure costs by 40%',
      'Built CI/CD pipelines automating 50+ daily deployments across 20 services',
      'Created monitoring dashboards reducing MTTR (Mean Time to Recovery) by 70%',
      'Led security audit implementing DevSecOps practices across organization'
    ],
    tips: [
      'Highlight infrastructure scale and metrics',
      'Showcase automation achievements',
      'Include cloud certifications',
      'Demonstrate incident management experience',
      'Emphasize security best practices'
    ],
    relatedRoles: ['cloud-engineer', 'backend-developer', 'software-engineer']
  },
  'project-manager': {
    name: 'Project Manager',
    description: 'Prove you can hold scope, schedule, and budget together with a Project Manager resume that turns delivery history into evidence. Highlight the programs you shipped, the stakeholders you aligned, and the certifications that clear the first screen.',
    skills: [
      'Project Management', 'Agile', 'Scrum', 'Waterfall', 'PMP', 'Stakeholder Management',
      'Risk Management', 'Budget Management', 'Resource Planning', 'Gantt Charts',
      'Critical Path Method', 'JIRA', 'Asana', 'Microsoft Project', 'Smartsheet',
      'Sprint Planning', 'RACI Matrix', 'Earned Value Management', 'Scope Management',
      'Change Management', 'Vendor Management', 'Cross-Functional Leadership',
      'Roadmap Planning', 'Status Reporting',
    ],
    summaryExample: `Detail-oriented Project Manager with 6 years of experience delivering cross-functional programs on time and under budget. Ran a portfolio of 12 concurrent projects worth $4.2M, landing 95% of milestones inside the committed window. PMP-certified with deep experience blending Agile and traditional delivery.`,
    experienceExamples: [
      'Managed a $3.5M launch program spanning 4 teams and 3 vendors, shipping 3 weeks ahead of schedule',
      'Introduced sprint planning and status rituals that cut missed deadlines by 45% across a 20-person department',
      'Led a resource-leveling initiative that reduced contractor spend by $280K annually',
      'Raised stakeholder satisfaction scores from 3.1 to 4.6 out of 5 through standardized reporting',
      'Built a risk register and escalation process that shortened issue resolution time by 60%',
    ],
    tips: [
      'Anchor every bullet to scope, schedule, budget, or risk — the four things hiring managers screen for first',
      'Explain your methodology mix: how you run Agile and Waterfall when stakeholders demand both',
      'Quantify program scale with budget, team size, and number of concurrent workstreams',
      'Show tooling fluency in JIRA, MS Project, or Smartsheet, and how you keep plans current',
      'List PMP, CSM, or PRINCE2 certification near the top with the year earned',
    ],
    relatedRoles: ['product-manager', 'business-analyst', 'marketing-manager']
  },
  'machine-learning-engineer': {
    name: 'Machine Learning Engineer',
    description: 'A Machine Learning Engineer resume should show you can ship models, not just train them. Surface your MLOps pipeline, production latency wins, and the business metrics your models actually moved.',
    skills: [
      'Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'XGBoost', 'Machine Learning',
      'Deep Learning', 'Natural Language Processing', 'Computer Vision', 'MLOps', 'MLflow',
      'Kubeflow', 'Apache Airflow', 'Feature Engineering', 'Model Deployment',
      'Model Monitoring', 'Data Pipelines', 'Apache Spark', 'SQL', 'Docker', 'Kubernetes',
      'Git', 'A/B Testing', 'Ray',
    ],
    summaryExample: `Machine Learning Engineer with 4 years of experience taking models from notebook to production. Shipped ranking and recommendation systems serving 8M daily users and cut inference latency by 60% through model optimization. Strong in PyTorch, MLOps tooling, and owning the full model lifecycle.`,
    experienceExamples: [
      'Deployed a gradient-boosted churn model that reduced customer attrition by 12% in two quarters',
      'Built a feature store and Airflow training pipeline that cut retraining time from 6 hours to 40 minutes',
      'Optimized a transformer-based NLP service with quantization, lowering inference cost by 45%',
      'Implemented drift detection and model monitoring that caught 3 silent regressions before they hit revenue',
      'Productionized 15 models behind REST endpoints handling 200K daily predictions',
    ],
    tips: [
      'Separate research from engineering: emphasize latency, throughput, and deployment ownership',
      'Tie every model to a business metric — churn, conversion, or cost per prediction',
      'List the full MLOps stack (MLflow, Kubeflow, feature stores), not just modeling libraries',
      'Link a GitHub or paper trail of reproducible training code if you have one',
      'Describe evaluation rigor: offline metrics, online A/B tests, and how you catch drift',
    ],
    relatedRoles: ['data-scientist', 'software-engineer', 'backend-developer']
  },
  'cloud-engineer': {
    name: 'Cloud Engineer',
    description: 'A Cloud Engineer resume needs to prove you can design, secure, and cost-control real cloud environments. Show your infrastructure-as-code depth, migration track record, and the availability you maintained.',
    skills: [
      'AWS', 'Microsoft Azure', 'Google Cloud Platform', 'Terraform', 'AWS CloudFormation',
      'Pulumi', 'Serverless Architecture', 'AWS Lambda', 'Virtual Machines', 'Object Storage',
      'VPC Design', 'IAM', 'Well-Architected Framework', 'Cloud Cost Optimization',
      'Auto Scaling', 'Load Balancing', 'CDN', 'DNS Management', 'Amazon CloudWatch',
      'Datadog', 'Ansible', 'Networking', 'Linux', 'Disaster Recovery',
    ],
    summaryExample: `Cloud Engineer with 5 years of experience designing and operating multi-account AWS and Azure environments. Migrated 40+ workloads with zero unplanned downtime and trimmed monthly cloud spend by 32% through right-sizing and reserved capacity. Deep in Terraform, IAM, and Well-Architected reviews.`,
    experienceExamples: [
      'Architected a multi-account AWS landing zone serving 60 microservices at 99.99% availability',
      'Wrote reusable Terraform modules that cut environment provisioning from 2 days to 20 minutes',
      'Led a cost optimization program reducing monthly AWS spend from $140K to $95K',
      'Designed auto-scaling and cross-AZ failover that absorbed 5x holiday traffic spikes without degradation',
      'Standardized IAM policies and guardrails that passed a SOC 2 audit with zero findings',
    ],
    tips: [
      'Name the clouds, accounts, and regions you actually operated, not just the exams you passed',
      'Show cost work — FinOps, rightsizing, and reserved capacity are screened for heavily now',
      'Tell migration stories with the strategy used (lift-and-shift vs replatform) and downtime avoided',
      'Map your experience to the Well-Architected pillars so keyword screeners match you',
      'Detail IaC depth: module reuse, state management, and how you handle drift',
    ],
    relatedRoles: ['devops-engineer', 'backend-developer', 'software-engineer']
  },
  'product-designer': {
    name: 'Product Designer',
    description: 'A Product Designer resume should connect your craft to outcomes. Frame your research, systems work, and shipped features around the activation, conversion, and task-success numbers that moved.',
    skills: [
      'Product Design', 'UX Design', 'UI Design', 'Figma', 'Prototyping', 'Wireframing',
      'User Research', 'Usability Testing', 'Design Systems', 'Interaction Design',
      'Information Architecture', 'Customer Journey Mapping', 'Persona Development',
      'Usability Heuristics', 'Responsive Design', 'Visual Design', 'Design Sprints',
      'A/B Testing', 'HTML/CSS', 'Product Strategy', 'Mobile Design', 'Accessibility',
      'Stakeholder Presentation', 'Competitive Analysis',
    ],
    summaryExample: `Product Designer with 6 years of experience owning end-to-end design for B2B SaaS products. Redesigned onboarding that lifted activation from 41% to 63% in two quarters. Fluent in systems thinking, research synthesis, and partnering with product and engineering from discovery through launch.`,
    experienceExamples: [
      'Led the redesign of a core checkout flow, increasing conversion by 24% across web and mobile',
      'Built and governed a 120-component design system adopted by 4 product squads',
      'Ran 60+ user interviews and usability tests that redirected roadmap priorities twice',
      'Shipped an accessible redesign meeting WCAG 2.1 AA that cut navigation support tickets by 35%',
      'Partnered with product managers on design sprints that cut concept-to-prototype time from 5 weeks to 10 days',
    ],
    tips: [
      'Present 2-3 case studies with problem, process, and measurable outcome — not just final screens',
      'Show research influence: what the findings changed about what got built',
      'Demonstrate systems thinking and how you keep consistency across multiple squads',
      'Use metrics hiring managers care about: activation, conversion, and task success rate',
      'Make your portfolio link unmissable and keep it limited to your strongest work',
    ],
    relatedRoles: ['ui-ux-designer', 'product-manager', 'frontend-developer']
  },
  'visual-designer': {
    name: 'Visual Designer',
    description: 'A Visual Designer resume should make taste and rigor visible at once. Pair your strongest creative work with the brand consistency and campaign performance behind it.',
    skills: [
      'Visual Design', 'Typography', 'Color Theory', 'Layout Design', 'Adobe Photoshop',
      'Adobe Illustrator', 'Adobe InDesign', 'Figma', 'Brand Identity', 'Logo Design',
      'Icon Design', 'Style Guides', 'Print Design', 'Digital Design', 'Social Media Design',
      'Email Design', 'Infographics', 'Illustration', 'Composition', 'Responsive Design',
      'Motion Graphics', 'Photo Editing', 'Packaging Design', 'Creative Direction',
    ],
    summaryExample: `Visual Designer with 7 years of experience shaping brand systems across print, web, and campaign creative. Rebuilt a brand identity system that lifted email click-through rates by 28% and unified assets across 6 channels. Obsessive about typography, color, and composition at any scale.`,
    experienceExamples: [
      'Directed a full brand refresh covering logo, palette, and type system, rolled out across 200+ assets',
      'Designed a social and display campaign suite that earned 4.2M impressions at a 3.1% CTR',
      'Created an icon and illustration library in Illustrator that cut creative turnaround time by 50%',
      'Produced a 60-page product catalog tied to a 15% lift in distributor orders',
      'Built responsive email and landing templates that increased open rates by 18%',
    ],
    tips: [
      'Lead with a portfolio showing range: brand, campaign, product, and print work',
      'Explain your systems work — style guides and component kits signal seniority',
      'Tie creative decisions to performance data such as CTR, engagement, and conversion',
      'Show Adobe suite depth alongside Figma, since many established workflows still run on Illustrator and InDesign',
      'Call out art direction and collaboration with copywriters, marketers, and developers',
    ],
    relatedRoles: ['ui-ux-designer', 'product-designer', 'marketing-manager']
  },
  'marketing-manager': {
    name: 'Marketing Manager',
    description: 'A Marketing Manager resume should read like a growth record. Lead with budget, pipeline, and channel performance, then show the team and stack that got you there.',
    skills: [
      'Marketing Strategy', 'Campaign Management', 'Digital Marketing', 'Content Marketing',
      'SEO', 'SEM', 'PPC', 'Google Ads', 'Meta Ads', 'Email Marketing',
      'Marketing Automation', 'HubSpot', 'Marketo', 'Salesforce', 'Google Analytics 4',
      'Marketing KPIs', 'Budget Management', 'Brand Management', 'Product Marketing',
      'Go-to-Market Strategy', 'Lead Generation', 'Conversion Rate Optimization',
      'Copywriting', 'Market Research',
    ],
    summaryExample: `Marketing Manager with 8 years of experience building integrated demand programs for B2B and B2C brands. Grew marketing-sourced pipeline to $6.4M annually while lowering cost per lead by 37%. Skilled in owning strategy, budget, and a cross-functional team of 6.`,
    experienceExamples: [
      'Owned a $1.8M annual marketing budget and delivered 212% of pipeline target in FY24',
      'Launched a paid search and paid social program that improved ROAS from 2.4x to 4.1x',
      'Rebuilt the lead nurture program in HubSpot, lifting MQL-to-SQL conversion by 29%',
      'Drove an SEO content initiative that grew organic traffic from 34K to 91K monthly visits in 12 months',
      'Led a rebrand campaign across web, email, and events that grew branded search volume by 45%',
    ],
    tips: [
      'Organize bullets around the funnel: awareness, demand generation, conversion, and retention',
      'State budget ownership and channel mix explicitly — recruiters look for scale of control',
      'Report ROAS, CAC, and marketing-sourced revenue instead of vanity reach figures',
      'Name the stack you run daily: HubSpot, Marketo, GA4, and the ad platforms you manage',
      'Show leadership scope: team size, agency management, and cross-functional launches',
    ],
    relatedRoles: ['product-manager', 'sales-manager', 'business-analyst']
  },
  'sales-manager': {
    name: 'Sales Manager',
    description: 'A Sales Manager resume should put quota, pipeline, and team results up front. Make your number unmistakable, then show the coaching and forecast discipline behind it.',
    skills: [
      'Sales Management', 'Pipeline Management', 'Sales Forecasting', 'Sales Strategy',
      'B2B Sales', 'SaaS Sales', 'Account Management', 'New Business Development',
      'Consultative Selling', 'MEDDICC', 'Challenger Sales', 'Salesforce', 'HubSpot Sales',
      'CRM Administration', 'Cold Calling', 'Discovery Calls', 'Negotiation',
      'Contract Closing', 'Quota Attainment', 'Territory Planning', 'Sales Enablement',
      'Team Coaching', 'Pipeline Hygiene', 'Revenue Operations',
    ],
    summaryExample: `Sales Manager with 9 years of experience building and leading enterprise sales teams. Moved a 6-person team from 78% to 118% average quota attainment in four quarters and closed $14.2M in new ARR. Expert in MEDDICC qualification, forecast accuracy, and coaching reps through complex deals.`,
    experienceExamples: [
      'Led a team of 8 account executives to $14.2M in new ARR at 118% of team quota',
      'Improved forecast accuracy from 32% variance to 6% by enforcing stage-based qualification',
      'Built a territory and patch plan that grew qualified pipeline coverage from 2.1x to 3.4x',
      'Coached 4 underperforming reps to top-decile quota attainment within 18 months',
      'Negotiated 3 enterprise contracts worth $2.6M TCV, shortening the sales cycle from 96 to 61 days',
    ],
    tips: [
      'Quantify with ARR or ACV, quota attainment percentage, and team size — the first three numbers screened',
      'Name your methodology (MEDDICC, Challenger, Sandler) and how you enforce it in the field',
      'Separate individual contributions from team results so your leadership scope is obvious',
      'Cover CRM hygiene and forecasting accuracy; revenue operations leaders weigh them heavily',
      'Mention sales cycle length and average deal size to convey the complexity you have handled',
    ],
    relatedRoles: ['marketing-manager', 'product-manager', 'business-analyst']
  },
  'accountant': {
    name: 'Accountant',
    description: 'An Accountant resume should prove accuracy and control. Lead with your close cycle, entity scale, and the reconciliations, forecasts, and audits you own end to end.',
    skills: [
      'General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Bank Reconciliation',
      'Month-End Close', 'Financial Reporting', 'Journal Entries', 'GAAP', 'IFRS',
      'Tax Preparation', 'Tax Compliance', 'Payroll', 'Fixed Assets', 'Cost Accounting',
      'Financial Modeling', 'Variance Analysis', 'Cash Flow Analysis', 'External Audits',
      'Excel', 'QuickBooks', 'SAP', 'Oracle Financials', 'NetSuite', 'Forecasting',
    ],
    summaryExample: `Detail-oriented Accountant with 5 years of experience running full-cycle general ledger accounting for a $60M revenue company. Cut the month-end close from 12 days to 5 through process redesign and tighter accrual discipline. CPA-qualified with strong GAAP, tax, and audit coordination background.`,
    experienceExamples: [
      'Managed full-cycle accounting for a $60M revenue entity covering GL, AP, AR, and fixed assets',
      'Reduced the monthly close cycle from 12 days to 5 days by rebuilding the close checklist',
      'Identified $310K in duplicate vendor payments and recovered the funds within one quarter',
      'Coordinated audit requests across 3 entities, resulting in a clean opinion with zero adjustments',
      'Prepared quarterly forecasts and variance analysis that flagged a 14% cost overrun two months early',
    ],
    tips: [
      'Name the ERP you live in daily — NetSuite, SAP, Oracle, or QuickBooks — plus advanced Excel skills',
      'Show close ownership: days to close, number of entities, and monthly transaction volume',
      'Highlight CPA, CMA, or EA credentials, including sections still in progress',
      'Quantify controls work: reconciliations performed and balance-sheet accounts under your ownership',
      'Emphasize audit and compliance exposure; it signals your work withstands outside review',
    ],
    relatedRoles: ['business-analyst', 'data-analyst', 'project-manager']
  },
  'hr-manager': {
    name: 'HR Manager',
    description: 'An HR Manager resume should balance people outcomes with compliance. Show your recruiting volume, retention gains, and the HR systems and policies you administer.',
    skills: [
      'Human Resources', 'Talent Acquisition', 'Full-Cycle Recruiting', 'Onboarding',
      'Employee Relations', 'Performance Management', 'Compensation and Benefits', 'Workday',
      'BambooHR', 'ADP', 'Payroll Administration', 'Labor Law Compliance', 'EEOC Compliance',
      'FMLA', 'Employee Engagement', 'Workforce Planning', 'Succession Planning',
      'Training and Development', 'Diversity, Equity and Inclusion', 'Conflict Resolution',
      'HR Policies', 'Exit Interviews', 'Applicant Tracking Systems', 'HRIS Administration',
    ],
    summaryExample: `Strategic HR Manager with 7 years of experience partnering with leadership on talent, culture, and compliance for a 450-employee organization. Reduced voluntary turnover from 22% to 14% in two years while revamping performance management. SHRM-CP certified with hands-on HRIS, payroll, and employee relations expertise.`,
    experienceExamples: [
      'Managed full-cycle recruiting for 120+ annual hires, cutting time-to-fill from 58 to 39 days',
      'Reduced voluntary turnover from 22% to 14% by launching stay interviews and career pathing',
      'Led a Workday implementation and data migration for 450 employees with zero payroll disruptions',
      'Investigated and resolved 40+ employee relations cases and successfully defended 2 EEOC charges',
      'Redesigned the performance review cycle, raising completion rates from 61% to 94%',
    ],
    tips: [
      'Quantify headcount, hire volume, and turnover the way finance quantifies revenue',
      'Name your HRIS and ATS platforms precisely; they drive most keyword screening rounds',
      'Signal employment law literacy: FMLA, EEOC, FLSA, and state-specific leave rules',
      'Highlight change management — system implementations and policy rollouts show strategic range',
      'Show the employee experience angle with engagement scores and retention program results',
    ],
    relatedRoles: ['business-analyst', 'project-manager', 'teacher']
  },
  'teacher': {
    name: 'Teacher',
    description: 'A Teacher resume should turn classroom work into measurable learning outcomes. Surface test growth, differentiation skills, and the curriculum and communication systems you use every day.',
    skills: [
      'Curriculum Development', 'Lesson Planning', 'Classroom Management',
      'Differentiated Instruction', 'Common Core', 'State Standards Alignment',
      'Google Classroom', 'Canvas', 'Seesaw', 'IEP Management', '504 Plans',
      'Formative Assessment', 'Data-Driven Instruction', 'Student Engagement',
      'Parent Communication', 'Behavior Management', 'Small-Group Instruction',
      'Reading Intervention', 'Cooperative Learning', 'Project-Based Learning',
      'ESL Instruction', 'Rubric Design', 'Educational Technology', 'Student Portfolios',
    ],
    summaryExample: `Dedicated 8th-grade teacher with 9 years of experience delivering standards-based instruction to diverse classrooms of 28+ students. Raised class proficiency from 64% to 86% on state assessments through data-driven small-group instruction. Skilled in IEP accommodations, parent communication, and technology-enhanced learning.`,
    experienceExamples: [
      'Improved state test proficiency from 64% to 86% across two academic years in a 28-student classroom',
      'Designed tiered lessons and interventions supporting 6 IEP and 3 504 students to grade-level progress',
      'Launched a project-based unit adopted grade-wide, lifting student engagement survey scores by 31%',
      'Built a parent communication routine that raised conference attendance from 55% to 90%',
      'Mentored 3 student teachers and led the department transition to a digital curriculum',
    ],
    tips: [
      'Lead with student outcome data: proficiency gains, growth percentiles, and pass rates',
      'Name your LMS and IEP platforms so district applicant tracking filters catch you',
      'Describe classroom management with concrete results rather than a one-line philosophy',
      'List certifications and endorsements prominently, including subject area and grade bands',
      'Highlight family and community engagement; districts weigh it heavily at interview stage',
    ],
    relatedRoles: ['hr-manager', 'project-manager', 'accountant']
  },
  'nurse': {
    name: 'Registered Nurse',
    description: 'A Registered Nurse resume needs clinical specificity: unit, patient ratios, certifications, and charting systems. Show the care you delivered and the safety and satisfaction outcomes you protected.',
    skills: [
      'Patient Assessment', 'Medication Administration', 'IV Therapy', 'Wound Care',
      'Care Planning', 'Patient Education', 'Triage', 'Telemetry Monitoring', 'Epic',
      'Cerner', 'Meditech', 'Clinical Documentation', 'BLS Certification',
      'ACLS Certification', 'PALS Certification', 'NIH Stroke Scale', 'Infection Control',
      'Patient Safety', 'Blood Administration', 'Charge Nurse Leadership',
      'Discharge Planning', 'Preceptorship', 'HIPAA Compliance', 'Critical Care Nursing',
    ],
    summaryExample: `Compassionate Registered Nurse with 6 years of experience on a 36-bed medical-surgical and telemetry unit. Managed assignments of up to 5 patients per shift while maintaining a 98% patient satisfaction score. BLS, ACLS, and NIHSS certified with strong Epic documentation and charge nurse experience.`,
    experienceExamples: [
      'Delivered skilled assessment and medication management for up to 5 med-surg patients per 12-hour shift',
      'Recognized early deterioration in a post-op patient and escalated a rapid response, preventing an ICU transfer',
      'Precepted 8 new graduate nurses through orientation, all completing competency sign-off two weeks early',
      'Achieved 98% patient satisfaction for three consecutive quarters on HCAHPS-linked measures',
      'Served as charge nurse coordinating admissions, discharges, and staffing for a 36-bed unit',
    ],
    tips: [
      'Match your unit and patient ratio to the job posting; charge nurse and preceptor work signal seniority',
      'Spell out certifications with expiration dates: BLS, ACLS, PALS, and NIHSS',
      'List EHR systems by name — Epic, Cerner, Meditech — since facility match carries real weight',
      'Include specialty competencies such as telemetry, wound care, central lines, or medication titration',
      'Reference HIPAA-compliant documentation habits and the patient safety initiatives you took part in',
    ],
    relatedRoles: ['teacher', 'hr-manager']
  }
}

// Generate static params for all supported roles
export async function generateStaticParams() {
  return Object.keys(roleData).map((role) => ({
    role,
  }))
}

// Generate metadata for each role page
export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params
  const data = roleData[role]
  
  if (!data) {
    return {
      title: 'Resume Builder - Create Professional Resumes',
      description: 'Create professional, ATS-optimized resumes with our AI-powered builder.',
      // An unknown role renders a "Resume Not Found" body but still returns HTTP 200, so without
      // this it is a soft 404 that search engines will happily index.
      robots: { index: false, follow: true },
    }
  }
  
  return {
    title: `${data.name} Resume - ${data.name} Resume Examples & Templates`,
    description: `Create a professional ${data.name} resume with our AI-powered builder. Get ${data.name} resume examples, skills list, and expert tips. Free to start.`,
    keywords: [
      `${data.name} resume`,
      `${data.name} resume template`,
      `${data.name} CV`,
      `${data.name} resume examples`,
      `best ${data.name} resume`,
      'professional resume builder',
      'ATS resume'
    ],
    alternates: {
      canonical: `https://buildairesume.com/resume/${role}`,
    },
    openGraph: {
      title: `${data.name} Resume - Create with AI`,
      description: `Build your ${data.name} resume in minutes with our AI-powered builder.`,
      url: `https://buildairesume.com/resume/${role}`,
      type: 'website',
    },
  }
}

// Cross-links from every role page into the commercial pages. Role pages attract long-tail search
// traffic they can rarely convert on their own; these give that traffic a path to a page that can,
// and pass crawl priority with it.
const RELATED_GUIDE_LINKS = [
  { href: '/ats-resume-checker', label: 'ATS resume checker' },
  { href: '/resume-score', label: 'Resume score checker' },
  { href: '/ai-resume-builder', label: 'AI resume builder' },
  { href: '/templates', label: 'Resume templates' },
  { href: '/blog/how-to-build-ats-friendly-resume', label: 'Build an ATS-friendly resume' },
  { href: '/blog/ats-score-optimization', label: 'ATS score optimisation' },
  { href: '/compare/resume-builders', label: 'Compare resume builders' },
]

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const data = roleData[role]
  
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Resume Not Found</h1>
          <p className="text-gray-400 mb-8">We don&apos;t have a template for this role yet.</p>
          <Link href="/ai-resume-builder" className="text-green-400 hover:underline">
            Create your resume with AI →
          </Link>
        </div>
      </div>
    )
  }

  // Long-form, role-specific copy. Missing for a role only if one was added to `roleData` without
  // a matching guide — the sections below simply do not render rather than shipping empty headings.
  const guide = ROLE_GUIDES[role]
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: `${data.name} Resume` },
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <JsonLd data={breadcrumb} />
      {guide ? <JsonLd data={faqSchema(guide.faq)} /> : null}

      {/*
        Same header and footer as every other public page.

        These role guides are indexable, long-form marketing pages, but they were
        the only public surface with no header at all: a visitor arriving from
        search had no route back into the product, no Products megamenu, and no
        footer links. `pt-32` clears the floating CardNav pill (top 2em, ~64px
        tall), matching the padding the other CardNav pages use.
      */}
      <CardNav logo="AIResume" links={navLinks} />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Breadcrumbs
            center
            className="mb-6"
            items={[{ name: 'Home', path: '/' }, { name: `${data.name} Resume` }]}
          />
          <h1 className="text-5xl font-bold text-white mb-6">
            {data.name} Resume
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {data.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/ai-resume-builder?role=${role}`}
              className="px-8 py-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition"
            >
              Create {data.name} Resume with AI
            </Link>
            <Link
              href="/ai-resume-builder"
              className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-16 px-4 bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Essential {data.name} Skills
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {data.skills.map((skill) => (
              <span
                key={skill}
                className="px-4 py-2 bg-gray-700 text-green-400 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Summary Example */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Professional Summary Example
          </h2>
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <p className="text-gray-300 leading-relaxed text-lg">
              {data.summaryExample}
            </p>
          </div>
        </div>
      </section>

      {/* Experience Examples */}
      <section className="py-16 px-4 bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Work Experience Examples
          </h2>
          <div className="space-y-4">
            {data.experienceExamples.map((example, index) => (
              <div key={index} className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex gap-4">
                <span className="text-green-500 text-xl font-bold">•</span>
                <p className="text-gray-300">{example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            {data.name} Resume Tips
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {data.tips.map((tip, index) => (
              <div key={index} className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-800/50">
                <div className="flex gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <p className="text-gray-300">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Long-form writing guide */}
      {guide ? (
        <>
          <section className="py-16 px-4 bg-gray-800/50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                How to Write a {data.name} Resume
              </h2>
              <p className="text-gray-300 leading-relaxed mb-8">{guide.howToIntro}</p>
              <div className="space-y-4">
                {guide.howTo.map((step, index) => (
                  <div key={step.title} className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex gap-4">
                    <span className="text-green-500 font-bold shrink-0">{index + 1}</span>
                    <div>
                      <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                      <p className="text-gray-300 leading-relaxed text-sm">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Common mistakes */}
          <section className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                Common {data.name} Resume Mistakes
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {guide.mistakes.map((mistake) => (
                  <div key={mistake.title} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-white font-semibold mb-2 flex gap-2">
                      <span className="text-red-400">✕</span>
                      {mistake.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-sm">{mistake.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* FAQ */}
      {guide ? (
        <section className="py-16 px-4 bg-gray-800/50">
          <div className="max-w-4xl mx-auto">
            <FaqSection items={guide.faq} title={`${data.name} Resume FAQs`} />
          </div>
        </section>
      ) : null}

      {/* Related guides — pushes crawl and link equity to the money pages */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Related Guides</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {RELATED_GUIDE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 hover:text-white hover:border-green-500/50 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Generate Your {data.name} Resume in 2 Minutes
          </h2>
          <p className="text-lg text-green-100 mb-8">
            Pre-filled with {data.skills.slice(0, 3).join(', ')} and more relevant keywords.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/ai-resume-builder?role=${role}`}
              className="px-8 py-4 bg-white text-green-700 font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Create {data.name} Resume with AI
            </Link>
          </div>
          <p className="mt-4 text-sm text-green-200">
            ✓ Free to start &nbsp; ✓ ATS-optimized &nbsp; ✓ Professional templates
          </p>
        </div>
      </section>

      {/* Related Roles */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Related Resume Pages
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {data.relatedRoles.map((relatedRole: string) => {
              const relatedData = roleData[relatedRole]
              if (!relatedData) return null
              return (
                <Link
                  key={relatedRole}
                  href={`/resume/${relatedRole}`}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition border border-gray-700"
                >
                  {relatedData.name} Resume
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
