'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const Features = () => {
  // All features organized for 2-column layout (8 total features)
  const allFeatures = [
    // Row 1: 2 large tiles
    {
      id: 'smart-extension',
      title: 'Smart Extension',
      description: 'Save and autofill job data instantly from any job board. Never copy-paste again.',
      cta: 'Download Extension',
      ctaLink: 'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii',
      image: '/images/never_miss_a_role.png',
    },
    {
      id: 'linkedin-enhancer',
      title: 'LinkedIn Profile Enhancer',
      description: 'Optimize your LinkedIn profile with AI-powered suggestions to attract recruiters & land more opportunities.',
      cta: 'Enhance Profile',
      ctaLink: '/linkedin-enhancer',
      image: '/images/image_asset/hero-resume-enhancer.png',
    },
    // Row 2: 3 medium tiles
    {
      id: 'ats-optimized',
      title: 'ATS-Optimized Docs',
      description: 'Auto-generate CVs and Cover Letters tailored to pass Applicant Tracking Systems with high score.',
      cta: 'Create CV',
      ctaLink: '/studio',
      image: '/images/ats_optimized_documents.png',
    },
    {
      id: 'skills-gap',
      title: 'Skills Gap Analysis',
      description: 'Identify missing skills and get actionable recommendations to bridge the gap.',
      cta: 'Analyze Skills',
      ctaLink: '/ai-career-report',
      image: '/images/gain_your_edge.png',
    },
    {
      id: 'career-insights',
      title: 'Deep Career Insights',
      description: 'Get detailed CV reports highlighting career gaps, strengths, and areas for improvement.',
      cta: 'Get Report',
      ctaLink: '/ai-career-report',
      image: '/images/deep_career_insights.png',
    },
    // Row 3: 2 tiles
    {
      id: 'global-opportunities',
      title: 'Global Opportunities',
      description: 'Access sponsored jobs with visa sponsorship tags for UK and USA companies with updated companies list.',
      cta: 'Explore Jobs',
      ctaLink: '/dashboard/jobs',
      image: '/images/global_opportunities.png',
    },
    {
      id: 'interview-coach',
      title: 'AI Interview Coach',
      description: 'Get an edge over other candidates by practising industry standard interview questions.',
      cta: 'Start Practice',
      ctaLink: '/interview-coach',
      image: '/images/image_asset/hero-interview-mode.png',
    },
    {
      id: 'dark-light-mode',
      title: 'Dark & Light Mode',
      description: 'Switch between dark and light themes for a comfortable reading experience in any environment.',
      cta: 'Try Theme',
      ctaLink: '/dashboard',
      image: '/images/features/dark_light.png',
    },
  ];

  return (
    <section id="features" className="relative pt-32 pb-20 bg-[#141810] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">

        {/* Header */}
        <div className="mb-16">
          {/* Decorative squiggle */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#99FF00]">
              <path
                d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>

          <motion.h2
            className="text-2xl tablet:text-3xl desktop:text-4xl font-bold text-white mb-4 max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Everyday <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">superpowers</span>.{' '}
            <span className="text-white/70 font-normal">
              Light enough for daily applications but powerful enough for landing your dream job.
            </span>
          </motion.h2>
        </div>

        {/* Group 1: Dark & Light Mode (Row 1 - Centered Large) */}
        <div className="grid grid-cols-1 desktop:grid-cols-2 gap-6 mb-6">
          {allFeatures
            .filter(f => ['dark-light-mode'].includes(f.id))
            .map((feature, index) => (
              <motion.div
                key={feature.id}
                className="group relative rounded-2xl overflow-hidden desktop:col-span-2 w-full"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6 tablet:p-8 min-h-[140px] flex flex-col justify-start">
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                    {feature.description}
                  </p>
                </div>

                <div className="relative aspect-[16/6] overflow-hidden rounded-2xl mx-4 mb-4">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                    quality={80}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/60 to-transparent pointer-events-none rounded-2xl" />
                </div>
              </motion.div>
            ))}
        </div>

        {/* Group 2: LinkedIn + AI Coach (Row 2 - Large 2-col) */}
        <div className="grid grid-cols-1 desktop:grid-cols-2 gap-6 mb-6">
          {allFeatures
            .filter(f => ['linkedin-enhancer', 'interview-coach'].includes(f.id))
            .map((feature, index) => (
              <motion.div
                key={feature.id}
                className="group relative rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + (index * 0.1) }}
              >
                <div className="p-6 tablet:p-8 min-h-[140px] flex flex-col justify-start">
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                    {feature.description}
                  </p>
                </div>

                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl mx-4 mb-4">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                    quality={80}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/60 to-transparent pointer-events-none rounded-2xl" />
                </div>
              </motion.div>
            ))}
        </div>

        {/* Group 3: Remaining Large Features (Career Insights, Global Opps) */}
        <div className="grid grid-cols-1 desktop:grid-cols-2 gap-6 mb-6">
          {allFeatures
            .filter(f => ['career-insights', 'global-opportunities'].includes(f.id))
            .map((feature, index) => (
              <motion.div
                key={feature.id}
                className="group relative rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
              >
                <div className="p-6 tablet:p-8 min-h-[140px] flex flex-col justify-start">
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                    {feature.description}
                  </p>
                </div>

                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl mx-4 mb-4">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                    quality={80}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/60 to-transparent pointer-events-none rounded-2xl" />
                </div>
              </motion.div>
            ))}
        </div>

        {/* Group 4: Small Features (Row 4 - Smart Extension, ATS, Skills Gap) */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
          {allFeatures
            .filter(f => ['smart-extension', 'ats-optimized', 'skills-gap'].includes(f.id))
            .map((feature, index) => (
              <motion.div
                key={feature.id}
                className="group relative rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
              >
                <div className="p-5 tablet:p-6 min-h-[120px] flex flex-col justify-start">
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="relative aspect-[16/9] overflow-hidden bg-gray-800/50 rounded-2xl mx-4 mb-4">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                    quality={75}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/40 to-transparent pointer-events-none rounded-2xl" />
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
