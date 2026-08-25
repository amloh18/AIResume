'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = React.useRef(0);
  const STEP_DURATION = 5000; // 5 seconds per step

  const features = React.useMemo(() => [
    {
      title: 'Create Primary CV',
      description: 'Build your comprehensive professional profile once. Include all your skills, experience, and achievements to act as the foundation for every future application.',
      image: '/images/Howitworks/step1.webp',
    },
    {
      title: 'Search & Save Jobs',
      description: 'Discover roles across different portals and save them to your tracker. Pull job details instantly using our Chrome extension or add them manually.',
      image: '/images/Howitworks/step2.webp',
    },
    {
      title: 'Add Job Description',
      description: 'Import job details instantly using our Chrome extension or paste them manually. We analyze the requirements to understand exactly what the employer needs.',
      image: '/images/Howitworks/step3.webp',
    },
    {
      title: 'Get Tailored Docs',
      description: 'Your CV and cover letter are automatically generated and optimized for the highest possible ATS score, perfectly matching the job description.',
      image: '/images/Howitworks/step4.webp',
    },
    {
      title: 'Refine & Track',
      description: 'Make final tweaks in our studio if desired, then download your documents and track your application status from "Applied" to "Hired".',
      image: '/images/Howitworks/step5.webp',
    },
  ], []);

  useEffect(() => {
    progressRef.current = 100;
    setProgress(100);

    const stepMs = 50;
    const delta = 100 / (STEP_DURATION / stepMs);

    const timer = window.setInterval(() => {
      const next = progressRef.current - delta;

      if (next <= 0) {
        progressRef.current = 100;
        setProgress(100);
        setActiveStep((current) => (current + 1) % features.length);
        return;
      }

      progressRef.current = next;
      setProgress(next);
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [features.length]);

  // Reset progress when step changes manually
  const handleStepClick = (index: number) => {
    setActiveStep(index);
    progressRef.current = 100;
    setProgress(100);
  };

  return (
    <section
      id="how-it-works"
      className="relative pt-32 pb-20 bg-[#141810] overflow-visible"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        {/* Full Width Header */}
        <div className="mb-12 tablet:mb-16">
          {/* Decorative squiggle */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#81ff00]">
              <path
                d="M2 12C6 6 10 18 14 12C18 6 22 18 26 12C30 6 34 18 38 12C42 6 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>

          {/* Headline */}
          <motion.h2
            className="!text-[2rem] tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-white mb-3 tracking-tighter !leading-[1.05]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Stop juggling <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">five different apps.</span>
          </motion.h2>
          <motion.p
            className="text-h3 text-gray-400 max-w-2xl leading-relaxed text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            AIResume makes it simple to manage your entire job application.
          </motion.p>
        </div>

        <div className="flex flex-col desktop:flex-row items-center desktop:items-start gap-8 tablet:gap-12 desktop:gap-20">

          {/* Left Side - Text Content with Progress Bar */}
          <div className="flex-1 w-full max-w-xl flex gap-4 tablet:gap-6 order-2 desktop:order-1">


            {/* Text Content */}
            <div className="flex-1">
              {/* Desktop view: List of all features */}
              <motion.div
                className="hidden desktop:block space-y-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {features.map((feature, index) => (
                  <div
                    key={index}
                    onClick={() => handleStepClick(index)}
                    className={`relative pl-4 border-l-2 cursor-pointer transition-all duration-300 min-h-[80px] flex flex-col justify-center ${index === activeStep
                      ? 'border-gray-700 opacity-100' // Base track for active (progress bar overlays it)
                      : 'border-gray-700 opacity-60 hover:opacity-80'
                      }`}
                  >
                    {/* Active Step Progress Bar */}
                    {index === activeStep && (
                      <motion.div
                        className="absolute left-[-2px] top-0 w-[2px] bg-[#81ff00]"
                        style={{ height: `${100 - progress}%` }} // Grows from 0 to 100% as progress drops from 100 to 0
                        transition={{ duration: 0.05, ease: "linear" }}
                      />
                    )}

                    <h3 className={`text-h3 font-semibold mb-1 transition-colors ${index === activeStep ? 'text-white' : 'text-gray-300'}`}>
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-small leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </motion.div>

              {/* Mobile view: Only the active feature */}
              <div className="desktop:hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative pl-6 border-l-2 border-gray-800 min-h-[140px] flex flex-col justify-center"
                  >
                    {/* Progress bar on the border for mobile */}
                    <motion.div
                      className="absolute left-[-2px] top-0 w-[2px] bg-[#81ff00]"
                      style={{ height: `${100 - progress}%` }}
                      transition={{ duration: 0.05, ease: "linear" }}
                    />

                    <h3 className="text-h3 font-bold text-white mb-3">
                      {features[activeStep].title}
                    </h3>
                    <p className="text-gray-400 text-body leading-relaxed">
                      {features[activeStep].description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Mobile Pagination Indicators */}
                <div className="flex gap-3 mt-10">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleStepClick(index)}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${index === activeStep ? 'bg-[#81ff00]' : 'bg-gray-800'
                        }`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - App Screenshot */}
          <motion.div
            className="flex-1 relative w-full min-w-0 desktop:min-w-[50%] max-w-3xl order-1 desktop:order-2"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Glowing effect behind image */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#81ff00]/20 via-[#6dd600]/20 to-[#5cc000]/20 rounded-3xl blur-2xl opacity-50" />

            {/* Image container with 1:1 aspect ratio */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white backdrop-blur-sm aspect-square min-h-[280px] tablet:min-h-[400px] flex items-center justify-center p-6 tablet:p-10">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="absolute inset-6 tablet:inset-10"
                  initial={false}
                  animate={{
                    opacity: index === activeStep ? 1 : 0,
                    scale: index === activeStep ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <div className="relative w-full h-full rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className="object-contain object-center"
                      quality={85}
                      priority={index === 0}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
