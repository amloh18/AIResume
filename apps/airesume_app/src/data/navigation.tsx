import React from 'react';
import { FileText, Sparkles, CheckCircle, Briefcase, Chrome, Globe, LayoutDashboard, BookOpen, Linkedin, Search } from 'lucide-react';

export interface SubmenuItem {
  label: string;
  href: string;
  description?: string;
  icon?: React.ReactNode;
  snapshot?: string;
  ariaLabel?: string;
  isExternal?: boolean;
}

export interface FeaturedItem {
  title: string;
  description: string;
  href: string;
  image?: string;
  badge?: string;
  actionText?: string;
}

export interface NavLink {
  label: string;
  href: string;
  ariaLabel?: string;
  isExternal?: boolean;
  submenu?: SubmenuItem[];
  featured?: FeaturedItem;
}

export const navLinks: NavLink[] = [
  { 
    label: 'Products', 
    href: '#features', 
    ariaLabel: 'View products section',
    submenu: [
      { 
        label: 'Resume Builder', 
        description: 'Create an ATS-friendly resume with AI, write stronger content, and choose a professional template.', 
        href: '/ai-resume-builder', 
        ariaLabel: 'AI resume builder',
        icon: <Sparkles className="w-6 h-6 text-lime-400" />,
        snapshot: 'bg-gradient-to-br from-lime-500/20 to-green-600/20 border-lime-500/30'
      },
      { 
        label: 'Resume Templates', 
        description: 'Explore 15+ interactive ATS-friendly templates, section layouts, and modular snippets.', 
        href: '/templates', 
        ariaLabel: 'Explore resume templates and modular snippets',
        icon: <CheckCircle className="w-6 h-6 text-blue-400" />,
        snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30'
      },
      { 
        label: 'Resume Checker', 
        description: 'Test your resume against a job description for keyword matches and ATS compatibility.', 
        href: '/ats-resume-checker', 
        ariaLabel: 'ATS resume checker',
        icon: <CheckCircle className="w-6 h-6 text-blue-400" />,
        snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30'
      },
      { 
        label: 'Resume Score', 
        description: 'See how strong your resume is and get actionable recommendations to improve it.', 
        href: '/resume-score', 
        ariaLabel: 'Resume score checker',
        icon: <CheckCircle className="w-6 h-6 text-blue-400" />
      },
      { 
        label: 'AI Cover Letter', 
        description: 'Generate a job-specific, tailored cover letter in seconds with AI.', 
        href: '/ai-resume-builder', 
        ariaLabel: 'AI cover letter generator',
        icon: <FileText className="w-6 h-6 text-purple-400" />
      },
      { 
        label: 'Explore Jobs', 
        description: 'Search thousands of live roles by title, company, skills and location — free, no account needed.', 
        href: '/explore/jobs', 
        ariaLabel: 'Explore open jobs',
        icon: <Search className="w-6 h-6 text-emerald-400" />,
        snapshot: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30'
      },
      { 
        label: 'Job Tracker', 
        description: 'Save jobs, track applications, and manage your job search in one place.', 
        href: '/dashboard/jobs', 
        ariaLabel: 'Job application tracker',
        icon: <Briefcase className="w-6 h-6 text-orange-400" />
      },
      { 
        label: 'LinkedIn Enhancer', 
        description: 'Optimize your LinkedIn profile and headlines for maximum visibility to recruiters.', 
        href: '/linkedin-enhancer', 
        ariaLabel: 'LinkedIn Profile Enhancer',
        icon: <Linkedin className="w-6 h-6 text-blue-500" />
      },
    ],
    featured: {
      title: 'Interview Prep',
      description: 'Master your next interview with our real-time AI coach that analyzes your responses and provides instant feedback.',
      href: '/interview-coach',
      image: '/images/interviewcoach_dashbaord.webp',
      badge: 'New Feature',
      actionText: 'Try AI Coach'
    }
  },
  /*
    Direct top-level link — not a dropdown.

    `/explore/jobs` is the one surface that needs no account, so it gets a
    one-click entry rather than being buried a level down in Products. It is also
    listed inside the Products submenu, which is where people look for "jobs".
  */
  {
    label: 'Explore Jobs',
    href: '/explore/jobs',
    ariaLabel: 'Explore open jobs — free, no account needed',
  },
  { 
    label: 'Extension', 
    href: '#chrome-extension', 
    ariaLabel: 'View browser extension section',
    submenu: [
      { 
        label: 'Chrome Add-on', 
        description: 'Analyze jobs, extract requirements, and sync data directly from Google Chrome.', 
        href: '#chrome-extension', 
        ariaLabel: 'Chrome extension',
        icon: <Chrome className="w-6 h-6 text-yellow-400" />
      },
      { 
        label: 'Edge Add-on', 
        description: 'Native support for Microsoft Edge browser with full tracking capabilities.', 
        href: '#chrome-extension', 
        ariaLabel: 'Edge extension',
        icon: <Globe className="w-6 h-6 text-blue-400" />
      },
      { 
        label: 'One-Click Save', 
        description: 'Save job descriptions from LinkedIn, Indeed, and more with a single click.', 
        href: '#chrome-extension', 
        ariaLabel: 'One-click save',
        icon: <LayoutDashboard className="w-6 h-6 text-emerald-400" />
      },
    ],
    featured: {
      title: 'LinkedIn Optimizer',
      description: 'Transform your LinkedIn profile into a recruiter magnet with our browser-integrated enhancer.',
      href: '#chrome-extension',
      image: '/images/linkedin_enhancer_dashbaord.webp',
      badge: 'Popular',
      actionText: 'Get Extension'
    }
  },
  { 
    label: 'Resources', 
    href: '#how-it-works', 
    ariaLabel: 'View resources',
    submenu: [
      {
        label: 'How it Works',
        description: 'Step-by-step guide to building your master CV and landing your dream job.',
        href: '#how-it-works',
        ariaLabel: 'Learn how to create a resume',
        icon: <LayoutDashboard className="w-5 h-5 text-gray-400" />
      },
      {
        label: 'Blog',
        description: 'Research-backed career guides, ATS tips, and resume tutorials from AIResume.',
        href: '/blog',
        ariaLabel: 'Read the AIResume blog',
        icon: <BookOpen className="w-5 h-5 text-gray-400" />
      },
      { 
        label: 'Interview Prep', 
        description: 'Practice answering questions tailored specifically to your target job descriptions.', 
        href: '#features', 
        ariaLabel: 'Interview preparation',
        icon: <Sparkles className="w-5 h-5 text-gray-400" />
      },
      { 
        label: 'FAQ', 
        description: 'Find answers to common questions and get support from our team.', 
        href: '#faq', 
        ariaLabel: 'View FAQ',
        icon: <Briefcase className="w-5 h-5 text-gray-400" />
      },
    ],
    featured: {
      title: 'The ATS Mastery Guide',
      description: 'Download our comprehensive 2026 guide on beating modern Applicant Tracking Systems.',
      href: '/blog/ats-optimization/ats-tips',
      image: '/images/ats_optimization.webp',
      badge: 'Free Guide',
      actionText: 'Read Article'
    }
  },
  { 
    label: 'Pricing', 
    href: '#pricing', 
    ariaLabel: 'View pricing section'
  },
];
