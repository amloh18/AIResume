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
    <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden pt-20 bg-gradient-to-br from-gray-900 via-black to-gray-900">
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
          Create{' '}
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
            href="#chrome-extension"
            className="group relative border-2 border-white/20 text-white px-10 py-5 rounded-full font-semibold text-lg hover:bg-white/10 transition-all backdrop-blur-sm overflow-hidden"
            whileHover={{ 
              scale: 1.05,
              rotateY: -5,
              borderColor: 'rgba(132, 204, 22, 0.5)'
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-lime-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ filter: 'blur(20px)' }}
            />
            <div className="relative flex items-center gap-3">
              <Play size={20} />
              <span>Download Extension</span>
            </div>
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
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/10] rounded-2xl overflow-hidden">
              <Image
                src="/images/Herobanner.png"
                alt="CV Circle Dashboard"
                fill
                className="object-contain drop-shadow-2xl scale-110 sm:scale-100"
                priority
                style={{
                  filter: 'drop-shadow(0 10px 20px rgba(132, 204, 22, 0.2))',
                }}
              />
            </div>

            {/* Animated Annotations */}
            <div className="absolute inset-0 pointer-events-none">
              
              {/* Annotation 1: CV Health Score - Top Left */}
              <motion.div
                className="absolute top-[15%] left-[8%] z-50"
                style={{ transform: 'translate(100px, 100px)' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1.5 }}
              >
                <div className="relative">
                  {/* Curved Arrow Path - From center to top-left */}
                  <svg className="absolute w-32 h-16" viewBox="0 0 128 64">
                    <motion.path
                      d="M 128 32 Q 96 64 64 32 Q 32 0 0 32"
                      stroke="#84cc16"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2 }}
                    />
                    {/* Arrow Head pointing to CV Health Score */}
                    <motion.polygon
                      points="8,28 0,32 8,36"
                      fill="#84cc16"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 2.8 }}
                    />
                  </svg>
                  {/* Text */}
                  <motion.div
                    className="absolute bg-lime-400/90 backdrop-blur-sm text-black px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap"
                    style={{ left: '140px', top: '20px' }}
                    animate={{
                      opacity: [0, 1],
                      y: [10, 0],
                    }}
                    transition={{ duration: 0.5, delay: 2.2 }}
                  >
                    CV Health Score
                  </motion.div>
                </div>
              </motion.div>

              {/* Annotation 2: AI Job Whisperer - Left Side */}
              <motion.div
                className="absolute top-[35%] left-[2%] z-50"
                style={{ transform: 'translate(100px, 100px)' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1.8 }}
              >
                <div className="relative">
                  {/* Curved Arrow Path - From center to left */}
                  <svg className="absolute w-40 h-20" viewBox="0 0 160 80">
                    <motion.path
                      d="M 160 40 Q 120 80 80 40 Q 40 0 0 40"
                      stroke="#84cc16"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.3 }}
                    />
                    {/* Arrow Head pointing to AI Job Whisperer */}
                    <motion.polygon
                      points="8,36 0,40 8,44"
                      fill="#84cc16"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 3.1 }}
                    />
                  </svg>
                  {/* Text */}
                  <motion.div
                    className="absolute bg-lime-400/90 backdrop-blur-sm text-black px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap"
                    style={{ left: '170px', top: '30px' }}
                    animate={{
                      opacity: [0, 1],
                      y: [10, 0],
                    }}
                    transition={{ duration: 0.5, delay: 2.5 }}
                  >
                    AI Job Whisperer
                  </motion.div>
                </div>
              </motion.div>

              {/* Annotation 3: CV Tips - Right Side */}
              <motion.div
                className="absolute top-[35%] right-[2%] z-50"
                style={{ transform: 'translate(-100px, 0px)' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 2.1 }}
              >
               
                <div className="relative">
                  {/* Curved Arrow Path - From center to right */}
                  <svg className="absolute w-40 h-20" viewBox="0 0 160 80">
                    <motion.path
                      d="M 0 40 Q 40 80 80 40 Q 120 0 160 40"
                      stroke="#84cc16"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.6 }}
                    />
                    {/* Arrow Head pointing to CV Tips */}
                    <motion.polygon
                      points="152,36 160,40 152,44"
                      fill="#84cc16"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 3.4 }}
                    />
                  </svg>
                  {/* Text */}
                  <motion.div
                    className="absolute bg-lime-400/90 backdrop-blur-sm text-black px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap"
                    style={{ right: '170px', top: '30px' }}
                    animate={{
                      opacity: [0, 1],
                      y: [10, 0],
                    }}
                    transition={{ duration: 0.5, delay: 2.8 }}
                  >
                    CV Tips & Actions
                  </motion.div>
                </div>
              </motion.div>

              {/* Annotation 4: Status Cards - Top Center */}
              <motion.div
                className="absolute top-[5%] left-1/2 transform -translate-x-1/2 z-50"
                style={{ transform: 'translate(-50%, 100px)' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 2.4 }}
              >
                <div className="relative">
                  {/* Curved Arrow Path - From center to top */}
                  <svg className="absolute w-20 h-24" viewBox="0 0 80 96">
                    <motion.path
                      d="M 40 96 Q 40 76 40 56 Q 40 36 40 16 Q 40 0 40 0"
                      stroke="#84cc16"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 2.9 }}
                    />
                    {/* Arrow Head pointing to Status Cards */}
                    <motion.polygon
                      points="36,8 40,0 44,8"
                      fill="#84cc16"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 3.7 }}
                    />
                  </svg>
                  {/* Text */}
                  <motion.div
                    className="absolute bg-lime-400/90 backdrop-blur-sm text-black px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap"
                    style={{ left: '50%', top: '100px', transform: 'translateX(-50%)' }}
                    animate={{
                      opacity: [0, 1],
                      y: [10, 0],
                    }}
                    transition={{ duration: 0.5, delay: 3.1 }}
                  >
                    Job Application Status
                  </motion.div>
                </div>
              </motion.div>

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
