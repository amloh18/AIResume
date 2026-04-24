'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const MultiImageFeature = ({ images, title, showFrame = true }: { images: string[], title: string, showFrame?: boolean }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  const imageContent = (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0"
      >
        <Image
          src={images[currentIndex]}
          alt={`${title} - view ${currentIndex + 1}`}
          fill
          className={`group-hover:scale-105 transition-transform duration-500 ${showFrame ? 'object-cover object-top' : 'object-contain object-center'}`}
          quality={80}
          unoptimized={images[currentIndex].startsWith('http')}
        />
      </motion.div>
    </AnimatePresence>
  );

  const virtualMouse = images.length > 1 ? (
    <motion.div
      key={`mouse-${currentIndex}`}
      className="absolute z-20 pointer-events-none flex items-center justify-center"
      initial={{ x: '100%', y: '100%', opacity: 0 }}
      animate={{ 
        x: ['100%', '50%', '50%', '100%'], 
        y: ['100%', '50%', '50%', '100%'],
        opacity: [0, 1, 1, 0]
      }}
      transition={{ 
        duration: 4, 
        times: [0, 0.6, 0.8, 1],
        ease: "easeInOut" 
      }}
      style={{ width: '24px', height: '24px', left: '0', top: '0' }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.42c.41 0 .63-.5.35-.78L5.85 2.86a.5.5 0 00-.85.35z"/>
      </svg>
      
      <motion.div 
        className="absolute inset-0 rounded-full border-2 border-lime-400 bg-lime-400/30"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 2.5, 3], 
          opacity: [0, 1, 0] 
        }}
        transition={{ 
          duration: 0.6, 
          delay: 2.4,
          ease: "easeOut" 
        }}
      />
    </motion.div>
  ) : null;

  if (!showFrame) {
    return (
      <div className="relative w-full h-full overflow-hidden rounded-2xl group flex items-center justify-center p-6 bg-transparent">
        <div className="relative w-full h-full">
          {imageContent}
          {virtualMouse}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl group bg-white p-3 tablet:p-6 flex items-center justify-center">
      <div className="relative w-full h-full rounded-xl flex flex-col overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-200">
        {/* Mac Browser Header */}
        <div className="h-6 tablet:h-8 bg-[#2d2d2d] flex items-center px-3 tablet:px-4 space-x-1.5 tablet:space-x-2 flex-shrink-0 z-20">
          <div className="w-2 h-2 tablet:w-2.5 tablet:h-2.5 rounded-full bg-[#ff5f56] shadow-[inset_0_0_4px_rgba(0,0,0,0.1)]" />
          <div className="w-2 h-2 tablet:w-2.5 tablet:h-2.5 rounded-full bg-[#ffbd2e] shadow-[inset_0_0_4px_rgba(0,0,0,0.1)]" />
          <div className="w-2 h-2 tablet:w-2.5 tablet:h-2.5 rounded-full bg-[#27c93f] shadow-[inset_0_0_4px_rgba(0,0,0,0.1)]" />
        </div>

        {/* Browser Content */}
        <div className="relative flex-1 overflow-hidden bg-white">
          {imageContent}
          {virtualMouse}
        </div>
      </div>
    </div>
  );
};

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
      images: ['/images/extension.png'],
      showFrame: false,
    },
    {
      id: 'linkedin-enhancer',
      title: 'LinkedIn Profile Enhancer',
      description: 'Optimize your LinkedIn profile with AI-powered suggestions to attract recruiters & land more opportunities.',
      cta: 'Enhance Profile',
      ctaLink: '/linkedin-enhancer',
      images: ['/images/linkedin_enhancer.png', '/images/linkedin_enhancer_dashbaord.png'],
      showFrame: true,
    },
    // Row 2: 3 medium tiles
    {
      id: 'ats-optimized',
      title: 'ATS-Optimized Docs',
      description: 'Auto-generate CVs and Cover Letters tailored to pass Applicant Tracking Systems with high score.',
      cta: 'Create CV',
      ctaLink: '/studio',
      images: ['/images/ats_optimization.png'],
      showFrame: false,
    },
    {
      id: 'skills-gap',
      title: 'Skills Gap Analysis',
      description: 'Identify missing skills and get actionable recommendations to bridge the gap.',
      cta: 'Analyze Skills',
      ctaLink: '/ai-career-report',
      images: ['/images/skill_gap_analysis.png'],
      showFrame: false,
    },
    {
      id: 'career-insights',
      title: 'Deep Career Insights',
      description: 'Get detailed CV reports highlighting career gaps, strengths, and areas for improvement.',
      cta: 'Get Report',
      ctaLink: '/ai-career-report',
      images: ['/images/career_insights.png'],
      showFrame: false,
    },
    // Row 3: 2 tiles
    {
      id: 'global-opportunities',
      title: 'Global Opportunities',
      description: 'Access sponsored jobs with visa sponsorship tags for UK and USA companies with updated companies list.',
      cta: 'Explore Jobs',
      ctaLink: '/dashboard/jobs',
      images: ['https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=A%20sleek%2C%20modern%20web%20UI%20dashboard%20showing%20global%20job%20opportunities.%20Map%20of%20the%20world%20with%20glowing%20markers%20in%20UK%20and%20USA%2C%20visa%20sponsorship%20tags%2C%20sleek%20dark%20mode%20design%2C%20high%20quality%2C%20realistic%20UI.&image_size=landscape_16_9'],
      showFrame: false,
    },
    {
      id: 'interview-coach',
      title: 'AI Interview Coach',
      description: 'Get an edge over other candidates by practising industry standard interview questions.',
      cta: 'Start Practice',
      ctaLink: '/interview-coach',
      images: ['/images/interviewcoach_dashbaord.png', '/images/interviewcoach_questionanalysis.png', '/images/interviwcoach.png'],
      showFrame: true,
    },
    {
      id: 'dark-light-mode',
      title: 'Dark & Light Mode',
      description: 'Switch between dark and light themes for a comfortable reading experience in any environment.',
      cta: 'Try Theme',
      ctaLink: '/dashboard',
      images: ['/images/features/dark_light.png'],
      showFrame: true,
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

                <div className={`relative ${feature.showFrame === false ? 'aspect-square' : 'aspect-[16/6]'} overflow-hidden rounded-2xl mx-4 mb-4`}>
                  <MultiImageFeature images={feature.images} title={feature.title} showFrame={feature.showFrame} />
                  {feature.showFrame !== false && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/60 to-transparent pointer-events-none rounded-2xl z-10" />
                  )}
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

                <div className={`relative ${feature.showFrame === false ? 'aspect-square' : 'aspect-[16/10]'} overflow-hidden rounded-2xl mx-4 mb-4`}>
                  <MultiImageFeature images={feature.images} title={feature.title} showFrame={feature.showFrame} />
                  {feature.showFrame !== false && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/60 to-transparent pointer-events-none rounded-2xl z-10" />
                  )}
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

                <div className={`relative ${feature.showFrame === false ? 'aspect-square' : 'aspect-[16/10]'} overflow-hidden rounded-2xl mx-4 mb-4`}>
                  <MultiImageFeature images={feature.images} title={feature.title} showFrame={feature.showFrame} />
                  {feature.showFrame !== false && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/60 to-transparent pointer-events-none rounded-2xl z-10" />
                  )}
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

                <div className={`relative ${feature.showFrame === false ? 'aspect-square' : 'aspect-[16/9]'} overflow-hidden bg-gray-800/50 rounded-2xl mx-4 mb-4`}>
                  <MultiImageFeature images={feature.images} title={feature.title} showFrame={feature.showFrame} />
                  {feature.showFrame !== false && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141810]/40 to-transparent pointer-events-none rounded-2xl z-10" />
                  )}
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
