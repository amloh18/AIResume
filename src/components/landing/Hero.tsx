'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');

  return (
    <section id="hero" className="relative pt-32 pb-20 flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 tablet:px-6 desktop:px-8 w-full max-w-7xl mx-auto" style={{ paddingTop: 'var(--navbar-height, 80px)' }}>
        {/* Main Heading - New Hero Banner */}
        <motion.h1
          className="text-2xl tablet:text-4xl desktop:text-6xl text-white mb-4 gpu-accelerated"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          style={{
            textShadow: '0 0 20px rgba(132, 204, 22, 0.2)',
            willChange: 'auto'
          }}
        >
          <motion.span
            className="inline-block font-bold"
            whileHover={{
              scale: 1.02,
              textShadow: '0 0 30px rgba(132, 204, 22, 0.4)'
            }}
            transition={{ duration: 0.2 }}
            style={{ willChange: 'auto' }}
          >
            Stop wasting{' '}
            <span className="inline-flex items-center -space-x-2 font-mono">
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={currentTime.getHours()}
                  className="text-white text-2xl tablet:text-4xl desktop:text-6xl uppercase"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  aria-label={`Local hour: ${currentTime.getHours().toString().padStart(2, '0')}`}
                >
                  ti
                </motion.span>
              </AnimatePresence>
              <motion.span
                className="text-lime-400 text-2xl tablet:text-4xl desktop:text-6xl"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                aria-label="Time separator"
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
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  aria-label={`Local minutes: ${minutes}`}
                >
                  me
                </motion.span>
              </AnimatePresence>
              <span className="sr-only">{`Local time ${minutes}:${seconds}`}</span>
            </span>
          </motion.span>
        </motion.h1>

        <motion.h2
          className="text-xl tablet:text-3xl desktop:text-4xl text-white/90 mb-6 gpu-accelerated"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          style={{ willChange: 'auto' }}
        >
          <motion.span
            className="inline-block italic font-thin"
            whileHover={{
              scale: 1.02
            }}
            transition={{ duration: 0.2 }}
            style={{ willChange: 'auto' }}
          >
            Start getting interviews
          </motion.span>
        </motion.h2>

        {/* Subheading - Optimized */}
        <motion.p
          className="text-sm tablet:text-lg desktop:text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          style={{ willChange: 'auto' }}
        >
          Fully automated application tracker with cv, cover letter providing maximum ats compatibility
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
            href="/sign-up?callbackUrl=/dashboard"
            className="group relative inline-block bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black px-5 py-2.5 tablet:px-8 tablet:py-4 desktop:px-10 desktop:py-5 rounded-full font-semibold text-xs tablet:text-sm desktop:text-base shadow-2xl hover:shadow-[rgb(129,255,0)]/50 transition-all overflow-hidden btn-hover"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 15px 30px -5px rgba(132, 204, 22, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
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
              <span>Start Free</span>
              <ArrowRight className="w-4 h-4 tablet:w-5 tablet:h-5" />
            </motion.div>
          </motion.a>

          <motion.a
            href="/resume-enhancer"
            className="group relative border-2 border-lime-400/50 text-lime-400 px-5 py-2.5 tablet:px-8 tablet:py-4 desktop:px-10 desktop:py-5 rounded-full font-semibold text-xs tablet:text-sm desktop:text-base hover:bg-lime-400/10 transition-all backdrop-blur-sm overflow-hidden flex items-center gap-2 tablet:gap-3"
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
            <span>Career Guide</span>
            <ArrowRight className="w-4 h-4 tablet:w-5 tablet:h-5" />
          </motion.a>

        </motion.div>

        {/* Hero Banner Image */}
        <motion.div
          className="relative w-full mx-auto mt-8 tablet:mt-12"
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          style={{ willChange: 'auto' }}
        >
          <div className="relative w-full h-[600px] rounded-2xl overflow-hidden bg-transparent">
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
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
