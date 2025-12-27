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
    // Layer 1: Main Section
    <section id="hero" className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-black">

      {/* Background Effects (Layer 1 Content) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/10 to-blue-400/10 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Layer 2: Banner Container */}
      <motion.div
        className="absolute inset-8 tablet:inset-16 desktop:inset-24 rounded-[3rem] overflow-hidden z-10 border border-white/10 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Banner Image */}
        <div className="relative w-full h-full">
          <Image
            src="/images/herobanner.png"
            alt="CV Circle Dashboard"
            fill
            className="object-cover object-top"
            priority
            quality={90}
            sizes="100vw"
          />
        </div>
      </motion.div>

      {/* Layer 3: Hero Text Container */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 flex flex-col justify-center items-center text-center">

        {/* Main Heading */}
        <motion.h1
          className="text-2xl tablet:text-4xl desktop:text-6xl text-white mb-6 gpu-accelerated font-bold tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          style={{
            textShadow: '0 0 30px rgba(0,0,0,0.5)',
          }}
        >
          <motion.span
            className="inline-block"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            Stop wasting{' '}
            <span className="inline-flex items-center -space-x-1 tablet:-space-x-2 font-mono align-bottom">
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={currentTime.getHours()}
                  className="text-white text-2xl tablet:text-4xl desktop:text-6xl uppercase"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                >
                  ti
                </motion.span>
              </AnimatePresence>
              <motion.span
                className="text-lime-400 text-2xl tablet:text-4xl desktop:text-6xl mx-0.5"
                animate={{ opacity: [1, 0.2, 1] }}
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
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  me
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.span>
        </motion.h1>

        <motion.h2
          className="text-xl tablet:text-3xl desktop:text-4xl text-white/90 mb-8 gpu-accelerated drop-shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
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
      </div>
    </section>
  );
};

export default Hero;
