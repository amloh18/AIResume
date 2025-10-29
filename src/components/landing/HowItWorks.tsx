'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { User, Target, BarChart3, Edit3, Download, ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState<number>(0); // Start with first step active
  const [isSectionVisible, setIsSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  // Effect to handle section visibility
  useEffect(() => {
    if (isInView) {
      setIsSectionVisible(true);
    }
  }, [isInView]);

  const steps = [
    {
      number: '1',
      title: 'Create Master CV',
      headline: 'The Single Source of Truth for Your Career.',
      description: 'This is your foundational career blueprint. Input your experience, skills, and achievements just once to create a comprehensive, dynamic profile. This master document acts as your central hub, eliminating repetitive data entry forever and serving as the intelligent core for every future application.',
      visualization: 'A sleek animation showing a user effortlessly filling in profile sections. As they type, suggestions appear. The final view shows a complete, polished profile card with a "Profile Complete: 100%" indicator.',
      icon: User,
      color: 'from-lime-400 to-lime-500',
      bgColor: 'from-lime-400/10 to-lime-500/10',
      image: '/images/step1.gif',
      isGif: true
    },
    {
      number: '2',
      title: 'Add Job Applications in Tracker',
      headline: 'Organize Your Job Search Pipeline.',
      description: 'Effortlessly manage your entire job search from a single, intuitive dashboard. Import saved jobs or track applications you\'ve already submitted. Monitor statuses, set reminders, and maintain a clear overview of every opportunity, from initial interest to final offer.',
      visualization: 'A smooth, scrolling view of a Kanban-style board with columns like "Interested," "Applied," "Interviewing." A card representing a job animates, moving seamlessly from one column to the next with a simple drag-and-drop.',
      icon: Target,
      color: 'from-blue-400 to-blue-500',
      bgColor: 'from-blue-400/10 to-blue-500/10',
      image: '/images/STEP 2 ADD JOB APPLICATIONS IN TRACKER.png',
      isGif: false
    },
    {
      number: '3',
      title: 'Start Tailoring CV and Cover Letter',
      headline: 'Orchestrate Every Application with Precision.',
      description: 'Move beyond a one-size-fits-all approach. Initiate an \'Application Journey\' for each role you target. Here, you can link a specific job description to your Master Profile, which then intelligently generates a tailored, ATS-optimised CV and a compelling cover letter, ensuring perfect alignment with the employer\'s needs.',
      visualization: 'An animation showing a user pasting a job link. The system then displays the Master CV on the left and a new, tailored CV on the right, with keywords from the job description highlighting and appearing in the new document.',
      icon: BarChart3,
      color: 'from-purple-400 to-purple-500',
      bgColor: 'from-purple-400/10 to-purple-500/10',
      image: '/images/STEP 3 START TAILORING CV AND COVER LETTER.png',
      isGif: false
    },
    {
      number: '4',
      title: 'Edit in Studio',
      headline: 'Masterfully Craft and Perfect Your Narrative.',
      description: 'This is your personal editing suite, powered by AI. Access, edit, and enhance any document. Our intelligent assistant provides real-time suggestions to improve ATS compatibility, strengthen impact statements, and tailor your language to the precise tone and keywords of the job description.',
      visualization: 'A split-screen view. On the left is a CV. On the right, an AI assistant panel provides contextual suggestions (e.g., "Strengthen this verb," "Add a quantifiable metric here"). The user clicks a suggestion, and the text on the CV instantly updates with a subtle shimmer effect.',
      icon: Edit3,
      color: 'from-pink-400 to-pink-500',
      bgColor: 'from-pink-400/10 to-pink-500/10',
      image: '/images/STEP 4 EDIT IN STUDIO.png',
      isGif: false
    },
    {
      number: '5',
      title: 'Download and Track in Application Tracker',
      headline: 'Your Complete Application, Ready for Deployment.',
      description: 'With a single click, download a perfectly organised folder containing everything you need for your application. The job description, your newly tailored CV, and the bespoke cover letter are all consolidated in one place, ensuring you are prepared, professional, and ready to impress.',
      visualization: 'An animation showing the three document icons (JD, CV, Cover Letter) elegantly merging into a single folder icon. The folder then animates towards the bottom of the screen as a download progress bar quickly completes.',
      icon: Download,
      color: 'from-emerald-400 to-emerald-500',
      bgColor: 'from-emerald-400/10 to-emerald-500/10',
      image: '/images/ste5.jpg',
      isGif: false
    }
  ];

  // Animation variants for the sophisticated reveal effect
  const containerVariants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for luxury feel
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const stepVariants = {
    hidden: {
      opacity: 0,
      x: -40,
      y: 20
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const rightColumnVariants = {
    hidden: {
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.1
      }
    }
  };

  const textRevealVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setActiveStep(stepIndex);
  };

  return (
    <section 
      ref={sectionRef}
      id="how-it-works" 
      className="relative pt-32 pb-20 bg-gradient-to-b from-gray-900 to-black overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header Section */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.h3
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-center"
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

        {/* Horizontal Steps Flow */}
        <motion.div
          className="flex flex-wrap justify-center gap-8 mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          {steps.map((step, index) => {
            const isActive = activeStep === index;
            
            return (
              <motion.div
                key={index}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleStepClick(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step Circle */}
                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-lime-400 to-lime-500 shadow-lg shadow-lime-400/50' 
                      : 'bg-gray-800 border-2 border-white/20'
                  }`}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    boxShadow: isActive 
                      ? "0 0 30px rgba(132, 204, 22, 0.5)" 
                      : "0 4px 20px -4px rgba(0, 0, 0, 0.1)"
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {step.number}
                </motion.div>
                
                {/* Step Title */}
                <motion.h4 
                  className={`text-sm font-medium text-center transition-colors duration-300 ${
                    isActive ? 'text-lime-400' : 'text-white'
                  }`}
                >
                  {step.title}
                </motion.h4>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Large Content Container */}
        <motion.div
          className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-12 mx-auto max-w-6xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
              viewport={{ once: true }}
            >
              {/* Step Subtitle */}
              <motion.div
                className="text-lime-400 font-bold text-sm uppercase tracking-wider"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                viewport={{ once: true }}
              >
                STEP {steps[activeStep].number}: {steps[activeStep].title.toUpperCase()}
              </motion.div>
              
              {/* Main Title */}
              <motion.h4 
                className="text-3xl lg:text-4xl font-bold text-white"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                viewport={{ once: true }}
              >
                {steps[activeStep].headline}
              </motion.h4>
              
              {/* Description */}
              <motion.p
                className="text-white/80 leading-relaxed text-lg font-light"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                viewport={{ once: true }}
              >
                {steps[activeStep].description}
              </motion.p>
              
              {/* Start Your Journey Button */}
              <motion.div
                className="pt-4"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                viewport={{ once: true }}
              >
                <motion.a
                  href="/ai-career-report"
                  className="group relative inline-block bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-3 rounded-full font-semibold text-base shadow-lg hover:shadow-lime-400/50 transition-all overflow-hidden"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 15px 30px -8px rgba(128, 208, 0, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  style={{ willChange: 'transform' }}
                >
                  <div className="relative flex items-center gap-2">
                    <Sparkles size={16} />
                    <span>Start Your Journey</span>
                    <motion.div
                      whileHover={{ rotate: 45 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </div>
                </motion.a>
              </motion.div>
            </motion.div>

            {/* Right Column - Step Image */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="relative w-full max-w-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* White background container for consistent sizing */}
                <div className="bg-white rounded-2xl p-4 shadow-2xl">
                  <div className="relative w-full h-80 overflow-hidden rounded-xl">
                    {steps[activeStep].isGif ? (
                      <img
                        src={steps[activeStep].image}
                        alt={`Step ${steps[activeStep].number}: ${steps[activeStep].title}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <motion.div
                        className="relative w-full h-full"
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Image
                          src={steps[activeStep].image}
                          alt={`Step ${steps[activeStep].number}: ${steps[activeStep].title}`}
                          fill
                          className="object-contain"
                          priority={activeStep === 0}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
                
                {/* Subtle gradient overlay for visual enhancement */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-lime-400/5 to-blue-400/5 pointer-events-none"></div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
