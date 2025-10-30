const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Define Job schema (matching the IJob interface)
const jobSchema = new mongoose.Schema({
  jobid: {
    type: String,
    unique: true,
    sparse: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  jobUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Job URL cannot exceed 500 characters']
  },
  jobDescription: {
    type: String,
    trim: true,
    maxlength: [10000, 'Job description cannot exceed 10000 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  salary: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  sponsorship: {
    type: String,
    enum: ['yes', 'no', 'unknown'],
    default: 'unknown'
  },
  status: {
    type: String,
    enum: ['created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'],
    default: 'created',
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  applicationDate: {
    type: Date
  },
  deadline: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  contacts: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    linkedin: {
      type: String,
      trim: true
    }
  }],
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'onsite', 'technical', 'behavioral'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      min: 0
    },
    interviewer: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    outcome: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no-show']
    },
    feedback: {
      type: String,
      trim: true
    }
  }],
  followUps: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['email', 'phone', 'linkedin', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Follow-up description cannot exceed 500 characters']
    },
    outcome: {
      type: String,
      trim: true,
      maxlength: [500, 'Follow-up outcome cannot exceed 500 characters']
    }
  }],
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Attachment name cannot exceed 200 characters']
    },
    type: {
      type: String,
      enum: ['cv', 'cover-letter', 'certificate', 'portfolio', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Attachment URL cannot exceed 500 characters']
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  source: {
    type: String,
    enum: ['linkedin', 'indeed', 'company-website', 'referral', 'other']
  },
  sourceUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Source URL cannot exceed 500 characters']
  },
  atsScore: {
    type: Number,
    min: 0,
    max: 100
  },
  atsAnalysis: {
    matchedKeywords: [{
      type: String,
      trim: true
    }],
    missingKeywords: [{
      type: String,
      trim: true
    }],
    suggestions: [{
      type: String,
      trim: true,
      maxlength: [200, 'ATS suggestion cannot exceed 200 characters']
    }],
    analyzedAt: {
      type: Date
    }
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    previousStatus: {
      type: String
    }
  }]
}, {
  timestamps: true
});

const Job = mongoose.model('Job', jobSchema);

// Mock job data
const mockJobs = [
  {
    jobTitle: "Senior Full Stack Developer",
    company: "TechCorp Solutions",
    jobUrl: "https://techcorp.com/careers/senior-full-stack-developer",
    jobDescription: `We are seeking a highly skilled Senior Full Stack Developer to join our dynamic team. The ideal candidate will have extensive experience in both frontend and backend development, with a strong understanding of modern web technologies.

**Key Responsibilities:**
- Design and develop scalable web applications using React, Node.js, and TypeScript
- Build and maintain RESTful APIs and microservices architecture
- Collaborate with cross-functional teams to deliver high-quality software solutions
- Mentor junior developers and conduct code reviews
- Implement best practices for code quality, testing, and deployment
- Work with cloud platforms (AWS/Azure) and containerization technologies
- Participate in agile development processes and sprint planning

**Required Skills:**
- 5+ years of experience in full-stack development
- Proficiency in JavaScript, TypeScript, React, Node.js, and Express
- Experience with databases (MongoDB, PostgreSQL, Redis)
- Knowledge of cloud services (AWS, Azure, or GCP)
- Experience with Docker and Kubernetes
- Strong understanding of software architecture patterns
- Excellent problem-solving and communication skills

**Preferred Qualifications:**
- Experience with GraphQL and Apollo
- Knowledge of CI/CD pipelines and DevOps practices
- Experience with testing frameworks (Jest, Cypress)
- Previous experience in fintech or e-commerce domains

**What We Offer:**
- Competitive salary and equity package
- Comprehensive health, dental, and vision insurance
- Flexible work arrangements and remote work options
- Professional development budget
- Modern office space with state-of-the-art equipment
- Team building events and company retreats

Join us in building the next generation of innovative software solutions!`,
    location: "San Francisco, CA (Hybrid)",
    salary: {
      min: 120000,
      max: 160000,
      currency: "USD",
      period: "yearly"
    },
    sponsorship: "yes",
    status: "applied",
    priority: "high",
    applicationDate: new Date('2024-01-15'),
    deadline: new Date('2024-02-15'),
    notes: "Great opportunity with a growing company. Need to prepare for technical interview focusing on system design.",
    tags: ["React", "Node.js", "TypeScript", "AWS", "Full Stack", "Senior Level"],
    contacts: [
      {
        name: "Sarah Johnson",
        role: "Technical Recruiter",
        email: "sarah.johnson@techcorp.com",
        phone: "+1-555-0123",
        linkedin: "https://linkedin.com/in/sarahjohnson"
      },
      {
        name: "Michael Chen",
        role: "Engineering Manager",
        email: "michael.chen@techcorp.com",
        linkedin: "https://linkedin.com/in/michaelchen"
      }
    ],
    interviews: [
      {
        type: "phone",
        date: new Date('2024-01-20T14:00:00Z'),
        duration: 45,
        interviewer: "Sarah Johnson",
        notes: "Initial screening call - went well, moving to technical round",
        outcome: "completed"
      }
    ],
    followUps: [
      {
        date: new Date('2024-01-22'),
        type: "email",
        description: "Sent thank you email after phone interview",
        outcome: "Received positive response"
      }
    ],
    source: "linkedin",
    sourceUrl: "https://linkedin.com/jobs/view/1234567890",
    atsScore: 85,
    atsAnalysis: {
      matchedKeywords: ["React", "Node.js", "TypeScript", "AWS", "MongoDB"],
      missingKeywords: ["GraphQL", "Kubernetes"],
      suggestions: ["Add GraphQL experience to your resume", "Highlight any containerization experience"],
      analyzedAt: new Date()
    },
    statusHistory: [
      {
        status: "created",
        changedAt: new Date('2024-01-10'),
        previousStatus: null
      },
      {
        status: "applied",
        changedAt: new Date('2024-01-15'),
        previousStatus: "created"
      }
    ]
  },
  {
    jobTitle: "Frontend Developer - React Specialist",
    company: "DesignFlow Inc",
    jobUrl: "https://designflow.com/careers/frontend-developer",
    jobDescription: `DesignFlow Inc is looking for a passionate Frontend Developer with expertise in React to join our creative team. We're building beautiful, user-centric web applications that make a difference.

**About the Role:**
As a Frontend Developer at DesignFlow, you'll be responsible for creating stunning user interfaces and seamless user experiences. You'll work closely with our design team to bring mockups to life and collaborate with backend developers to integrate APIs.

**What You'll Do:**
- Develop responsive web applications using React, Next.js, and modern CSS frameworks
- Implement pixel-perfect designs with attention to detail
- Optimize applications for maximum speed and scalability
- Write clean, maintainable, and well-documented code
- Collaborate with UX/UI designers to ensure design consistency
- Participate in code reviews and maintain high code quality standards
- Stay up-to-date with the latest frontend technologies and best practices

**Technical Requirements:**
- 3+ years of experience with React and JavaScript/TypeScript
- Strong proficiency in HTML5, CSS3, and modern CSS frameworks (Tailwind, Styled Components)
- Experience with state management libraries (Redux, Zustand, or Context API)
- Knowledge of build tools (Webpack, Vite, or Parcel)
- Experience with version control (Git) and collaborative development
- Understanding of responsive design principles and cross-browser compatibility
- Familiarity with testing frameworks (Jest, React Testing Library)

**Nice to Have:**
- Experience with Next.js or other React frameworks
- Knowledge of design systems and component libraries
- Experience with animation libraries (Framer Motion, Lottie)
- Understanding of accessibility standards (WCAG)
- Experience with performance optimization techniques

**Perks & Benefits:**
- $90,000 - $120,000 annual salary
- Flexible working hours and remote work options
- Health, dental, and vision insurance
- 401(k) with company matching
- Professional development opportunities
- Creative and collaborative work environment
- Annual team retreats and company events

**Our Culture:**
We believe in work-life balance, continuous learning, and fostering creativity. Our team is diverse, inclusive, and passionate about creating exceptional user experiences.`,
    location: "New York, NY (Remote)",
    salary: {
      min: 90000,
      max: 120000,
      currency: "USD",
      period: "yearly"
    },
    sponsorship: "no",
    status: "screening",
    priority: "medium",
    applicationDate: new Date('2024-01-12'),
    deadline: new Date('2024-02-28'),
    notes: "Company has great design culture. Need to prepare portfolio showcasing React projects.",
    tags: ["React", "Frontend", "JavaScript", "CSS", "UI/UX", "Remote"],
    contacts: [
      {
        name: "Emily Rodriguez",
        role: "HR Manager",
        email: "emily.rodriguez@designflow.com",
        phone: "+1-555-0456",
        linkedin: "https://linkedin.com/in/emilyrodriguez"
      }
    ],
    interviews: [
      {
        type: "video",
        date: new Date('2024-01-25T15:30:00Z'),
        duration: 60,
        interviewer: "Emily Rodriguez",
        notes: "Initial video interview scheduled",
        outcome: "scheduled"
      }
    ],
    followUps: [],
    source: "company-website",
    sourceUrl: "https://designflow.com/careers",
    atsScore: 78,
    atsAnalysis: {
      matchedKeywords: ["React", "JavaScript", "CSS", "HTML5"],
      missingKeywords: ["TypeScript", "Next.js", "Testing"],
      suggestions: ["Add TypeScript experience", "Include testing frameworks in your skills"],
      analyzedAt: new Date()
    },
    statusHistory: [
      {
        status: "created",
        changedAt: new Date('2024-01-08'),
        previousStatus: null
      },
      {
        status: "applied",
        changedAt: new Date('2024-01-12'),
        previousStatus: "created"
      },
      {
        status: "screening",
        changedAt: new Date('2024-01-18'),
        previousStatus: "applied"
      }
    ]
  },
  {
    jobTitle: "Backend Engineer - Python/Django",
    company: "DataVault Systems",
    jobUrl: "https://datavault.com/careers/backend-engineer",
    jobDescription: `DataVault Systems is seeking a talented Backend Engineer to join our data infrastructure team. We're building scalable systems that handle millions of data points and serve thousands of users worldwide.

**Position Overview:**
You'll be responsible for designing, developing, and maintaining our backend services that power our data analytics platform. This role involves working with large datasets, building robust APIs, and ensuring system reliability and performance.

**Key Responsibilities:**
- Design and develop scalable backend services using Python and Django
- Build and maintain RESTful APIs and GraphQL endpoints
- Work with PostgreSQL, Redis, and Elasticsearch for data storage and retrieval
- Implement data processing pipelines and ETL workflows
- Optimize database queries and improve system performance
- Write comprehensive tests and maintain code quality
- Collaborate with DevOps team on deployment and monitoring
- Participate in system architecture decisions and technical planning

**Technical Skills Required:**
- 4+ years of Python development experience
- Strong experience with Django and Django REST Framework
- Proficiency with PostgreSQL and database optimization
- Experience with Redis for caching and session management
- Knowledge of message queues (Celery, RabbitMQ, or Apache Kafka)
- Understanding of microservices architecture
- Experience with Docker and containerization
- Familiarity with cloud platforms (AWS, GCP, or Azure)

**Additional Qualifications:**
- Experience with data processing libraries (Pandas, NumPy)
- Knowledge of machine learning frameworks (scikit-learn, TensorFlow)
- Experience with monitoring and logging tools (Prometheus, Grafana, ELK Stack)
- Understanding of security best practices and data protection
- Experience with API documentation tools (Swagger, OpenAPI)

**What We Offer:**
- Competitive salary: $110,000 - $140,000
- Stock options and equity participation
- Comprehensive health and wellness benefits
- Flexible PTO and work-from-home options
- Professional development budget
- State-of-the-art equipment and tools
- Collaborative and innovative work environment

**Company Culture:**
We're a data-driven company that values innovation, collaboration, and continuous learning. Our team consists of talented engineers who are passionate about solving complex problems and building systems that make a real impact.

**Growth Opportunities:**
- Technical leadership roles
- Architecture and system design responsibilities
- Mentoring junior developers
- Conference speaking and technical writing opportunities`,
    location: "Austin, TX (Hybrid)",
    salary: {
      min: 110000,
      max: 140000,
      currency: "USD",
      period: "yearly"
    },
    sponsorship: "yes",
    status: "interview",
    priority: "high",
    applicationDate: new Date('2024-01-08'),
    deadline: new Date('2024-02-20'),
    notes: "Technical interview scheduled. Need to review system design concepts and Python best practices.",
    tags: ["Python", "Django", "PostgreSQL", "Backend", "API Development", "Data Processing"],
    contacts: [
      {
        name: "David Kim",
        role: "Senior Backend Engineer",
        email: "david.kim@datavault.com",
        linkedin: "https://linkedin.com/in/davidkim"
      },
      {
        name: "Lisa Wang",
        role: "Engineering Director",
        email: "lisa.wang@datavault.com",
        phone: "+1-555-0789",
        linkedin: "https://linkedin.com/in/lisawang"
      }
    ],
    interviews: [
      {
        type: "technical",
        date: new Date('2024-01-30T10:00:00Z'),
        duration: 90,
        interviewer: "David Kim",
        notes: "System design and coding challenge interview",
        outcome: "scheduled"
      },
      {
        type: "onsite",
        date: new Date('2024-02-05T09:00:00Z'),
        duration: 120,
        interviewer: "Lisa Wang",
        notes: "Final round with engineering team",
        outcome: "scheduled"
      }
    ],
    followUps: [
      {
        date: new Date('2024-01-20'),
        type: "email",
        description: "Followed up on application status",
        outcome: "Received interview invitation"
      }
    ],
    source: "indeed",
    sourceUrl: "https://indeed.com/viewjob?jk=1234567890",
    atsScore: 92,
    atsAnalysis: {
      matchedKeywords: ["Python", "Django", "PostgreSQL", "REST API", "Docker"],
      missingKeywords: ["GraphQL", "Machine Learning"],
      suggestions: ["Consider adding GraphQL experience", "Highlight any ML/AI projects"],
      analyzedAt: new Date()
    },
    statusHistory: [
      {
        status: "created",
        changedAt: new Date('2024-01-05'),
        previousStatus: null
      },
      {
        status: "applied",
        changedAt: new Date('2024-01-08'),
        previousStatus: "created"
      },
      {
        status: "screening",
        changedAt: new Date('2024-01-15'),
        previousStatus: "applied"
      },
      {
        status: "interview",
        changedAt: new Date('2024-01-22'),
        previousStatus: "screening"
      }
    ]
  },
  {
    jobTitle: "DevOps Engineer - Cloud Infrastructure",
    company: "CloudScale Technologies",
    jobUrl: "https://cloudscale.com/careers/devops-engineer",
    jobDescription: `CloudScale Technologies is looking for a skilled DevOps Engineer to join our infrastructure team. You'll be responsible for designing, implementing, and maintaining our cloud infrastructure that supports our growing platform.

**Role Summary:**
As a DevOps Engineer, you'll work closely with development teams to streamline deployment processes, ensure system reliability, and optimize our cloud infrastructure. You'll be instrumental in building and maintaining our CI/CD pipelines and monitoring systems.

**Primary Responsibilities:**
- Design and implement cloud infrastructure using AWS, Azure, or GCP
- Build and maintain CI/CD pipelines using Jenkins, GitLab CI, or GitHub Actions
- Manage containerized applications using Docker and Kubernetes
- Implement Infrastructure as Code using Terraform or CloudFormation
- Set up monitoring, logging, and alerting systems
- Ensure security best practices and compliance requirements
- Collaborate with development teams to optimize application performance
- Troubleshoot production issues and implement solutions

**Technical Requirements:**
- 3+ years of DevOps or Site Reliability Engineering experience
- Strong experience with cloud platforms (AWS, Azure, or GCP)
- Proficiency with containerization technologies (Docker, Kubernetes)
- Experience with Infrastructure as Code tools (Terraform, CloudFormation)
- Knowledge of CI/CD tools and practices
- Experience with monitoring tools (Prometheus, Grafana, DataDog)
- Scripting skills in Python, Bash, or PowerShell
- Understanding of networking and security concepts

**Preferred Skills:**
- Experience with microservices architecture
- Knowledge of service mesh technologies (Istio, Linkerd)
- Experience with database administration and optimization
- Understanding of security scanning and vulnerability management
- Experience with GitOps workflows
- Knowledge of cost optimization strategies

**What We Provide:**
- Salary range: $100,000 - $130,000
- Comprehensive health, dental, and vision coverage
- 401(k) with generous company matching
- Flexible work arrangements and unlimited PTO
- Professional development and certification support
- Home office setup allowance
- Annual team building events

**Growth Path:**
- Senior DevOps Engineer
- DevOps Team Lead
- Cloud Architecture roles
- Technical consulting opportunities

**Our Mission:**
We're building the future of cloud infrastructure, making it easier for companies to scale and deploy their applications securely and efficiently.`,
    location: "Seattle, WA (Remote)",
    salary: {
      min: 100000,
      max: 130000,
      currency: "USD",
      period: "yearly"
    },
    sponsorship: "yes",
    status: "offer",
    priority: "high",
    applicationDate: new Date('2024-01-05'),
    deadline: new Date('2024-02-10'),
    notes: "Received offer! Need to review compensation package and negotiate terms.",
    tags: ["DevOps", "AWS", "Kubernetes", "Docker", "Terraform", "CI/CD"],
    contacts: [
      {
        name: "Alex Thompson",
        role: "DevOps Manager",
        email: "alex.thompson@cloudscale.com",
        phone: "+1-555-0321",
        linkedin: "https://linkedin.com/in/alexthompson"
      },
      {
        name: "Maria Garcia",
        role: "VP of Engineering",
        email: "maria.garcia@cloudscale.com",
        linkedin: "https://linkedin.com/in/mariagarcia"
      }
    ],
    interviews: [
      {
        type: "phone",
        date: new Date('2024-01-10T14:00:00Z'),
        duration: 45,
        interviewer: "Alex Thompson",
        notes: "Initial screening - discussed experience and goals",
        outcome: "completed"
      },
      {
        type: "technical",
        date: new Date('2024-01-18T10:00:00Z'),
        duration: 90,
        interviewer: "Alex Thompson",
        notes: "Technical interview covering AWS, Kubernetes, and infrastructure design",
        outcome: "completed",
        feedback: "Strong technical knowledge, good problem-solving approach"
      },
      {
        type: "onsite",
        date: new Date('2024-01-25T09:00:00Z'),
        duration: 120,
        interviewer: "Maria Garcia",
        notes: "Final interview with leadership team",
        outcome: "completed",
        feedback: "Excellent cultural fit, strong communication skills"
      }
    ],
    followUps: [
      {
        date: new Date('2024-01-26'),
        type: "email",
        description: "Sent thank you email after final interview",
        outcome: "Received positive feedback"
      },
      {
        date: new Date('2024-01-28'),
        type: "phone",
        description: "Phone call with Alex to discuss offer details",
        outcome: "Received verbal offer"
      }
    ],
    source: "referral",
    sourceUrl: "https://cloudscale.com/careers",
    atsScore: 95,
    atsAnalysis: {
      matchedKeywords: ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD", "DevOps"],
      missingKeywords: [],
      suggestions: ["Perfect match for this role!"],
      analyzedAt: new Date()
    },
    statusHistory: [
      {
        status: "created",
        changedAt: new Date('2024-01-02'),
        previousStatus: null
      },
      {
        status: "applied",
        changedAt: new Date('2024-01-05'),
        previousStatus: "created"
      },
      {
        status: "screening",
        changedAt: new Date('2024-01-08'),
        previousStatus: "applied"
      },
      {
        status: "interview",
        changedAt: new Date('2024-01-12'),
        previousStatus: "screening"
      },
      {
        status: "offer",
        changedAt: new Date('2024-01-29'),
        previousStatus: "interview"
      }
    ]
  },
  {
    jobTitle: "Mobile App Developer - React Native",
    company: "AppFlow Mobile",
    jobUrl: "https://appflow.com/careers/mobile-developer",
    jobDescription: `AppFlow Mobile is seeking a talented Mobile App Developer with expertise in React Native to join our innovative team. We're building cutting-edge mobile applications that serve millions of users worldwide.

**About the Position:**
You'll be responsible for developing and maintaining our flagship mobile applications using React Native. This role involves working with cross-platform development, native integrations, and ensuring optimal performance across iOS and Android devices.

**Key Responsibilities:**
- Develop and maintain React Native applications for iOS and Android
- Collaborate with UI/UX designers to implement pixel-perfect designs
- Integrate with RESTful APIs and third-party services
- Optimize app performance and ensure smooth user experience
- Write clean, maintainable, and well-tested code
- Participate in code reviews and maintain coding standards
- Work with native modules when needed for platform-specific features
- Stay updated with the latest mobile development trends and technologies

**Technical Requirements:**
- 3+ years of mobile development experience
- Strong proficiency in React Native and JavaScript/TypeScript
- Experience with iOS and Android development
- Knowledge of native mobile development (Swift, Kotlin, or Java)
- Experience with state management (Redux, MobX, or Context API)
- Familiarity with mobile testing frameworks (Jest, Detox)
- Understanding of mobile app architecture patterns
- Experience with version control and collaborative development

**Additional Skills:**
- Experience with native module development
- Knowledge of mobile app deployment processes
- Understanding of app store guidelines and submission processes
- Experience with push notifications and offline functionality
- Knowledge of mobile security best practices
- Experience with analytics and crash reporting tools

**What We Offer:**
- Competitive salary: $85,000 - $115,000
- Health, dental, and vision insurance
- Flexible work schedule and remote work options
- Professional development opportunities
- Latest development tools and equipment
- Collaborative and creative work environment
- Team events and company outings

**Our Culture:**
We're a fast-paced, innovative company that values creativity, collaboration, and continuous learning. Our team is passionate about creating mobile experiences that users love.

**Career Growth:**
- Senior Mobile Developer
- Mobile Team Lead
- Technical Architect roles
- Product management opportunities`,
    location: "Los Angeles, CA (Hybrid)",
    salary: {
      min: 85000,
      max: 115000,
      currency: "USD",
      period: "yearly"
    },
    sponsorship: "no",
    status: "rejected",
    priority: "medium",
    applicationDate: new Date('2024-01-03'),
    deadline: new Date('2024-02-15'),
    notes: "Rejected after technical interview. Need to improve React Native skills and native development knowledge.",
    tags: ["React Native", "Mobile Development", "iOS", "Android", "JavaScript", "TypeScript"],
    contacts: [
      {
        name: "James Wilson",
        role: "Mobile Team Lead",
        email: "james.wilson@appflow.com",
        linkedin: "https://linkedin.com/in/jameswilson"
      }
    ],
    interviews: [
      {
        type: "phone",
        date: new Date('2024-01-08T15:00:00Z'),
        duration: 30,
        interviewer: "James Wilson",
        notes: "Initial screening call",
        outcome: "completed"
      },
      {
        type: "technical",
        date: new Date('2024-01-15T11:00:00Z'),
        duration: 90,
        interviewer: "James Wilson",
        notes: "Technical interview with coding challenge",
        outcome: "completed",
        feedback: "Good JavaScript skills but needs improvement in React Native and native development"
      }
    ],
    followUps: [
      {
        date: new Date('2024-01-16'),
        type: "email",
        description: "Sent thank you email after technical interview",
        outcome: "Received rejection feedback"
      }
    ],
    source: "linkedin",
    sourceUrl: "https://linkedin.com/jobs/view/0987654321",
    atsScore: 65,
    atsAnalysis: {
      matchedKeywords: ["React Native", "JavaScript", "Mobile Development"],
      missingKeywords: ["iOS", "Android", "Native Development", "TypeScript"],
      suggestions: ["Add native iOS/Android development experience", "Learn TypeScript", "Build more React Native projects"],
      analyzedAt: new Date()
    },
    statusHistory: [
      {
        status: "created",
        changedAt: new Date('2024-01-01'),
        previousStatus: null
      },
      {
        status: "applied",
        changedAt: new Date('2024-01-03'),
        previousStatus: "created"
      },
      {
        status: "screening",
        changedAt: new Date('2024-01-06'),
        previousStatus: "applied"
      },
      {
        status: "interview",
        changedAt: new Date('2024-01-10'),
        previousStatus: "screening"
      },
      {
        status: "rejected",
        changedAt: new Date('2024-01-17'),
        previousStatus: "interview"
      }
    ]
  },
  {
    jobTitle: "Data Scientist - Machine Learning",
    company: "AI Insights Corp",
    jobUrl: "https://aiinsights.com/careers/data-scientist",
    jobDescription: `AI Insights Corp is looking for a passionate Data Scientist with expertise in machine learning to join our AI research team. We're building innovative AI solutions that transform how businesses make data-driven decisions.

**Position Overview:**
As a Data Scientist, you'll work on cutting-edge machine learning projects, from data collection and preprocessing to model development and deployment. You'll collaborate with cross-functional teams to deliver AI solutions that drive business value.

**Key Responsibilities:**
- Develop and implement machine learning models and algorithms
- Analyze large datasets to extract meaningful insights
- Build predictive models for various business applications
- Collaborate with engineering teams to deploy models in production
- Conduct statistical analysis and A/B testing
- Present findings and recommendations to stakeholders
- Stay current with the latest ML/AI research and technologies
- Mentor junior data scientists and contribute to team knowledge sharing

**Technical Requirements:**
- Master's degree in Data Science, Statistics, Computer Science, or related field
- 4+ years of experience in data science and machine learning
- Proficiency in Python and R for data analysis
- Experience with ML libraries (scikit-learn, TensorFlow, PyTorch)
- Strong knowledge of statistical methods and experimental design
- Experience with data visualization tools (Matplotlib, Seaborn, Tableau)
- Familiarity with SQL and database systems
- Experience with cloud platforms (AWS, GCP, or Azure)

**Preferred Qualifications:**
- PhD in a quantitative field
- Experience with deep learning and neural networks
- Knowledge of MLOps and model deployment practices
- Experience with big data technologies (Spark, Hadoop)
- Understanding of natural language processing
- Experience with time series analysis and forecasting
- Knowledge of computer vision techniques

**What We Provide:**
- Salary range: $120,000 - $150,000
- Comprehensive health and wellness benefits
- Flexible work arrangements and unlimited PTO
- Professional development and conference attendance
- State-of-the-art research equipment and tools
- Collaborative and intellectually stimulating environment
- Opportunities for research publication and patent development

**Research Opportunities:**
- Publish research papers in top-tier conferences
- Contribute to open-source ML projects
- Collaborate with academic institutions
- Patent novel AI/ML innovations

**Our Mission:**
We're democratizing AI by making advanced machine learning accessible to businesses of all sizes. Join us in shaping the future of artificial intelligence!`,
    location: "Boston, MA (On-site)",
    salary: {
      min: 120000,
      max: 150000,
      currency: "USD",
      period: "yearly"
    },
    sponsorship: "yes",
    status: "created",
    priority: "low",
    applicationDate: null,
    deadline: new Date('2024-03-01'),
    notes: "Interesting role but requires relocation to Boston. Need to consider if it's worth the move.",
    tags: ["Machine Learning", "Python", "Data Science", "AI", "Statistics", "Research"],
    contacts: [
      {
        name: "Dr. Sarah Chen",
        role: "Head of Data Science",
        email: "sarah.chen@aiinsights.com",
        linkedin: "https://linkedin.com/in/sarahchen"
      }
    ],
    interviews: [],
    followUps: [],
    source: "company-website",
    sourceUrl: "https://aiinsights.com/careers",
    atsScore: 88,
    atsAnalysis: {
      matchedKeywords: ["Python", "Machine Learning", "Data Science", "Statistics", "TensorFlow"],
      missingKeywords: ["Deep Learning", "MLOps", "Big Data"],
      suggestions: ["Add deep learning experience", "Highlight MLOps knowledge", "Include big data technologies"],
      analyzedAt: new Date()
    },
    statusHistory: [
      {
        status: "created",
        changedAt: new Date('2024-01-30'),
        previousStatus: null
      }
    ]
  },
  {
    jobTitle: "Product Manager - SaaS Platform",
    company: "SaaS Solutions Inc",
    jobUrl: "https://saassolutions.com/careers/product-manager",
    jobDescription: `SaaS Solutions Inc is seeking an experienced Product Manager to lead the development of our flagship SaaS platform. You'll work closely with engineering, design, and business teams to deliver products that delight our customers.

**Role Summary:**
As a Product Manager, you'll be responsible for defining product strategy, prioritizing features, and ensuring successful product delivery. You'll serve as the bridge between business objectives and technical implementation.

**Key Responsibilities:**
- Define product vision, strategy, and roadmap
- Gather and analyze customer requirements and market research
- Create detailed product specifications and user stories
- Collaborate with engineering teams to ensure successful feature delivery
- Work with design teams to create intuitive user experiences
- Analyze product metrics and user feedback to drive improvements
- Coordinate with marketing and sales teams on product launches
- Manage stakeholder expectations and communicate product updates

**Required Qualifications:**
- 5+ years of product management experience in SaaS or technology companies
- Strong analytical and problem-solving skills
- Experience with agile development methodologies
- Excellent communication and presentation skills
- Understanding of software development processes
- Experience with product analytics and user research
- Bachelor's degree in Business, Engineering, or related field

**Preferred Skills:**
- Experience with B2B SaaS products
- Knowledge of API design and integration
- Experience with data visualization and analytics tools
- Understanding of user experience design principles
- Experience with A/B testing and experimentation
- Knowledge of competitive analysis and market research

**What We Offer:**
- Competitive salary: $130,000 - $160,000
- Equity participation and performance bonuses
- Comprehensive health and wellness benefits
- Flexible work arrangements and remote work options
- Professional development and leadership training
- Modern office space with collaborative work areas
- Team building events and company retreats

**Career Growth:**
- Senior Product Manager
- Director of Product
- VP of Product
- Chief Product Officer

**Our Culture:**
We're a customer-centric company that values innovation, collaboration, and data-driven decision making. Our team is passionate about building products that solve real problems for our users.`,
    location: "Chicago, IL (Hybrid)",
    salary: {
      min: 130000,
      max: 160000,
      currency: "USD",
      period: "yearly"
    },
    sponsorship: "no",
    status: "withdrawn",
    priority: "low",
    applicationDate: new Date('2024-01-20'),
    deadline: new Date('2024-03-15'),
    notes: "Withdrawn application - decided to focus on technical roles instead of product management.",
    tags: ["Product Management", "SaaS", "Strategy", "Agile", "Analytics", "Leadership"],
    contacts: [
      {
        name: "Jennifer Martinez",
        role: "VP of Product",
        email: "jennifer.martinez@saassolutions.com",
        linkedin: "https://linkedin.com/in/jennifermartinez"
      }
    ],
    interviews: [],
    followUps: [
      {
        date: new Date('2024-01-25'),
        type: "email",
        description: "Sent withdrawal email to Jennifer",
        outcome: "Received acknowledgment"
      }
    ],
    source: "indeed",
    sourceUrl: "https://indeed.com/viewjob?jk=1122334455",
    atsScore: 72,
    atsAnalysis: {
      matchedKeywords: ["Product Management", "SaaS", "Agile", "Analytics"],
      missingKeywords: ["B2B", "API Design", "User Research"],
      suggestions: ["Add B2B SaaS experience", "Highlight API knowledge", "Include user research skills"],
      analyzedAt: new Date()
    },
    statusHistory: [
      {
        status: "created",
        changedAt: new Date('2024-01-18'),
        previousStatus: null
      },
      {
        status: "applied",
        changedAt: new Date('2024-01-20'),
        previousStatus: "created"
      },
      {
        status: "withdrawn",
        changedAt: new Date('2024-01-25'),
        previousStatus: "applied"
      }
    ]
  }
];

// Create mock jobs for the specified user
async function createMockJobs() {
  try {
    await connectDB();
    
    const userId = '690229b423277e3f654d3d49';
    
    console.log(`🧪 Creating ${mockJobs.length} mock jobs for user: ${userId}`);
    
    // Check if user exists
    const User = mongoose.model('User', new mongoose.Schema({
      _id: mongoose.Schema.Types.ObjectId,
      email: String,
      firstName: String,
      lastName: String
    }));
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found. Please verify the user ID.');
      return;
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    
    // Clear existing jobs for this user (optional - remove if you want to keep existing jobs)
    const existingJobs = await Job.find({ userId: new mongoose.Types.ObjectId(userId) });
    if (existingJobs.length > 0) {
      console.log(`🗑️  Found ${existingJobs.length} existing jobs. Deleting them...`);
      await Job.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
    }
    
    // Create new jobs
    const createdJobs = [];
    for (let i = 0; i < mockJobs.length; i++) {
      const jobData = mockJobs[i];
      const job = new Job({
        ...jobData,
        jobid: `job_${userId}_${Date.now()}_${i}`, // Generate unique jobid
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      await job.save();
      createdJobs.push(job);
      console.log(`✅ Created job: ${job.jobTitle} at ${job.company}`);
    }
    
    console.log(`\n🎉 Successfully created ${createdJobs.length} mock jobs!`);
    console.log('\n📊 Job Summary:');
    createdJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.jobTitle} at ${job.company} - Status: ${job.status} - Priority: ${job.priority}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating mock jobs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the function
createMockJobs();
