'use client';

import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const Hero = () => {
  const router = useRouter();

  return (
    <section
      id="hero"
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center pt-24 pb-20"
    >
      {/* Background Glow Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Top center glow - purple/magenta */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-purple-600/20 via-pink-500/10 to-transparent rounded-full blur-[120px]" />
        {/* Left subtle glow */}
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />
        {/* Right subtle glow */}
        <div className="absolute top-1/4 -right-40 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 flex flex-col items-center text-center mt-20 tablet:mt-24 desktop:mt-32">

        {/* Main Headline */}
        <motion.h1
          className="text-3xl tablet:text-5xl desktop:text-6xl font-bold text-white mb-2 tracking-tight leading-tight text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="relative inline-block">
            {/* Marker background effect */}
            <span className="absolute inset-0 bg-[#81ff00] opacity-40 blur-sm -skew-y-1 transform scale-105 rounded-sm"></span>
            <span className="absolute inset-0 bg-[#81ff00] opacity-60 -z-10 transform -skew-y-1 rounded-sm"></span>
            <span className="relative text-black px-3 py-1 font-extrabold">Stop wasting time</span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-3xl tablet:text-5xl desktop:text-6xl text-white mb-6 font-bold tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          Start getting interviews.
        </motion.p>

        {/* Description */}
        <motion.p
          className="text-sm tablet:text-base desktop:text-lg text-gray-400 mb-6 max-w-xl mx-auto leading-relaxed text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          Job tracker with automated CV and cover letter generation.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <button
            onClick={() => router.push('/welcome')}
            className="inline-flex items-center gap-3 bg-[#81ff00] hover:bg-[#6dd600] text-black px-8 py-4 tablet:px-10 tablet:py-5 rounded-full font-bold text-sm tablet:text-base shadow-lg transition-all hover:scale-105 uppercase tracking-wide"
          >
            START FREE
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* App Preview Image - Simplified Container */}
        <motion.div
          className="relative w-full max-w-7xl mt-12 tablet:mt-16 flex justify-center items-center"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          {/* Main image - Direct rendering without complex wrappers */}
          <div className="relative w-full h-auto">
            <Image
              src="/images/herobanner.png"
              alt="CVCircle Dashboard"
              width={1920}
              height={1080}
              className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl"
              priority
              quality={100}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
