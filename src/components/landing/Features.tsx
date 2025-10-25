'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Mail, BarChart3, Palette, Users, Brain, ArrowRight, CheckCircle, Target, Layers, Eye, Edit3, Download, Zap } from 'lucide-react';

const Features = () => {
  const features = [
    {
      id: 'ats-optimization',
      category: 'ATS Optimization',
      title: 'One-Click ATS Check',
      description: 'Instantly optimize your CV for Applicant Tracking Systems. Get real-time ATS scores and actionable improvements to pass automated screenings.',
      icon: CheckCircle,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-lime-400 to-lime-500'
    },
    {
      id: 'application-tracker',
      category: 'Application Tracker',
      title: 'Smart Job Management',
      description: 'Seamlessly add jobs through our browser extension. Track applications, deadlines, and follow-ups with intelligent organization.',
      icon: Target,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-blue-400 to-blue-500'
    },
    {
      id: 'journey-manager',
      category: 'Journey Manager',
      title: '5-Step Application Process',
      description: 'Master your job applications with our structured 5-step journey. From research to follow-up, we guide you through every stage.',
      icon: Layers,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-purple-400 to-purple-500'
    },
    {
      id: 'canvas',
      category: 'Canvas',
      title: 'Unified Document Hub',
      description: 'View and manage all your documents in one place. CVs, cover letters, job descriptions, and ATS results at your fingertips.',
      icon: Eye,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-pink-400 to-pink-500'
    },
    {
      id: 'studio',
      category: 'Studio',
      title: 'Professional Editor',
      description: 'Create and update CVs and cover letters with our advanced editor. Real-time ATS scoring and AI-powered suggestions included.',
      icon: Edit3,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-orange-400 to-orange-500'
    },
    {
      id: 'template-selection',
      category: 'Templates',
      title: 'Design Excellence',
      description: 'Choose from our curated collection of professional templates. Industry-specific designs that make your application stand out.',
      icon: Palette,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-cyan-400 to-cyan-500'
    },
    {
      id: 'one-click-download',
      category: 'Export',
      title: 'One-Click Journey Download',
      description: 'Download your complete application package as a ZIP file. Includes CV, cover letter, job description, and ATS optimization results.',
      icon: Download,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-green-400 to-green-500'
    },
    {
      id: 'ai-insights',
      category: 'AI Assistant',
      title: 'Smart Career Insights',
      description: 'Get personalized career advice and job matching powered by advanced AI. Optimize your applications with intelligent recommendations.',
      icon: Zap,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-indigo-400 to-indigo-500'
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
    <section id="features" className="relative min-h-screen flex items-center bg-gradient-to-b from-gray-900 to-black overflow-hidden pt-20 pb-20">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col justify-center">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
                 <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6 text-center">
                   Everything you need to{' '}
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
                     succeed
                   </span>
                 </h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
            Powerful tools designed to streamline your job search process and help you stand out from the competition.
          </p>
        </motion.div>

        {/* MagicBento Grid Layout */}
        <motion.div 
          className="relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="bento-grid">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              
              return (
                       <motion.div
                         key={feature.id}
                         className={`bento-box ${feature.size} group`}
                         id={feature.id}
                         variants={cardVariants}
                         transition={{
                           duration: 0.6,
                           ease: "easeOut"
                         }}
                         style={{
                           zIndex: features.length - index,
                           willChange: 'transform, opacity'
                         }}
                         whileHover={{
                           scale: 1.02,
                           y: -4,
                           transition: { duration: 0.3 }
                         }}
                       >
                         {/* Infused Number */}
                         <motion.div
                           className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20"
                           whileHover={{
                             scale: 1.05,
                             backgroundColor: "rgba(255, 255, 255, 0.15)"
                           }}
                           transition={{ duration: 0.3 }}
                         >
                           <motion.div
                             className="text-2xl font-bold text-gray-200 group-hover:text-lime-400 transition-colors duration-300"
                             whileHover={{
                               scale: 1.1,
                               textShadow: "0 0 15px rgba(132, 204, 22, 0.6)"
                             }}
                             transition={{ duration: 0.2 }}
                           >
                             {index + 1}
                           </motion.div>
                         </motion.div>

                         {/* Icon */}
                         <motion.div
                           className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-2xl mb-4`}
                           whileHover={{
                             scale: 1.1,
                             rotateY: 15,
                             boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.5)"
                           }}
                           style={{
                             transformStyle: 'preserve-3d',
                             perspective: '1000px'
                           }}
                         >
                           <IconComponent size={24} className="text-white" />
                         </motion.div>

                  {feature.contentPosition === 'split' ? (
                    <>
                      <div className="box-content top-left">
                        <p className="category">{feature.category}</p>
                      </div>
                      <div className="box-content bottom-left">
                        <h3 className="group-hover:text-lime-400 transition-colors">{feature.title}</h3>
                        <p className="description">{feature.description}</p>
                      </div>
                    </>
                  ) : (
                    <div className={`box-content ${feature.contentPosition}`}>
                      <p className="category">{feature.category}</p>
                      <h3 className="group-hover:text-lime-400 transition-colors">{feature.title}</h3>
                      <p className="description">{feature.description}</p>
                    </div>
                  )}

                  {/* Arrow Indicator */}
                  <motion.div
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
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
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default Features;
