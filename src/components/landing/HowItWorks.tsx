'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const STEP_DURATION = 5000; // 5 seconds per step

  const features = React.useMemo(() => [
    {
      title: 'Create Primary CV',
      description: 'Build your comprehensive professional profile once. Include all your skills, experience, and achievements to act as the foundation for every future application.',
      image: '/images/Howitworks/step_1.png',
    },
    {
      title: 'Add Job Description',
      description: 'Import job details instantly using our Chrome extension or paste them manually. We analyze the requirements to understand exactly what the employer needs.',
      image: '/images/Howitworks/STEP_2.png',
    },
    {
      title: 'Get Tailored Docs',
      description: 'Your CV and cover letter are automatically generated and optimized for the highest possible ATS score, perfectly matching the job description.',
      image: '/images/Howitworks/STEP_3.png',
    },
    {
      title: 'Refine & Track',
      description: 'Make final tweaks in our studio if desired, then download your documents and track your application status from "Applied" to "Hired".',
      image: '/images/Howitworks/STEP-4.png',
    },
  ], []);

  // Auto-advance timer with progress tracking (empties from 100% to 0%)
  useEffect(() => {
    // Reset progress to 100 when step changes
    setProgress(100);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (STEP_DURATION / 50)); // Decrease every 50ms
        if (newProgress <= 0) {
          // Move to next step and reset to full
          setActiveStep((current) => (current + 1) % features.length);
          return 100;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [features.length, activeStep]);

  // Reset progress when step changes manually
  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setProgress(100); // Start full when manually clicking
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
            className="text-2xl tablet:text-3xl desktop:text-4xl font-bold text-white mb-4 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              Stop juggling five different apps.
            </span>
            <br />
            <span className="text-white/70 font-normal">
              CVCircle makes it simple to manage your entire job application.
            </span>
          </motion.h2>
        </div>

        <div className="flex flex-col desktop:flex-row items-center desktop:items-start gap-8 tablet:gap-12 desktop:gap-20">

          {/* Left Side - Text Content with Progress Bar */}
          <div className="flex-1 w-full max-w-xl flex gap-4 tablet:gap-6 order-2 desktop:order-1">


            {/* Text Content */}
            <div className="flex-1">
              {/* Feature Points - Clickable */}
              <motion.div
                className="space-y-10"
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

                    <h3 className={`text-lg font-semibold mb-1 transition-colors ${index === activeStep ? 'text-white' : 'text-gray-300'}`}>
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </motion.div>
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
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gray-900/30 backdrop-blur-sm aspect-square min-h-[280px] tablet:min-h-[400px]">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    opacity: index === activeStep ? 1 : 0,
                    scale: index === activeStep ? 1 : 1.05,
                  }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover object-center"
                    quality={85}
                    priority={index === 0}
                  />
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
