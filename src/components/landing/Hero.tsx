'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Typewriter from '../ui/Typewriter';
import { Play, ArrowRight } from 'lucide-react';

const Hero = () => {
  const typewriterPhrases = [
    { action: 'Create', item: 'CV' },
    { action: 'Create', item: 'Cover Letter' },
    { action: 'Track', item: 'Job Application' }
  ];
  const [scrollY, setScrollY] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [currentItem, setCurrentItem] = useState('');
  const [isTypingAction, setIsTypingAction] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  // Use Next.js Image component for better optimization and error handling
  const [imageError, setImageError] = useState(false);

  // Typewriter effect
  useEffect(() => {
    const currentPhrase = typewriterPhrases[currentIndex];
    
    if (isTypingAction) {
      // Typing the action word (Create/Track) in white
      if (currentAction.length < currentPhrase.action.length) {
        const timeout = setTimeout(() => {
          setCurrentAction(currentPhrase.action.slice(0, currentAction.length + 1));
        }, 150);
        return () => clearTimeout(timeout);
      } else {
        // Move to typing the item
        const timeout = setTimeout(() => {
          setIsTypingAction(false);
        }, 300);
        return () => clearTimeout(timeout);
      }
    } else {
      // Typing the item (CV/Cover Letter/job application)
      if (isDeleting) {
        if (currentItem.length > 0) {
          const timeout = setTimeout(() => {
            setCurrentItem(currentItem.slice(0, -1));
          }, 100);
          return () => clearTimeout(timeout);
        } else if (currentAction.length > 0) {
          const timeout = setTimeout(() => {
            setCurrentAction(currentAction.slice(0, -1));
          }, 100);
          return () => clearTimeout(timeout);
        } else {
          // Move to next phrase
          setIsDeleting(false);
          setIsTypingAction(true);
          setCurrentIndex((prev) => (prev + 1) % typewriterPhrases.length);
          setCurrentAction('');
          setCurrentItem('');
        }
      } else {
        if (currentItem.length < currentPhrase.item.length) {
          const timeout = setTimeout(() => {
            setCurrentItem(currentPhrase.item.slice(0, currentItem.length + 1));
          }, 150);
          return () => clearTimeout(timeout);
        } else {
          // Pause before deleting
          const timeout = setTimeout(() => {
            setIsDeleting(true);
          }, 2000);
          return () => clearTimeout(timeout);
        }
      }
    }
  }, [currentAction, currentItem, currentIndex, isTypingAction, isDeleting, typewriterPhrases]);

  useEffect(() => {
    let ticking = false;
    let lastScrollY = 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Throttle scroll updates - only update if scroll changed significantly
      if (Math.abs(currentScrollY - lastScrollY) < 5) {
        return;
      }
      lastScrollY = currentScrollY;
      
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(currentScrollY);
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
      <div className="relative z-10 text-center px-4 tablet:px-6 desktop:px-8 w-full max-w-7xl mx-auto" style={{ paddingTop: 'var(--navbar-height, 80px)' }}>
        {/* Main Heading with 3D Effect - Optimized */}
        <motion.h1
          className="text-3xl tablet:text-5xl desktop:text-7xl font-bold text-white mb-6 gpu-accelerated"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          style={{
            textShadow: '0 0 20px rgba(132, 204, 22, 0.2)',
            willChange: 'auto'
          }}
        >
          <motion.span
            className="inline-block"
            whileHover={{ 
              scale: 1.02,
              textShadow: '0 0 30px rgba(132, 204, 22, 0.4)'
            }}
            transition={{ duration: 0.2 }}
            style={{ willChange: 'auto' }}
          >
            <span className="text-white">{currentAction}</span>
            {currentAction.length > 0 && <span className="text-white"> </span>}
            <span className="text-lime-400">
              {currentItem}
              {!isDeleting && (currentAction.length > 0 || currentItem.length > 0) && (
                <span className="animate-pulse">|</span>
              )}
            </span>
          </motion.span>
        </motion.h1>

        {/* Subheading - Optimized */}
        <motion.p
          className="text-base tablet:text-xl desktop:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          style={{ willChange: 'auto' }}
        >
          Add a job application, and our AI handles the rest.
        </motion.p>

        {/* Enhanced CTA Buttons - Optimized */}
        <motion.div
          className="flex flex-col tablet:flex-row gap-6 justify-center items-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          style={{ willChange: 'auto' }}
        >
          <motion.a
            href="/sign-up"
            className="group relative border-2 border-lime-400/50 text-lime-400 px-5 py-2.5 tablet:px-8 tablet:py-4 desktop:px-10 desktop:py-5 rounded-full font-semibold text-sm tablet:text-base desktop:text-lg hover:bg-lime-400/10 transition-all backdrop-blur-sm overflow-hidden flex items-center gap-2 tablet:gap-3"
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
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 tablet:w-5 tablet:h-5" />
          </motion.a>
          
          <motion.a
            href="/ai-career-report"
            className="group relative inline-block bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black px-5 py-2.5 tablet:px-8 tablet:py-4 desktop:px-10 desktop:py-5 rounded-full font-semibold text-sm tablet:text-base desktop:text-lg shadow-2xl hover:shadow-[rgb(129,255,0)]/50 transition-all overflow-hidden btn-hover"
            whileHover={{ 
              scale: 1.02,
              boxShadow: "0 15px 30px -5px rgba(132, 204, 22, 0.3)"
            }}
            whileTap={{ scale: 0.98 }}
            style={{ willChange: 'auto' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ filter: 'blur(20px)' }}
            />
            <motion.div
              className="relative flex items-center gap-2 tablet:gap-3"
              whileHover={{ x: 5 }}
            >
              <span>AI Career Guide</span>
              <motion.div
                whileHover={{ rotate: 45 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight className="w-4 h-4 tablet:w-5 tablet:h-5" />
              </motion.div>
            </motion.div>
          </motion.a>
          
        </motion.div>

        {/* Hero Banner with Parallax Effect */}
          <motion.div
            className="relative w-full mx-auto mt-8 tablet:mt-12 -mb-16 tablet:-mb-32"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            style={{ willChange: 'auto' }}
          >
          <motion.div
            className="relative shadow-2xl"
            whileHover={{
              scale: 1.01,
            }}
            style={{
              transform: `translate3d(0, ${Math.min(scrollY * 0.15, 100)}px, 0)`,
              willChange: scrollY > 0 ? 'transform' : 'auto',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div className="relative w-full h-[600px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
              {!imageError ? (
                <div 
                  className="absolute inset-0"
                  style={{
                    transform: `translate3d(0, ${Math.min(scrollY * 0.3, 200)}px, 0)`,
                    willChange: scrollY > 0 ? 'transform' : 'auto'
                  }}
                >
                  <Image
                    src="/images/herobanner.png"
                    alt="CV Circle Dashboard"
                    fill
                    className="object-cover object-top"
                    priority
                    quality={85}
                    sizes="100vw"
                    style={{
                      filter: 'drop-shadow(0 10px 20px rgba(132, 204, 22, 0.2))',
                    }}
                    onError={() => {
                      console.error('Hero banner image failed to load');
                      setImageError(true);
                    }}
                    onLoad={() => {
                      console.log('Hero banner image loaded successfully');
                    }}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#80FF00] mb-2">CV Circle</div>
                    <div className="text-gray-400">Dashboard Preview</div>
                  </div>
                </div>
              )}
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
