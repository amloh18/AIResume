'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { UserPlus, Target, Sparkles, Send, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const HowItWorks = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const steps = [
    {
      id: 1,
      stepLabel: 'STEP ONE',
      title: 'Create Master CV',
      description: 'Build your comprehensive professional profile once. Include all your skills, experience, and achievements to act as the foundation for every future application.',
      buttonLabel: 'Create Master CV',
      href: '/cv-builder',
      icon: UserPlus,
      color: 'from-lime-400 to-lime-500',
      delay: 0.1,
      image: '/images/How it works/step_1.png'
    },
    {
      id: 2,
      stepLabel: 'STEP TWO',
      title: 'Add Job Description',
      description: 'Import job details instantly using our Chrome extension or paste them manually. We analyze the requirements to understand exactly what the employer needs.',
      buttonLabel: 'Download Extension',
      href: 'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii',
      icon: Target,
      color: 'from-blue-400 to-blue-500',
      delay: 0.2,
      image: '/images/How it works/STEP_2.png'
    },
    {
      id: 3,
      stepLabel: 'STEP THREE',
      title: 'Get Tailored Docs',
      description: 'Your CV and cover letter are automatically generated and optimized for the highest possible ATS score, perfectly matching the job description.',
      buttonLabel: 'Tailor CV',
      href: '/resumes',
      icon: Sparkles,
      color: 'from-purple-400 to-purple-500',
      delay: 0.3,
      image: '/images/How it works/STEP_3.png'
    },
    {
      id: 4,
      stepLabel: 'STEP FOUR',
      title: 'Refine & Track',
      description: 'Make final tweaks in our studio if desired, then download your documents and track your application status from "Applied" to "Hired".',
      buttonLabel: 'Track Application',
      href: '/tracker',
      icon: Send,
      color: 'from-emerald-400 to-emerald-500',
      delay: 0.4,
      image: '/images/How it works/STEP-4.png'
    }
  ];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative pt-32 pb-20 bg-gradient-to-b from-gray-900 to-black overflow-hidden"
    >
      {/* Background Effects (Restored) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 w-full">
        {/* Header Section (Restored) */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.h3
            className="text-2xl tablet:text-2xl desktop:text-4xl font-bold text-white mb-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            How It Works:{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-lime-500 to-emerald-400">
              The Path to Your Next Opportunity
            </span>
          </motion.h3>
        </motion.div>

        {/* Steps Grid (New Card Layout) */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-6 relative">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: step.delay, duration: 0.5 }}
                className="group relative flex flex-col h-full bg-gray-900/50 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden hover:border-lime-400/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-lime-500/10 min-h-[400px]"
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0 bg-gray-900">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  />
                  {/* Dark Overlay Gradient to ensure text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent opacity-90 transition-opacity" />
                </div>

                {/* Content Container - Relative z-10 */}
                <div className="relative z-10 flex flex-col h-full p-6">
                  {/* Step Label */}
                  <div className="mb-4">
                    <span className="text-xs font-bold tracking-widest text-lime-400 uppercase drop-shadow-lg shadow-black">
                      {step.stepLabel}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-lime-300 transition-colors drop-shadow-xl shadow-black">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white text-sm leading-relaxed mb-6 font-medium drop-shadow-xl shadow-black/80">
                    {step.description}
                  </p>

                  {/* Button/Action */}
                  <div className="mt-auto pt-4">
                    <Link
                      href={step.href}
                      target={step.href.startsWith('http') ? '_blank' : undefined}
                      className="inline-block px-6 py-3 bg-white/10 border border-white/20 rounded-full shadow-lg backdrop-blur-md hover:bg-lime-400 hover:text-black hover:border-lime-400 transition-all font-bold text-sm text-white group-hover:scale-105"
                    >
                      {step.buttonLabel}
                    </Link>
                  </div>
                </div>

              </motion.div>

              {/* Arrow Connector (Desktop only, not after last item) */}
              {index < steps.length - 1 && (
                <div className="hidden desktop:flex absolute top-1/2 -translate-y-1/2 z-10 text-gray-600"
                  style={{ left: `calc(${((index + 1) / 4) * 100}% - 12px)` }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: step.delay + 0.2 }}
                    className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shadow-xl z-20 relative"
                  >
                    <ArrowRight size={12} className="text-gray-400" />
                  </motion.div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
