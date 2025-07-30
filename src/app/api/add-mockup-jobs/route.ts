import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';
import JobApplication from '@/models/JobApplication';

// Mockup jobs data
const mockupJobs = [
  {
    jobTitle: 'AI/ML Engineer',
    company: 'FutureTech Labs',
    location: 'Seattle, WA',
    jobUrl: 'https://futuretechlabs.com/careers/ai-ml-engineer',
    jobDescription: 'Join our AI team to develop cutting-edge machine learning models and algorithms.',
    salary: {
      min: 150000,
      max: 220000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'created',
    priority: 'high',
    applicationDate: null,
    notes: 'Need to research company and prepare application materials',
    contacts: [
      {
        name: 'Dr. Emily Chen',
        role: 'AI Research Lead',
        email: 'emily.chen@futuretechlabs.com',
        linkedin: 'https://linkedin.com/in/emilychen'
      }
    ],
    tags: ['Machine Learning', 'Python', 'TensorFlow', 'AI Research']
  },
  {
    jobTitle: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    jobUrl: 'https://techcorp.com/careers/frontend-dev',
    jobDescription: 'We are looking for a Senior Frontend Developer to join our team and help build amazing user experiences.',
    salary: {
      min: 120000,
      max: 180000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'applied',
    priority: 'high',
    applicationDate: new Date('2024-01-15'),
    notes: 'Great company culture, remote-friendly, excellent benefits package',
    contacts: [
      {
        name: 'Sarah Johnson',
        role: 'Senior Recruiter',
        email: 'sarah.johnson@techcorp.com',
        linkedin: 'https://linkedin.com/in/sarahjohnson'
      }
    ],
    tags: ['React', 'TypeScript', 'Frontend', 'Remote']
  },
  {
    jobTitle: 'Full Stack Engineer',
    company: 'StartupXYZ',
    location: 'New York, NY',
    jobUrl: 'https://startupxyz.com/jobs/fullstack',
    jobDescription: 'Join our fast-growing startup and help build the next big thing in fintech.',
    salary: {
      min: 100000,
      max: 150000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'screening',
    priority: 'medium',
    applicationDate: new Date('2024-01-20'),
    notes: 'Exciting startup with great potential, equity included',
    contacts: [
      {
        name: 'Mike Chen',
        role: 'CTO',
        email: 'mike@startupxyz.com',
        linkedin: 'https://linkedin.com/in/mikechen'
      }
    ],
    tags: ['Node.js', 'React', 'MongoDB', 'Startup']
  },
  {
    jobTitle: 'Software Engineer',
    company: 'BigTech Solutions',
    location: 'Seattle, WA',
    jobUrl: 'https://bigtech.com/careers/software-engineer',
    jobDescription: 'Work on cutting-edge technology and solve complex problems at scale.',
    salary: {
      min: 130000,
      max: 200000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'interview',
    priority: 'high',
    applicationDate: new Date('2024-01-10'),
    notes: 'Technical interview scheduled for next week',
    contacts: [
      {
        name: 'Alex Rodriguez',
        role: 'Engineering Manager',
        email: 'alex.rodriguez@bigtech.com',
        linkedin: 'https://linkedin.com/in/alexrodriguez'
      }
    ],
    interviews: [
      {
        type: 'technical',
        date: new Date('2025-02-05'),
        duration: 60,
        interviewer: 'Alex Rodriguez',
        notes: 'Focus on system design and algorithms',
        outcome: 'scheduled'
      }
    ],
    tags: ['Java', 'Spring', 'Microservices', 'AWS']
  },
  {
    jobTitle: 'DevOps Engineer',
    company: 'CloudFirst',
    location: 'Austin, TX',
    jobUrl: 'https://cloudfirst.com/jobs/devops',
    jobDescription: 'Help us build and maintain our cloud infrastructure and CI/CD pipelines.',
    salary: {
      min: 110000,
      max: 160000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'offer',
    priority: 'medium',
    applicationDate: new Date('2024-01-05'),
    notes: 'Received offer, negotiating salary and benefits',
    contacts: [
      {
        name: 'Lisa Wang',
        role: 'VP of Engineering',
        email: 'lisa.wang@cloudfirst.com',
        linkedin: 'https://linkedin.com/in/lisawang'
      }
    ],
    tags: ['Docker', 'Kubernetes', 'AWS', 'CI/CD']
  },
  {
    jobTitle: 'Product Manager',
    company: 'InnovateTech',
    location: 'Boston, MA',
    jobUrl: 'https://innovatetech.com/careers/product-manager',
    jobDescription: 'Lead product strategy and development for our flagship platform.',
    salary: {
      min: 140000,
      max: 190000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'rejected',
    priority: 'low',
    applicationDate: new Date('2024-01-12'),
    notes: 'Rejected after final round, feedback: need more product experience',
    contacts: [
      {
        name: 'David Kim',
        role: 'Head of Product',
        email: 'david.kim@innovatetech.com',
        linkedin: 'https://linkedin.com/in/davidkim'
      }
    ],
    tags: ['Product Management', 'Agile', 'User Research', 'Analytics']
  },
  {
    jobTitle: 'Data Scientist',
    company: 'DataFlow Analytics',
    location: 'Chicago, IL',
    jobUrl: 'https://dataflow.com/jobs/data-scientist',
    jobDescription: 'Apply machine learning and statistical analysis to solve business problems.',
    salary: {
      min: 120000,
      max: 170000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'applied',
    priority: 'medium',
    applicationDate: new Date('2024-01-25'),
    notes: 'Interesting role, need to research company more',
    contacts: [
      {
        name: 'Emma Thompson',
        role: 'Data Science Lead',
        email: 'emma.thompson@dataflow.com',
        linkedin: 'https://linkedin.com/in/emmathompson'
      }
    ],
    tags: ['Python', 'Machine Learning', 'SQL', 'Statistics']
  },
  {
    jobTitle: 'UX Designer',
    company: 'DesignStudio',
    location: 'Portland, OR',
    jobUrl: 'https://designstudio.com/careers/ux-designer',
    jobDescription: 'Create beautiful and intuitive user experiences for our products.',
    salary: {
      min: 90000,
      max: 140000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'applied',
    priority: 'low',
    applicationDate: new Date('2024-01-18'),
    notes: 'Creative company, great work-life balance',
    contacts: [
      {
        name: 'Rachel Green',
        role: 'Design Director',
        email: 'rachel.green@designstudio.com',
        linkedin: 'https://linkedin.com/in/rachelgreen'
      }
    ],
    tags: ['Figma', 'User Research', 'Prototyping', 'Design Systems']
  },
  {
    jobTitle: 'Backend Developer',
    company: 'API Solutions',
    location: 'Denver, CO',
    jobUrl: 'https://apisolutions.com/jobs/backend-dev',
    jobDescription: 'Build scalable backend services and APIs for our platform.',
    salary: {
      min: 100000,
      max: 150000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'screening',
    priority: 'medium',
    applicationDate: new Date('2024-01-22'),
    notes: 'Good tech stack, remote work available',
    contacts: [
      {
        name: 'Tom Wilson',
        role: 'Backend Team Lead',
        email: 'tom.wilson@apisolutions.com',
        linkedin: 'https://linkedin.com/in/tomwilson'
      }
    ],
    tags: ['Python', 'Django', 'PostgreSQL', 'REST APIs']
  },
  {
    jobTitle: 'Mobile Developer',
    company: 'AppWorks',
    location: 'Miami, FL',
    jobUrl: 'https://appworks.com/careers/mobile-dev',
    jobDescription: 'Develop native mobile applications for iOS and Android platforms.',
    salary: {
      min: 95000,
      max: 140000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'interview',
    priority: 'high',
    applicationDate: new Date('2024-01-08'),
    notes: 'Second interview scheduled, technical assessment completed',
    contacts: [
      {
        name: 'Maria Garcia',
        role: 'Mobile Engineering Manager',
        email: 'maria.garcia@appworks.com',
        linkedin: 'https://linkedin.com/in/mariagarcia'
      }
    ],
    interviews: [
      {
        type: 'technical',
        date: new Date('2025-01-30'),
        duration: 45,
        interviewer: 'Maria Garcia',
        notes: 'Code review and architecture discussion',
        outcome: 'completed',
        feedback: 'Strong technical skills, good problem-solving approach'
      }
    ],
    tags: ['React Native', 'iOS', 'Android', 'Mobile Development']
  },
  {
    jobTitle: 'QA Engineer',
    company: 'QualityFirst',
    location: 'Phoenix, AZ',
    jobUrl: 'https://qualityfirst.com/jobs/qa-engineer',
    jobDescription: 'Ensure software quality through comprehensive testing and automation.',
    salary: {
      min: 80000,
      max: 120000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'accepted',
    priority: 'medium',
    applicationDate: new Date('2024-01-03'),
    notes: 'Accepted offer! Starting next month',
    contacts: [
      {
        name: 'Kevin Lee',
        role: 'QA Manager',
        email: 'kevin.lee@qualityfirst.com',
        linkedin: 'https://linkedin.com/in/kevinlee'
      }
    ],
    tags: ['Selenium', 'Jest', 'Test Automation', 'Quality Assurance']
  },
  {
    jobTitle: 'Blockchain Developer',
    company: 'CryptoInnovate',
    location: 'Remote',
    jobUrl: 'https://cryptoinnovate.com/careers/blockchain-dev',
    jobDescription: 'Build decentralized applications and smart contracts on various blockchain platforms.',
    salary: {
      min: 130000,
      max: 200000,
      currency: 'USD',
      period: 'yearly'
    },
    status: 'created',
    priority: 'medium',
    applicationDate: null,
    notes: 'Interesting role in emerging technology, need to learn more about the company',
    contacts: [
      {
        name: 'Alex Thompson',
        role: 'Blockchain Lead',
        email: 'alex.thompson@cryptoinnovate.com',
        linkedin: 'https://linkedin.com/in/alexthompson'
      }
    ],
    tags: ['Solidity', 'Ethereum', 'Smart Contracts', 'Web3']
  }
];

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Find or create user jamie@gmail.com
    let user = await User.findOne({ email: 'jamie@gmail.com' });
    
    if (!user) {
      console.log('Creating user jamie@gmail.com...');
      user = new User({
        email: 'jamie@gmail.com',
        password: 'password123',
        firstName: 'Jamie',
        lastName: 'Smith',
        isEmailVerified: true,
        subscription: {
          plan: 'pro',
          status: 'active',
          startDate: new Date(),
          seats: 5,
          storageUsed: 0
        }
      });
      await user.save();
      console.log('User created successfully');
    } else {
      console.log('User jamie@gmail.com already exists');
    }

    // Find or create a CV for the user
    let cv = await CV.findOne({ userId: user._id });
    
    if (!cv) {
      console.log('Creating CV for user...');
      cv = new CV({
        userId: user._id,
        title: 'Jamie Smith - Professional CV',
        template: 'modern',
        status: 'published',
        sections: {
          personalInfo: {
            firstName: 'Jamie',
            lastName: 'Smith',
            email: 'jamie@gmail.com',
            phone: '+1 (555) 123-4567',
            location: 'San Francisco, CA',
            linkedin: 'https://linkedin.com/in/jamiesmith',
            github: 'https://github.com/jamiesmith',
            summary: 'Experienced software developer with 5+ years in full-stack development, specializing in React, Node.js, and cloud technologies.'
          },
          experience: [
            {
              company: 'TechCorp',
              position: 'Senior Developer',
              location: 'San Francisco, CA',
              startDate: new Date('2022-01-01'),
              endDate: new Date('2024-01-01'),
              current: false,
              description: 'Led development of multiple web applications using React and Node.js',
              achievements: [
                'Improved application performance by 40%',
                'Mentored 3 junior developers',
                'Implemented CI/CD pipeline'
              ]
            }
          ],
          education: [
            {
              institution: 'University of California',
              degree: 'Bachelor of Science',
              field: 'Computer Science',
              location: 'Berkeley, CA',
              startDate: new Date('2018-09-01'),
              endDate: new Date('2022-05-01'),
              current: false,
              gpa: 3.8
            }
          ],
          skills: [
            {
              category: 'Programming Languages',
              skills: ['JavaScript', 'TypeScript', 'Python', 'Java']
            },
            {
              category: 'Frameworks & Libraries',
              skills: ['React', 'Node.js', 'Express', 'Django']
            },
            {
              category: 'Databases',
              skills: ['MongoDB', 'PostgreSQL', 'Redis']
            }
          ],
          projects: [
            {
              title: 'E-commerce Platform',
              description: 'Built a full-stack e-commerce platform with React and Node.js',
              technologies: ['React', 'Node.js', 'MongoDB', 'Stripe'],
              github: 'https://github.com/jamiesmith/ecommerce',
              startDate: new Date('2023-01-01'),
              endDate: new Date('2023-06-01'),
              current: false
            }
          ],
          certifications: [
            {
              name: 'AWS Certified Developer',
              issuer: 'Amazon Web Services',
              date: new Date('2023-03-01'),
              url: 'https://aws.amazon.com/certification/'
            }
          ],
          languages: [
            {
              language: 'English',
              proficiency: 'native'
            },
            {
              language: 'Spanish',
              proficiency: 'intermediate'
            }
          ],
          customSections: []
        }
      });
      await cv.save();
      console.log('CV created successfully');
    } else {
      console.log('CV already exists for user');
    }

    // Delete existing jobs for this user (to avoid duplicates)
    await JobApplication.deleteMany({ userId: user._id });
    console.log('Cleared existing jobs for user');

    // Create mockup jobs
    console.log('Creating mockup jobs...');
    const jobPromises = mockupJobs.map(jobData => {
      const job = new JobApplication({
        userId: user._id,
        cvId: cv._id,
        ...jobData
      });
      return job.save();
    });

    await Promise.all(jobPromises);
    console.log(`Successfully created ${mockupJobs.length} mockup jobs for jamie@gmail.com`);

    // Verify the jobs were created
    const jobCount = await JobApplication.countDocuments({ userId: user._id });

    return NextResponse.json({
      success: true,
      message: `Successfully created ${mockupJobs.length} mockup jobs for jamie@gmail.com`,
      data: {
        userId: user._id,
        cvId: cv._id,
        jobsCreated: mockupJobs.length,
        totalJobsInDB: jobCount
      }
    });

  } catch (error: any) {
    console.error('Error adding mockup jobs:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to add mockup jobs',
        error: error.message
      },
      { status: 500 }
    );
  }
} 