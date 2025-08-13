'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Typewriter from '../ui/Typewriter';
import { Play, ArrowRight, Sparkles } from 'lucide-react';

const Hero = () => {
  const typewriterWords = ['CV', 'Cover Letter', 'Job Tracker'];
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
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated Gradient Orbs - Optimized */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl gpu-accelerated"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ willChange: 'transform, opacity' }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl gpu-accelerated"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          style={{ willChange: 'transform, opacity' }}
        />
        
        {/* Reduced Raining Particles for Performance */}
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-lime-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 20}%`,
                willChange: 'transform, opacity'
              }}
              animate={{
                y: [0, 600],
                opacity: [0, 0.8, 0.2, 0],
                scale: [0, 1, 0.6, 0],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        {/* Grid Lines with 3D Effect */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform rotate-12"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/3 to-transparent transform -rotate-12"></div>
        </div>
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
          Your one-stop platform for job seekers. Smart, fast, beautiful.
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
            href="/onboarding"
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
              <Sparkles size={20} />
              <span>Get Started</span>
              <motion.div
                whileHover={{ rotate: 45 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight size={20} />
              </motion.div>
            </motion.div>
          </motion.a>
          
          <motion.button
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
              <span>Watch Demo</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Hero Image Preview */}
        <motion.div
          className="relative w-full mx-auto mt-12 -mb-32"
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
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden">
              {/* Hero Image */}
              <img
                src="/Hero.png"
                alt="CVCircle Platform Preview"
                className="w-full h-full object-contain"
                style={{
                  filter: 'none',
                }}
              />
              {/* Removed overlay */}
            </div>
          </motion.div>
          
          {/* Enhanced Floating Elements */}
          <motion.div
            className="absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full shadow-2xl"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-6 -right-6 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full shadow-2xl"
            animate={{
              y: [0, 20, 0],
              rotate: [360, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </motion.div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60"
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
        <p className="text-center mt-2 text-sm font-medium">Scroll to explore</p>
      </motion.div>
    </section>
  );
};

export default Hero;
