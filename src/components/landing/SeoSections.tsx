'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileText, ShieldCheck, Target, Gauge, Mail, Briefcase, LayoutTemplate, ArrowRight } from 'lucide-react';

const sections = [
  {
    id: 'ai-resume-builder',
    eyebrow: 'AI Resume Builder',
    h2: 'Create Your Resume With AI',
    copy: 'Generate professional resume content in minutes. AI Resume helps you write a compelling professional summary, create achievement-focused bullet points, improve your existing experience, customize sections, and choose a professional template — all in one place.',
    points: [
      'Generate professional resume content from your experience',
      'Improve existing resumes with better phrasing and stronger bullets',
      'Write compelling summaries and achievement-focused bullet points',
      'Customize sections to fit any industry or role',
    ],
    cta: { label: 'Open the AI Resume Builder', href: '/ai-resume-builder' },
    icon: FileText,
  },
  {
    id: 'ats-optimization',
    eyebrow: 'ATS Optimization',
    h2: 'Build an ATS-Friendly Resume',
    copy: 'Applicant tracking systems reject many resumes because of formatting and keyword gaps. AI Resume builds resumes with ATS-compatible formatting, keyword optimization, and clear, recruiter-friendly structure so your application is easy to parse and evaluate.',
    points: [
      'ATS-compatible formatting that parses cleanly',
      'Keyword optimization aligned with the job description',
      'Skills alignment with the roles you are targeting',
      'Clear, readable, recruiter-friendly structure',
    ],
    cta: { label: 'Run an ATS resume check', href: '/ats-resume-checker' },
    icon: ShieldCheck,
  },
  {
    id: 'job-tailoring',
    eyebrow: 'Job-Specific Resume Tailoring',
    h2: 'Tailor Your Resume to Every Job',
    copy: 'Provide a job description or a job URL and AI Resume identifies the most important keywords, compares the job with your resume, and recommends specific changes. Rewrite relevant sections and improve alignment with the role — without starting from scratch.',
    points: [
      'Identify the keywords that matter for each job',
      'Compare the job description with your resume',
      'Get concrete recommendations for what to change',
      'Rewrite relevant sections to improve alignment',
    ],
    cta: { label: 'Tailor a resume to a job', href: '/ai-resume-builder' },
    icon: Target,
  },
  {
    id: 'resume-score',
    eyebrow: 'Resume Score',
    h2: 'See How Strong Your Resume Is',
    copy: 'Understand how your resume performs before you apply. Resume scoring analyzes your resume against a job description and gives actionable recommendations to improve keyword coverage, skills alignment, and readability.',
    points: [
      'Analyze your resume against a target job',
      'Score keyword match, format, and readability',
      'Get actionable recommendations to improve',
      'Track your progress as you refine your resume',
    ],
    cta: { label: 'Check your resume score', href: '/resume-score' },
    icon: Gauge,
  },
  {
    id: 'ai-cover-letter',
    eyebrow: 'AI Cover Letter',
    h2: 'Generate a Cover Letter in Seconds',
    copy: 'Write job-specific cover letters based on your resume and the job description. The AI cover letter generator drafts a tailored, professional letter in seconds — edit it, refine it, and send it with confidence.',
    points: [
      'Job-specific letters from your resume and the job description',
      'Professional, recruiter-ready structure',
      'Fully editable and customizable before sending',
      'Faster applications without template boilerplate',
    ],
    cta: { label: 'Generate an AI cover letter', href: '/ai-resume-builder' },
    icon: Mail,
  },
  {
    id: 'job-tracker',
    eyebrow: 'Job Tracker',
    h2: 'Manage Your Job Applications in One Place',
    copy: 'Store every job you are considering, track your applications, and manage stages from applied to hired. Connect each application with the tailored resume you used — so you always know where you stand.',
    points: [
      'Save jobs from anywhere you search',
      'Track applications and manage your pipeline',
      'Keep job information organized in one place',
      'Connect applications with the tailored resume you used',
    ],
    cta: { label: 'Explore the job tracker', href: '/dashboard/jobs' },
    icon: Briefcase,
  },
  {
    id: 'templates',
    eyebrow: 'Resume Templates',
    h2: 'Professional Resume Templates',
    copy: 'Choose from ATS resume templates, professional resume templates, modern resume templates, and simple resume templates. Every template is designed to be parsed by applicant tracking systems while still looking polished to recruiters.',
    points: [
      'ATS resume templates that parse reliably',
      'Professional, modern, and simple designs',
      'Easy to customize for any role or industry',
      'Optimized for both resumes and international CVs',
    ],
    cta: { label: 'Browse professional resume templates', href: '/templates' },
    icon: LayoutTemplate,
  },
];

const SeoSections = () => {
  return (
    <section id="seo-sections" className="relative pt-32 pb-20 bg-[#141810] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        <div className="mb-16">
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#81ff00]">
              <path
                d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>

          <motion.h2
            className="!text-[2rem] tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-white mb-3 tracking-tighter !leading-[1.05] max-w-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">apply smarter</span>.
          </motion.h2>
          <motion.p
            className="text-h3 text-gray-400 max-w-3xl leading-relaxed text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            AI Resume is your AI-powered workspace for building better resumes and applying to jobs faster.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-6">
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <motion.div
                key={section.id}
                id={section.id}
                className="group relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden hover:border-lime-400/30 transition-colors duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (index % 2) * 0.1 }}
              >
                <div className="p-6 tablet:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-[#81ff00]" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">
                      {section.eyebrow}
                    </span>
                  </div>

                  <h3 className="!text-[1.4rem] tablet:!text-[1.6rem] font-extrabold text-white mb-3 tracking-tighter leading-tight">
                    {section.h2}
                  </h3>
                  <p className="text-gray-400 text-body leading-relaxed mb-5">
                    {section.copy}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-small text-gray-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#81ff00] flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={section.cta.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-lime-400 hover:text-lime-300 transition-colors group/link"
                  >
                    {section.cta.label}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SeoSections;