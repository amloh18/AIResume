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
      color: 'from-lime-400 to-lime-500',
      bgColor: 'from-lime-400/10 to-lime-500/10',
      cta: 'Download Extension',
      ctaLink: 'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=item-share-cb',
      image: '/images/never_miss_a_role.png'
    },
    {
      id: 'global-opportunities',
      title: 'Global Opportunities',
      description: 'Access sponsored jobs with visa sponsorship tags for UK and USA companies. More countries coming soon.',
      icon: Globe,
      color: 'from-blue-400 to-blue-500',
      bgColor: 'from-blue-400/10 to-blue-500/10',
      cta: 'Explore Jobs',
      ctaLink: '/dashboard/jobs',
      image: '/images/global_opportunities.png'
    },
    {
      id: 'skills-gap',
      title: 'Skills Gap Analysis',
      description: 'Identify missing skills and get actionable recommendations to bridge the gap for your dream role.',
      icon: BarChart3,
      color: 'from-purple-400 to-purple-500',
      bgColor: 'from-purple-400/10 to-purple-500/10',
      cta: 'Analyze My Skills',
      ctaLink: '/ai-career-report',
      image: '/images/gain_your_edge.png'
    },
    {
      id: 'career-insights',
      title: 'Deep Career Insights',
      description: 'Get a detailed CV report highlighting career gaps, strengths, and improvement areas.',
      icon: FileText,
      color: 'from-orange-400 to-orange-500',
      bgColor: 'from-orange-400/10 to-orange-500/10',
      cta: 'Get Report',
      ctaLink: '/ai-career-report',
      image: '/images/deep_career_insights.png'
    },
    {
      id: 'ats-optimized',
      title: 'ATS-Optimized Documents',
      description: 'Auto-generate CVs and Cover Letters tailored to pass Applicant Tracking Systems with high scores.',
      icon: CheckCircle,
      color: 'from-green-400 to-green-500',
      bgColor: 'from-green-400/10 to-green-500/10',
      cta: 'Create CV',
      ctaLink: '/studio',
      image: '/images/ats_optimized_documents.png'
    },
    {
      id: 'one-click-export',
      title: 'One-Click Export',
      description: 'Download your complete application kit: CV, Cover Letter, and ATS Report in one click.',
      icon: Download,
      color: 'from-pink-400 to-pink-500',
      bgColor: 'from-pink-400/10 to-pink-500/10',
      cta: 'Start Export',
      ctaLink: '/dashboard',
      image: '/images/one_click_export.png'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    }
  };

  return (
    <section id="features" className="relative pt-32 pb-20 flex items-center bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 w-full flex flex-col justify-center">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-2xl tablet:text-3xl desktop:text-4xl font-bold text-white mb-6 text-center">
            Everything you need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              succeed
            </span>
          </h2>
          <p className="text-xs tablet:text-sm desktop:text-base text-white/70 max-w-3xl mx-auto leading-relaxed">
            Powerful tools designed to streamline your job search process and help you stand out from the competition.
          </p>
        </motion.div>

        {/* Two Column Grid Layout */}
        <motion.div
          className="grid grid-cols-1 tablet:grid-cols-2 gap-6 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => {
            return (
              <motion.div
                key={feature.id}
                className="group relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-lime-400/50 transition-all duration-300 flex flex-col h-full"
                variants={cardVariants}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                  delay: index * 0.1
                }}
                whileHover={{
                  scale: 1.02,
                  y: -8,
                  boxShadow: "0 20px 40px -12px rgba(132, 204, 22, 0.2)"
                }}
              >
                {/* Glow Effect */}
                <motion.div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  style={{ filter: 'blur(20px)' }}
                />

                {/* Image Section with White Background */}
                <motion.div
                  className="w-full h-48 bg-white relative overflow-hidden"
                  whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.3 }
                  }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      transform: feature.id === 'smart-extension'
                        ? 'scale(0.9)' :
                        feature.id === 'global-opportunities'
                          ? 'scale(0.9)' :
                          feature.id === 'ats-optimized'
                            ? 'scale(1.1)' :
                            'scale(1)'
                    }}
                  >
                    {feature.image.endsWith('.svg') ? (
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className={`w-full h-full object-cover`}
                      />
                    ) : (
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                </motion.div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.color} bg-opacity-10`}>
                      <feature.icon size={20} className="text-white" />
                    </div>
                    <h3 className="text-lg tablet:text-xl font-bold text-white group-hover:text-lime-400 transition-colors duration-300">
                      {feature.title}
                    </h3>
                  </div>

                  <p className="text-white/70 leading-relaxed text-xs tablet:text-sm desktop:text-base flex-grow">
                    {feature.description}
                  </p>

                  {/* CTA Button */}
                  <motion.a
                    href={feature.ctaLink}
                    target={feature.ctaLink.startsWith('http') ? '_blank' : undefined}
                    rel={feature.ctaLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="group/btn relative inline-flex items-center gap-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black px-5 py-2.5 tablet:px-6 tablet:py-3 rounded-full font-semibold text-xs tablet:text-sm shadow-lg hover:shadow-[rgb(129,255,0)]/50 transition-all overflow-hidden mt-6 w-fit"
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 15px 30px -8px rgba(132, 204, 22, 0.5)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{ willChange: 'transform' }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
                      style={{ filter: 'blur(20px)' }}
                    />
                    <div className="relative flex items-center gap-2">
                      <span>{feature.cta}</span>
                      <motion.div
                        whileHover={{ rotate: 45 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ArrowRight size={16} />
                      </motion.div>
                    </div>
                  </motion.a>
                </div>

                {/* Arrow Indicator */}
                <motion.div
                  className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  whileHover={{ x: 5, rotate: 45 }}
                >
                  <ArrowRight
                    size={20}
                    className="text-lime-400 drop-shadow-[0_0_8px_rgba(132,204,22,0.8)]"
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
