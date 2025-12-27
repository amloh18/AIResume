'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const sectionRef = useRef<HTMLElement>(null);
  
  // Parallax scroll effect with spring for smoother animation
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  
  // Use spring for smoother, less jittery animations
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  // Image moves slower than scroll (parallax effect)
  const imageY = useTransform(smoothProgress, [0, 1], ['0%', '20%']);
  const textY = useTransform(smoothProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(smoothProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');

  return (
    // Layer 1: Main Section
    <section ref={sectionRef} id="hero" className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-black">

      {/* Background Effects (Layer 1 Content) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/10 to-blue-400/10 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Layer 2: Banner Container with Parallax */}
      <motion.div
        className="absolute rounded-3xl overflow-hidden z-10 border border-white/10 shadow-2xl will-change-transform"
        style={{ 
          top: '15px', 
          left: '15px', 
          right: '15px', 
          bottom: '15px',
          y: imageY,
          transform: 'translateZ(0)' // Force GPU acceleration
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Banner Image - using loading="eager" for LCP */}
        <img
          src="/images/herobanner.png"
          alt="CV Circle Dashboard"
          className="w-full h-full object-cover object-top"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </motion.div>

      {/* Layer 3: Hero Text Container with Parallax */}
      <motion.div 
        className="relative z-20 w-full max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 flex flex-col justify-center items-center text-center will-change-transform"
        style={{ y: textY, opacity, transform: 'translateZ(0)' }}
      >

        {/* Main Heading */}
        <motion.h1
          className="text-2xl tablet:text-4xl desktop:text-6xl text-white mb-6 font-bold tracking-tight will-change-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            textShadow: '0 0 30px rgba(0,0,0,0.5)',
          }}
        >
          <span className="inline-block">
            Stop wasting{' '}
            <span className="inline-flex items-center -space-x-1 tablet:-space-x-2 font-mono align-bottom">
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={currentTime.getHours()}
                  className="text-white text-2xl tablet:text-4xl desktop:text-6xl uppercase"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  ti
                </motion.span>
              </AnimatePresence>
              <motion.span
                className="text-lime-400 text-2xl tablet:text-4xl desktop:text-6xl mx-0.5"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              >
                :
              </motion.span>
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={minutes}
                  className="text-white text-2xl tablet:text-4xl desktop:text-6xl uppercase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  me
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
        </motion.h1>

        <motion.h2
          className="text-xl tablet:text-3xl desktop:text-4xl text-white/90 mb-8 drop-shadow-lg will-change-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <span className="inline-block italic font-light">
            Start getting interviews
          </span>
        </motion.h2>

        {/* Subheading */}
        <motion.p
          className="text-sm tablet:text-lg desktop:text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed drop-shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          Fully automated application tracker with cv, cover letter providing maximum ats compatibility
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col tablet:flex-row gap-6 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        >
          <motion.a
            href="/sign-up?callbackUrl=/dashboard"
            className="group relative inline-block bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black px-6 py-3 tablet:px-8 tablet:py-4 desktop:px-10 desktop:py-5 rounded-full font-bold text-xs tablet:text-sm desktop:text-base shadow-2xl hover:shadow-[rgb(129,255,0)]/50 transition-all overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative flex items-center gap-2 tablet:gap-3">
              <span>Start Free</span>
              <ArrowRight className="w-4 h-4 tablet:w-5 tablet:h-5 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.a>

          <motion.a
            href="/resume-enhancer"
            className="group relative border-2 border-white/30 text-white px-6 py-3 tablet:px-8 tablet:py-4 desktop:px-10 desktop:py-5 rounded-full font-bold text-xs tablet:text-sm desktop:text-base hover:bg-white/10 hover:border-white/50 transition-all backdrop-blur-md flex items-center gap-2 tablet:gap-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Career Guide</span>
            <ArrowRight className="w-4 h-4 tablet:w-5 tablet:h-5 transition-transform group-hover:translate-x-1" />
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
