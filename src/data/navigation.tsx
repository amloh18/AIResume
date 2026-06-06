import React from 'react';
import { FileText, Sparkles, CheckCircle, Briefcase, Chrome, Globe, LayoutDashboard, BookOpen } from 'lucide-react';

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
        label: 'AI Resume Builder', 
        description: 'Create ATS-friendly resumes in minutes with AI assistance and mix-and-match layout blocks.', 
        href: '#features', 
        ariaLabel: 'AI-powered resume builder',
        icon: <Sparkles className="w-6 h-6 text-lime-400" />,
        snapshot: 'bg-gradient-to-br from-lime-500/20 to-green-600/20 border-lime-500/30'
      },
      { 
        label: 'ATS Scanner', 
        description: 'Test your resume against job descriptions for keyword matches and format compatibility.', 
        href: '#features', 
        ariaLabel: 'ATS compatibility check',
        icon: <CheckCircle className="w-6 h-6 text-blue-400" />,
        snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30'
      },
      { 
        label: 'Cover Letter Generator', 
        description: 'Generate tailored, professional cover letters perfectly matching your target role.', 
        href: '#features', 
        ariaLabel: 'Cover letter generator',
        icon: <FileText className="w-6 h-6 text-purple-400" />
      },
      { 
        label: 'Smart Job Tracker', 
        description: 'Organize and track all your applications and upcoming interviews in one place.', 
        href: '#features', 
        ariaLabel: 'Job tracker',
        icon: <Briefcase className="w-6 h-6 text-orange-400" />
      },
    ],
    featured: {
      title: 'Interview Coach AI',
      description: 'Master your next interview with our real-time AI coach that analyzes your responses and provides instant feedback.',
      href: '#features',
      image: '/images/interviewcoach_dashbaord.png',
      badge: 'New Feature',
      actionText: 'Try AI Coach'
    }
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
      image: '/images/linkedin_enhancer_dashbaord.png',
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
        description: 'Research-backed career guides, ATS tips, and resume tutorials from CVCircle.',
        href: '/blog',
        ariaLabel: 'Read the CVCircle blog',
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
      image: '/images/ats_optimization.png',
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
