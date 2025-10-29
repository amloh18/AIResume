'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Typewriter from '../ui/Typewriter';
import { Play, ArrowRight, Sparkles } from 'lucide-react';

const Hero = () => {
  const typewriterWords = ['CV', 'Cover Letter', 'Job Applications'];
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="hero" className="relative pt-32 pb-20 flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto" style={{ paddingTop: 'var(--navbar-height, 80px)' }}>
        {/* Main Heading with 3D Effect - Optimized */}
        <motion.h1
          className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 gpu-accelerated"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          style={{
            textShadow: '0 0 20px rgba(132, 204, 22, 0.2)',
            willChange: 'transform, opacity'
          }}
        >
          Track{' '}
          <motion.span
            className="inline-block"
            whileHover={{ 
              scale: 1.02,
              textShadow: '0 0 30px rgba(132, 204, 22, 0.4)'
            }}
            transition={{ duration: 0.2 }}
            style={{ willChange: 'transform' }}
          >
            <Typewriter 
              words={typewriterWords} 
              className="text-lime-400"
            />
          </motion.span>
        </motion.h1>

        {/* Subheading - Optimized */}
        <motion.p
          className="text-xl sm:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          style={{ willChange: 'transform, opacity' }}
        >
          One-click CV creation, cover letter generation, and job application tracking made effortless.
        </motion.p>

        {/* Enhanced CTA Buttons - Optimized */}
        <motion.div
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          style={{ willChange: 'transform, opacity' }}
        >
          <motion.a
            href="/sign-up"
            className="group relative inline-block bg-gradient-to-r from-lime-400 to-lime-500 text-black px-10 py-5 rounded-full font-semibold text-lg shadow-2xl hover:shadow-lime-400/50 transition-all overflow-hidden btn-hover"
            whileHover={{ 
              scale: 1.02,
              boxShadow: "0 15px 30px -5px rgba(132, 204, 22, 0.3)"
            }}
            whileTap={{ scale: 0.98 }}
            style={{ willChange: 'transform' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ filter: 'blur(20px)' }}
            />
            <motion.div
              className="relative flex items-center gap-3"
              whileHover={{ x: 5 }}
            >
              <span>Get Started</span>
              <motion.div
                whileHover={{ rotate: 45 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight size={20} />
              </motion.div>
            </motion.div>
          </motion.a>
          
          <motion.a
            href="/ai-career-report"
            className="group relative border-2 border-lime-400/50 text-lime-400 px-10 py-5 rounded-full font-semibold text-lg hover:bg-lime-400/10 transition-all backdrop-blur-sm overflow-hidden flex items-center gap-3"
            whileHover={{ 
              scale: 1.05,
              borderColor: 'rgba(132, 204, 22, 0.8)',
              backgroundColor: 'rgba(132, 204, 22, 0.1)'
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            <Sparkles size={20} />
            <span>AI Career Guide</span>
            <ArrowRight size={20} />
          </motion.a>
          
        </motion.div>

        {/* Hero Banner with Parallax Effect */}
        <motion.div
          className="relative w-full mx-auto mt-8 sm:mt-12 -mb-16 sm:-mb-32"
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          style={{ willChange: 'transform, opacity' }}
        >
          <motion.div
            className="relative shadow-2xl"
            whileHover={{
              scale: 1.01,
              rotateY: 1,
              boxShadow: "0 30px 60px -20px rgba(0, 0, 0, 0.6)"
            }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px',
              transform: `translateY(${Math.min(scrollY * 0.15, 100)}px)`,
              willChange: 'transform'
            }}
          >
            <div className="relative w-full h-[600px] rounded-2xl overflow-hidden">
              <Image
                src="/images/herobanner.png"
                alt="CV Circle Dashboard"
                fill
                className="object-cover object-top"
                priority
                style={{
                  transform: `translateY(${Math.min(scrollY * 0.3, 200)}px)`,
                  filter: 'drop-shadow(0 10px 20px rgba(132, 204, 22, 0.2))',
                }}
              />
            </div>

          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 z-[9999]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 2 }}
      >
        <motion.div 
          className="w-8 h-14 border-2 border-white/30 rounded-full flex justify-center relative"
          animate={{
            y: [0, 10, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <motion.div 
            className="w-2 h-4 bg-gradient-to-b from-lime-400 to-lime-500 rounded-full mt-3"
            animate={{
              y: [0, 20, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>


    </section>
  );
};

export default Hero;
