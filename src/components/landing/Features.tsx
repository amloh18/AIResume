'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Target, BarChart3, Download, Zap, CheckCircle, Eye, FileText } from 'lucide-react';

const Features = () => {
  const features = [
    {
      id: 'never-miss-role',
      title: 'Never Miss a Role',
      description: 'Effortless job saving and tracking across all major boards is here. Keep your job hunt organized and focused, automatically. Get an instant, free analysis of your current CV.',
      icon: Target,
      color: 'from-lime-400 to-lime-500',
      bgColor: 'from-lime-400/10 to-lime-500/10',
      cta: 'Download Extension',
      ctaLink: '/chrome-extension',
      image: '/images/never_miss_a_role.png'
    },
    {
      id: 'gain-your-edge',
      title: 'Gain Your Edge',
      description: 'See exactly how it ranks in the market and what hiring managers look for.',
      icon: BarChart3,
      color: 'from-blue-400 to-blue-500',
      bgColor: 'from-blue-400/10 to-blue-500/10',
      cta: 'Check My CV For Free',
      ctaLink: '/ai-career-report',
      image: '/images/gain_your_edge.png'
    },
    {
      id: 'one-click-career-kit',
      title: 'One-Click Career Kit',
      description: 'Instantly download a complete package: a tailored CV, personalised cover letter, and an ATS-ready industry report.',
      icon: Download,
      color: 'from-purple-400 to-purple-500',
      bgColor: 'from-purple-400/10 to-purple-500/10',
      cta: 'Start Now',
      ctaLink: '/sign-up',
      image: '/images/one_click_career_kit.png'
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
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col justify-center">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-center">
            Everything you need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              succeed
            </span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
            Powerful tools designed to streamline your job search process and help you stand out from the competition.
          </p>
        </motion.div>

        {/* Three Cards Layout */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
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
                      transform: feature.id === 'never-miss-role' 
                        ? 'scale(0.9)' :
                      feature.id === 'gain-your-edge' 
                        ? 'scale(0.9)' :
                      feature.id === 'one-click-career-kit' 
                        ? 'scale(1.1)' :
                      'scale(1)'
                    }}
                  >
                    {feature.image.endsWith('.svg') ? (
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className={`w-full h-full ${
                          feature.id === 'never-miss-role' ? 'object-contain brightness-0 invert' :
                          feature.id === 'gain-your-edge' ? 'object-contain' :
                          feature.id === 'one-click-career-kit' ? 'object-cover' :
                          'object-cover'
                        }`}
                      />
                    ) : (
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className={
                          feature.id === 'never-miss-role' 
                            ? 'object-contain' :
                          feature.id === 'gain-your-edge' 
                            ? 'object-contain' :
                          feature.id === 'one-click-career-kit' 
                            ? 'object-cover' :
                          'object-cover'
                        }
                      />
                    )}
                  </div>
                </motion.div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-lime-400 transition-colors duration-300 mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-white/70 leading-relaxed text-sm sm:text-base lg:text-lg flex-grow">
                    {feature.description}
                  </p>
                  
                  {/* CTA Button */}
                  <motion.a
                    href={feature.ctaLink}
                    className="group/btn relative inline-flex items-center gap-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-semibold text-sm sm:text-base shadow-lg hover:shadow-lime-400/50 transition-all overflow-hidden mt-6 w-fit"
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
