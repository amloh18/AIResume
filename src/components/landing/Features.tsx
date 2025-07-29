'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Mail, BarChart3, Palette, Users, ArrowRight } from 'lucide-react';

const Features = () => {
  const features = [
    {
      number: '01',
      title: 'CV Studio',
      description: 'CV making was never easier. Inline editing, beautiful templates.',
      icon: FileText,
      color: 'from-lime-400 to-lime-500'
    },
    {
      number: '02',
      title: 'Cover Letter Creator',
      description: 'Generate personalized cover letters instantly after creating your CV and adding the job URL.',
      icon: Mail,
      color: 'from-blue-400 to-blue-500'
    },
    {
      number: '03',
      title: 'Job Tracker',
      description: 'Smart job tracking with URL-based job fetching, plus Kanban view to manage your progress effortlessly.',
      icon: BarChart3,
      color: 'from-purple-400 to-purple-500'
    },
    {
      number: '04',
      title: 'Snippets',
      description: 'Use our pre-made style snippets to tailor your CV with personality and precision.',
      icon: Palette,
      color: 'from-pink-400 to-pink-500'
    },
    {
      number: '05',
      title: 'Community Support',
      description: 'Get connected with HRs and industry experts to review your resume and guide your job search.',
      icon: Users,
      color: 'from-cyan-400 to-cyan-500'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 100, 
      rotateX: -15,
      scale: 0.8
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="features" className="relative py-32 bg-gradient-to-b from-black to-gray-900 overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8">
            Everything you need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              succeed
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Powerful tools designed to streamline your job search process and help you stand out from the competition.
          </p>
        </motion.div>

        {/* Enhanced Features Grid with Overlapping Cards */}
        <motion.div 
          className="relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="group relative"
                  variants={cardVariants}
                  style={{
                    zIndex: features.length - index,
                    transform: `translateY(${index * 15}px) translateX(${index % 2 === 0 ? -10 : 10}px)`
                  }}
                >
                  <motion.div
                    className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full"
                    whileHover={{ 
                      scale: 1.05,
                      rotateY: 5,
                      rotateX: 5,
                      y: -10,
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                  >
                    {/* Glow Effect */}
                    <motion.div
                      className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                      style={{ filter: 'blur(20px)' }}
                    />
                    
                    {/* Number with 3D Effect */}
                    <motion.div 
                      className="text-7xl font-bold text-white/5 mb-6"
                      whileHover={{ 
                        scale: 1.1,
                        rotateY: 10,
                        textShadow: "0 0 30px rgba(255, 255, 255, 0.3)"
                      }}
                      style={{
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                      }}
                    >
                      {feature.number}
                    </motion.div>
                    
                    {/* Icon with Gradient */}
                    <motion.div 
                      className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-2xl`}
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
                      <IconComponent size={32} className="text-white" />
                    </motion.div>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-lime-400 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-white/70 leading-relaxed mb-6">
                      {feature.description}
                    </p>
                    
                    {/* Arrow Indicator */}
                    <motion.div
                      className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      whileHover={{ x: 5, rotate: 45 }}
                    >
                      <ArrowRight size={24} className="text-lime-400" />
                    </motion.div>
                    
                    {/* Border Glow on Hover */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-lime-400/30 transition-all duration-500"
                      style={{
                        background: 'linear-gradient(45deg, transparent, transparent)',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'exclude'
                      }}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Enhanced Bottom CTA */}
        <motion.div 
          className="text-center mt-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <motion.button 
            className="group relative bg-gradient-to-r from-lime-400 to-lime-500 text-black px-12 py-5 rounded-full font-semibold text-lg shadow-2xl hover:shadow-lime-400/50 transition-all duration-300 overflow-hidden"
            whileHover={{ 
              scale: 1.05,
              rotateY: 5,
              boxShadow: "0 25px 50px -12px rgba(132, 204, 22, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ filter: 'blur(20px)' }}
            />
            <motion.div
              className="relative flex items-center gap-3"
              whileHover={{ x: 5 }}
            >
              <span>Start Building Your CV</span>
              <motion.div
                whileHover={{ rotate: 45 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight size={20} />
              </motion.div>
            </motion.div>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
