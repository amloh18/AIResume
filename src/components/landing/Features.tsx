'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Target, BarChart3, Download, Globe, CheckCircle, FileText } from 'lucide-react';

const Features = () => {
  const [activeFeature, setActiveFeature] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = React.useRef<(HTMLDivElement | null)[]>([]);

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

  // IntersectionObserver to track which feature is in view
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sectionRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) {
              setActiveFeature(index);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.5, // Trigger when 50% of section is visible
      }
    );

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      sectionRefs.current.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  // Scroll to specific feature when clicked
  const scrollToFeature = (index: number) => {
    sectionRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <section id="features" className="relative bg-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-lime-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 pt-32 pb-20">
        {/* Header */}
        <div className="mb-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl tablet:text-4xl desktop:text-5xl font-bold text-white mb-6"
          >
            Powerful tools for your <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">Career Growth</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Everything you need to land your dream job, from application tracking to AI-powered optimization.
          </motion.p>
        </div>

        {/* Desktop: Scroll Snap Layout */}
        <div className="hidden desktop:flex gap-20">
          {/* Left Column: Feature List - Sticky */}
          <div className="w-5/12 sticky top-32 self-start space-y-4 h-fit">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => scrollToFeature(index)}
                className={`group flex items-center gap-4 p-2 pr-6 rounded-full cursor-pointer transition-all duration-300 border ${activeFeature === index
                  ? 'bg-white/10 border-white/10 shadow-lg'
                  : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
              >
                <div className={`p-3 rounded-full bg-gradient-to-br ${feature.gradient} bg-opacity-20 shrink-0 transform transition-transform group-hover:scale-110 flex items-center justify-center w-12 h-12`}>
                  <feature.icon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold transition-colors ${activeFeature === index ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    }`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm text-gray-500 transition-all duration-300 ${activeFeature === index ? 'max-h-20 opacity-100 mt-1' : 'max-h-0 opacity-0'
                    }`}>
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Scrollable Feature Sections */}
          <div
            ref={scrollContainerRef}
            className="w-7/12 h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {features.map((feature, index) => (
              <div
                key={feature.id}
                ref={(el) => { sectionRefs.current[index] = el; }}
                className="min-h-screen snap-start flex items-center justify-center perspective-[2000px] py-10"
              >
                <motion.div
                  initial={{ opacity: 0, rotateY: 20, rotateX: 5, scale: 0.9 }}
                  whileInView={{ opacity: 1, rotateY: -5, rotateX: 2, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                  className="relative w-full aspect-[16/10]"
                >
                  {/* The Window Frame */}
                  <div className="absolute inset-0 bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                    {/* Content Area */}
                    <div className="relative flex-1 bg-gray-900 overflow-hidden group">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className="object-cover"
                        quality={90}
                      />
                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Floating Action Button */}
                      <div className="absolute bottom-8 right-8 z-20">
                        <a
                          href={feature.ctaLink}
                          target={feature.ctaLink.startsWith('http') ? '_blank' : undefined}
                          className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl hover:bg-gray-100 transition-colors"
                        >
                          {feature.cta}
                          <ArrowRight size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet: Original Hover-based Layout */}
        <div className="flex desktop:hidden flex-col gap-12 items-center">
          {/* Feature List */}
          <div className="w-full space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveFeature(index)}
                className={`group flex items-center gap-4 p-2 pr-6 rounded-full cursor-pointer transition-all duration-300 border ${activeFeature === index
                  ? 'bg-white/10 border-white/10 shadow-lg'
                  : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
              >
                <div className={`p-3 rounded-full bg-gradient-to-br ${feature.gradient} bg-opacity-20 shrink-0 transform transition-transform group-hover:scale-110 flex items-center justify-center w-12 h-12`}>
                  <feature.icon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold transition-colors ${activeFeature === index ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    }`}>
                    {feature.title}
                  </h3>
                  {/* Mobile CTA */}
                  <div className={`mt-2 overflow-hidden transition-all duration-300 ${activeFeature === index ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                    <a href={feature.ctaLink} className="text-sm font-semibold text-lime-400 hover:text-lime-300 flex items-center gap-1">
                      {feature.cta} <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Visual Display */}
          <div className="w-full perspective-[2000px]">
            <motion.div
              initial={{ opacity: 0, rotateY: 20, rotateX: 5, scale: 0.9 }}
              whileInView={{ opacity: 1, rotateY: -5, rotateX: 2, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                transformStyle: "preserve-3d",
              }}
              className="relative w-full aspect-[16/10]"
            >
              <div className="absolute inset-0 bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                <div className="relative flex-1 bg-gray-900 overflow-hidden group">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeature}
                      initial={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={features[activeFeature].image}
                        alt={features[activeFeature].title}
                        fill
                        className="object-cover"
                        quality={90}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </motion.div>
                  </AnimatePresence>

                  <motion.div
                    className="absolute bottom-8 right-8 z-20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`btn-${activeFeature}`}
                  >
                    <a
                      href={features[activeFeature].ctaLink}
                      target={features[activeFeature].ctaLink.startsWith('http') ? '_blank' : undefined}
                      className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl hover:bg-gray-100 transition-colors"
                    >
                      {features[activeFeature].cta}
                      <ArrowRight size={16} />
                    </a>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Hide scrollbar globally for the scroll container */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default Features;
