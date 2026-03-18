import { Metadata } from 'next'
import Link from 'next/link'

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
      'REST APIs', 'Microservices', 'CI/CD', 'Linux', 'MongoDB'
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
  }
}

// Generate static params for all supported roles
export async function generateStaticParams() {
  return Object.keys(roleData).map((role) => ({
    role,
  }))
}

// Generate metadata for each role page
export async function generateMetadata({ params }: { params: { role: string } }): Promise<Metadata> {
  const { role } = await params
  const data = roleData[role]
  
  if (!data) {
    return {
      title: 'Resume Builder - Create Professional Resumes | CVCircle',
      description: 'Create professional, ATS-optimized resumes with our AI-powered builder.',
    }
  }
  
  return {
    title: `${data.name} Resume - ${data.name} Resume Examples & Templates | CVCircle`,
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
      canonical: `/resume/${role}`,
    },
    openGraph: {
      title: `${data.name} Resume - Create with AI | CVCircle`,
      description: `Build your ${data.name} resume in minutes with our AI-powered builder.`,
      url: `https://cvcircle.io/resume/${role}`,
      type: 'website',
    },
  }
}

export default async function RolePage({ params }: { params: { role: string } }) {
  const { role } = await params
  const data = roleData[role]
  
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Resume Not Found</h1>
          <p className="text-gray-400 mb-8">We don't have a template for this role yet.</p>
          <Link href="/ai-resume-builder" className="text-green-400 hover:underline">
            Create your resume with AI →
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
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
    </div>
  )
}
