'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Target, BarChart3, Download, Globe, CheckCircle, FileText } from 'lucide-react';

const Features = () => {
  const features = [
    {
      id: 'smart-extension',
      title: 'Smart Extension',
      description: 'Save and autofill job data instantly from any job board. Never copy-paste again.',
      icon: Target,
      color: 'text-lime-400',
      gradient: 'from-lime-400 to-lime-500',
      cta: 'Download Extension',
      ctaLink: 'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=item-share-cb',
      image: '/images/never_miss_a_role.png'
    },
    {
      id: 'global-opportunities',
      title: 'Global Opportunities',
      description: 'Access sponsored jobs with visa sponsorship tags for UK and USA companies.',
      icon: Globe,
      color: 'text-blue-400',
      gradient: 'from-blue-400 to-blue-500',
      cta: 'Explore Jobs',
      ctaLink: '/dashboard/jobs',
      image: '/images/global_opportunities.png'
    },
    {
      id: 'skills-gap',
      title: 'Skills Gap Analysis',
      description: 'Identify missing skills and get actionable recommendations to bridge the gap.',
      icon: BarChart3,
      color: 'text-purple-400',
      gradient: 'from-purple-400 to-purple-500',
      cta: 'Analyze My Skills',
      ctaLink: '/ai-career-report',
      image: '/images/gain_your_edge.png'
    },
    {
      id: 'career-insights',
      title: 'Deep Career Insights',
      description: 'Get a detailed CV report highlighting career gaps, strengths, and improvement areas.',
      icon: FileText,
      color: 'text-orange-400',
      gradient: 'from-orange-400 to-orange-500',
      cta: 'Get Report',
      ctaLink: '/ai-career-report',
      image: '/images/deep_career_insights.png'
    },
    {
      id: 'ats-optimized',
      title: 'ATS-Optimized Docs',
      description: 'Auto-generate CVs and Cover Letters tailored to pass Applicant Tracking Systems.',
      icon: CheckCircle,
      color: 'text-green-400',
      gradient: 'from-green-400 to-green-500',
      cta: 'Create CV',
      ctaLink: '/studio',
      image: '/images/ats_optimized_documents.png'
    },
    {
      id: 'one-click-export',
      title: 'One-Click Export',
      description: 'Download your complete application kit: CV, Cover Letter, and ATS Report in one click.',
      icon: Download,
      color: 'text-pink-400',
      gradient: 'from-pink-400 to-pink-500',
      cta: 'Start Export',
      ctaLink: '/dashboard',
      image: '/images/one_click_export.png'
    }
  ];

  return (
    <section id="features" className="relative bg-gradient-to-br from-lime-500/20 via-emerald-600/15 to-teal-500/20 overflow-hidden" style={{ paddingTop: '12rem', paddingBottom: '12rem' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-lime-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">

        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl tablet:text-4xl desktop:text-5xl font-bold text-white mb-4"
          >
            Powerful tools for your <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">Career Growth</span>
          </motion.h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to land your dream job, all in one platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-[#1d1d1f] rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
            >
              {/* Image Area */}
              <div className="aspect-[16/10] relative overflow-hidden bg-zinc-900 border-b border-white/5">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  quality={80}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1d1d1f] to-transparent opacity-60" />
              </div>

              {/* Content Area */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.gradient} text-white`}>
                    <feature.icon size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                </div>

                <p className="text-gray-400 mb-6 min-h-[3rem]">
                  {feature.description}
                </p>

                <a
                  href={feature.ctaLink}
                  target={feature.ctaLink.startsWith('http') ? '_blank' : undefined}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-lime-400 transition-colors"
                >
                  {feature.cta}
                  <ArrowRight size={16} />
                </a>
              </div>

              {/* Hover Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;
