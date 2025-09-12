'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { User, Target, BarChart3, Edit3, Download, ArrowRight, Sparkles } from 'lucide-react';

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
      title: 'Assemble Your Master Profile',
      headline: 'The Single Source of Truth for Your Career.',
      description: 'This is your foundational career blueprint. Input your experience, skills, and achievements just once to create a comprehensive, dynamic profile. This master document acts as your central hub, eliminating repetitive data entry forever and serving as the intelligent core for every future application.',
      visualization: 'A sleek animation showing a user effortlessly filling in profile sections. As they type, suggestions appear. The final view shows a complete, polished profile card with a "Profile Complete: 100%" indicator.',
      icon: User,
      color: 'from-lime-400 to-lime-500',
      bgColor: 'from-lime-400/10 to-lime-500/10'
    },
    {
      number: '2',
      title: 'Curate Your Application Journey',
      headline: 'Orchestrate Every Application with Precision.',
      description: 'Move beyond a one-size-fits-all approach. Initiate an \'Application Journey\' for each role you target. Here, you can link a specific job description to your Master Profile, which then intelligently generates a tailored, ATS-optimised CV and a compelling cover letter, ensuring perfect alignment with the employer\'s needs.',
      visualization: 'An animation showing a user pasting a job link. The system then displays the Master CV on the left and a new, tailored CV on the right, with keywords from the job description highlighting and appearing in the new document.',
      icon: Target,
      color: 'from-blue-400 to-blue-500',
      bgColor: 'from-blue-400/10 to-blue-500/10'
    },
    {
      number: '3',
      title: 'Centralise with the Opportunity Tracker',
      headline: 'Command Your Career Pipeline with Clarity.',
      description: 'Effortlessly manage your entire job search from a single, intuitive dashboard. Import saved jobs or track applications you\'ve already submitted. Monitor statuses, set reminders, and maintain a clear overview of every opportunity, from initial interest to final offer.',
      visualization: 'A smooth, scrolling view of a Kanban-style board with columns like "Interested," "Applied," "Interviewing." A card representing a job animates, moving seamlessly from one column to the next with a simple drag-and-drop.',
      icon: BarChart3,
      color: 'from-purple-400 to-purple-500',
      bgColor: 'from-purple-400/10 to-purple-500/10'
    },
    {
      number: '4',
      title: 'Refine in the CV Studio',
      headline: 'Masterfully Craft and Perfect Your Narrative.',
      description: 'This is your personal editing suite, powered by AI. Access, edit, and enhance any document. Our intelligent assistant provides real-time suggestions to improve ATS compatibility, strengthen impact statements, and tailor your language to the precise tone and keywords of the job description.',
      visualization: 'A split-screen view. On the left is a CV. On the right, an AI assistant panel provides contextual suggestions (e.g., "Strengthen this verb," "Add a quantifiable metric here"). The user clicks a suggestion, and the text on the CV instantly updates with a subtle shimmer effect.',
      icon: Edit3,
      color: 'from-pink-400 to-pink-500',
      bgColor: 'from-pink-400/10 to-pink-500/10'
    },
    {
      number: '5',
      title: 'Download Your Consolidated Dossier',
      headline: 'Your Complete Application, Ready for Deployment.',
      description: 'With a single click, download a perfectly organised folder containing everything you need for your application. The job description, your newly tailored CV, and the bespoke cover letter are all consolidated in one place, ensuring you are prepared, professional, and ready to impress.',
      visualization: 'An animation showing the three document icons (JD, CV, Cover Letter) elegantly merging into a single folder icon. The folder then animates towards the bottom of the screen as a download progress bar quickly completes.',
      icon: Download,
      color: 'from-emerald-400 to-emerald-500',
      bgColor: 'from-emerald-400/10 to-emerald-500/10'
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
      className="relative py-32 bg-gradient-to-b from-gray-900 to-black overflow-hidden"
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/3 to-blue-400/3"></div>
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/2 to-emerald-400/2 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-to-r from-purple-400/2 to-pink-400/2 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sophisticated Header Section */}
        <motion.div
          className="text-center mb-24"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
                 <motion.h3
                   className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 text-center"
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
          
          <motion.p
            className="text-xl text-white/70 max-w-4xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            Our platform is meticulously designed to transform the job application process from a chore into a strategic advantage. Experience a seamless, intelligent workflow that empowers you to present the best version of your professional self, every time.
          </motion.p>
        </motion.div>

        {/* Five Steps Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Left Column - Compact Steps List */}
          <motion.div
            className="lg:col-span-1 space-y-4 flex flex-col order-2 lg:order-1"
            initial={{ opacity: 0, x: -40 }}
            animate={{ 
              opacity: isSectionVisible ? 1 : 0,
              x: isSectionVisible ? 0 : -40 
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              const isActive = activeStep === index;
              
              return (
                <motion.div
                  key={index}
                  className="group cursor-pointer"
                  onClick={() => handleStepClick(index)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className={`relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 ${
                      isActive 
                        ? 'border-lime-400/50 shadow-lg shadow-lime-400/10' 
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    animate={{
                      y: isActive ? -4 : 0,
                      boxShadow: isActive 
                        ? "0 20px 40px -12px rgba(132, 204, 22, 0.2)" 
                        : "0 4px 20px -4px rgba(0, 0, 0, 0.1)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Glow Effect */}
                    <motion.div
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                      style={{ filter: 'blur(20px)' }}
                    />
                    
                    <div className="flex items-center gap-4">
                      {/* Step Number */}
                      <motion.div 
                        className={`text-3xl font-bold transition-colors duration-300 ${
                          isActive ? 'text-lime-400' : 'text-white/20'
                        }`}
                        animate={{
                          scale: isActive ? 1.1 : 1,
                          textShadow: isActive ? "0 0 20px rgba(132, 204, 22, 0.4)" : "none"
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {step.number}
                      </motion.div>
                      
                      {/* Icon */}
                      <motion.div 
                        className={`w-12 h-12 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center shadow-lg`}
                        animate={{
                          scale: isActive ? 1.1 : 1,
                          rotateY: isActive ? 15 : 0
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          transformStyle: 'preserve-3d',
                          perspective: '1000px'
                        }}
                      >
                        <IconComponent size={20} className="text-white" />
                      </motion.div>
                      
                      {/* Title */}
                      <motion.h3 
                        className={`text-lg font-semibold transition-colors duration-300 ${
                          isActive ? 'text-lime-400' : 'text-white'
                        }`}
                      >
                        {step.title}
                      </motion.h3>
                    </div>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ArrowRight size={16} className="text-lime-400" />
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Right Column - Content Display */}
          <motion.div
            className="lg:col-span-2 flex order-1 lg:order-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ 
              opacity: isSectionVisible ? 1 : 0,
              x: isSectionVisible ? 0 : 40 
            }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative bg-gradient-to-br from-white/3 to-white/8 backdrop-blur-xl border border-white/10 rounded-3xl p-12 w-full h-full flex flex-col"
            >
              {/* Headline */}
              <motion.h4 
                className="text-3xl lg:text-4xl font-bold text-white mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {steps[activeStep].headline}
              </motion.h4>
              
              {/* Description */}
              <motion.div
                className="space-y-6 mb-8 flex-grow"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <p className="text-white/80 leading-relaxed text-lg font-light">
                  {steps[activeStep].description}
                </p>
              </motion.div>
              
              {/* Visualization Placeholder */}
              <motion.div
                className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-8 border border-white/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                whileHover={{
                  scale: 1.02,
                  borderColor: 'rgba(132, 204, 22, 0.3)'
                }}
              >
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    className={`w-16 h-16 bg-gradient-to-br ${steps[activeStep].color} rounded-xl flex items-center justify-center`}
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {React.createElement(steps[activeStep].icon, { size: 32, className: "text-white" })}
                  </motion.div>
                </div>
                <p className="text-white/60 text-sm italic text-center">
                  <em>Visualisation (GIF Placeholder):</em> {steps[activeStep].visualization}
                </p>
              </motion.div>
              
              {/* Start Your Journey Button */}
              <motion.div
                className="mt-6 flex justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <motion.a
                  href="/onboarding"
                  className="group relative inline-block bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 sm:px-6 sm:py-3 rounded-full font-semibold text-sm sm:text-base shadow-lg hover:shadow-lime-400/50 transition-all overflow-hidden"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 15px 30px -8px rgba(132, 204, 22, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  style={{ willChange: 'transform' }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ filter: 'blur(20px)' }}
                  />
                  <div className="relative flex items-center gap-2">
                    <Sparkles size={16} className="sm:w-5 sm:h-5" />
                    <span>Start Your Journey</span>
                    <motion.div
                      whileHover={{ rotate: 45 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight size={16} className="sm:w-5 sm:h-5" />
                    </motion.div>
                  </div>
                </motion.a>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
