'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Mail, BarChart3, Palette, Users, Brain, ArrowRight } from 'lucide-react';

const Features = () => {
  const features = [
    {
      id: 'cv-studio',
      category: 'CV Studio',
      title: 'Professional Builder',
      description: 'Transform your career story with our intuitive CV builder. Features real-time inline editing and AI-powered content suggestions.',
      icon: FileText,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-lime-400 to-lime-500'
    },
    {
      id: 'cover-letter',
      category: 'Cover Letter Creator',
      title: 'AI-Powered Letters',
      description: 'Generate compelling, personalized cover letters in seconds. Simply paste a job URL and our AI analyzes the requirements.',
      icon: Mail,
      size: 'normal',
      contentPosition: 'top-left',
      color: 'from-blue-400 to-blue-500'
    },
    {
      id: 'job-tracker',
      category: 'Job Tracker',
      title: 'Smart Organization',
      description: 'Master your job search with intelligent tracking and organization. Our smart system fetches job details from URLs.',
      icon: BarChart3,
      size: 'span-2-col span-2-row',
      contentPosition: 'split',
      color: 'from-purple-400 to-purple-500'
    },
    {
      id: 'style-snippets',
      category: 'Style Snippets',
      title: 'Design Excellence',
      description: 'Personalize your CV with our curated collection of professional style snippets. Choose from industry-specific designs.',
      icon: Palette,
      size: 'span-2-col span-2-row',
      contentPosition: 'split',
      color: 'from-pink-400 to-pink-500'
    },
    {
      id: 'community-support',
      category: 'Community Support',
      title: 'Expert Network',
      description: 'Connect with industry professionals, HR experts, and career coaches in our vibrant community.',
      icon: Users,
      size: 'normal',
      contentPosition: 'bottom-left',
      color: 'from-cyan-400 to-cyan-500'
    },
    {
      id: 'ai-assistant',
      category: 'AI Career Assistant',
      title: 'Intelligent Guidance',
      description: 'Leverage cutting-edge AI to accelerate your career growth. Our intelligent assistant provides personalized career advice.',
      icon: Brain,
      size: 'normal',
      contentPosition: 'bottom-left',
      color: 'from-orange-400 to-orange-500'
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
    <section id="features" className="relative py-32 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
                 <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 text-center">
                   Everything you need to{' '}
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
                     succeed
                   </span>
                 </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
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
