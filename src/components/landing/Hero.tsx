'use client';

import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const JOB_SITES = [
  { name: 'LinkedIn', domain: 'linkedin.com' },
  { name: 'Indeed', domain: 'indeed.com' },
  { name: 'Glassdoor', domain: 'glassdoor.com' },
  { name: 'ZipRecruiter', domain: 'ziprecruiter.com' },
  { name: 'Monster', domain: 'monster.com' },
  { name: 'Wellfound', domain: 'wellfound.com' },
  { name: 'RemoteOK', domain: 'remoteok.com' },
  { name: 'We Work Remotely', domain: 'weworkremotely.com' },
  { name: 'Dice', domain: 'dice.com' },
  { name: 'Stack Overflow', domain: 'stackoverflow.com' },
  { name: 'FlexJobs', domain: 'flexjobs.com' },
  { name: 'CareerBuilder', domain: 'careerbuilder.com' },
  { name: 'SimplyHired', domain: 'simplyhired.com' },
  { name: 'Upwork', domain: 'upwork.com' },
  { name: 'Freelancer', domain: 'freelancer.com' }
];

const Hero = () => {
  const router = useRouter();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  return (
    <section
      id="hero"
      className="relative h-screen min-h-[800px] desktop:min-h-[900px] w-full overflow-hidden flex flex-col items-center bg-[#141810]"
    >
      {/* Background Glow Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-purple-600/20 via-pink-500/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 -right-40 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 flex flex-col items-center h-full">
        
        {/* Top: Celebrating Line */}
        <div className="pt-32 tablet:pt-28 desktop:pt-32 w-full flex flex-col items-center">
          <motion.div 
            className="mb-6 desktop:mb-8 flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#141810] bg-gray-800 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=user${i}`} alt="user" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 leading-none">
              <div className="flex items-center gap-0.5 mr-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3 h-3 fill-[#81ff00] text-[#81ff00]" />
                ))}
              </div>
              <p className="text-xs tablet:text-sm font-semibold text-white/90">
                <span className="text-[#81ff00]">15,000+</span> professionals celebrating new jobs
              </p>
            </div>
          </motion.div>

          {/* Headline & CTAs */}
          <motion.h1
            className="text-2xl tablet:text-4xl desktop:text-6xl font-bold text-white mb-12 tracking-tight leading-[1.3] max-w-7xl mx-auto text-center px-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="relative inline-block">
              <span className="relative z-10 block py-4 px-8 whitespace-nowrap">
                Get Job ready with one platform,<br />
                Unlimited Resume, Cover Letters for free
              </span>
              
              {/* Realistic Single Brush Shape */}
              <svg 
                className="absolute inset-0 w-full h-full z-0 pointer-events-none" 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="highlighter-brush">
                    <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="4" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
                  </filter>
                </defs>
                <path 
                  d="M2,12 C20,10 40,15 60,12 C80,10 98,14 98,12 L97,88 C80,85 60,90 40,88 C20,85 3,89 2,88 Z" 
                  fill="#81ff00" 
                  fillOpacity="0.55"
                  filter="url(#highlighter-brush)"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            className="text-base tablet:text-lg desktop:text-xl text-gray-400 mb-8 tablet:mb-10 max-w-3xl mx-auto leading-relaxed text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <span className="text-white font-semibold">Stop wasting time. Use the ultimate AI job search copilot for automated CV tailoring, instant cover letter generation, and smart application tracking.</span>
          </motion.p>

          <motion.div
            className="flex flex-col tablet:flex-row items-center justify-center gap-4 w-full tablet:w-auto mb-12 desktop:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <button
              onClick={() => router.push('/welcome')}
              className="group w-full tablet:w-auto inline-flex items-center justify-center gap-3 bg-[#81ff00] hover:bg-[#6dd600] text-black px-6 py-3 tablet:px-8 tablet:py-3.5 rounded-full font-bold text-xs tablet:text-sm shadow-[0_0_20px_rgba(129,255,0,0.3)] transition-all hover:scale-105 uppercase tracking-wide"
            >
              START FREE
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={() => window.open('https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=item-share-cb', '_blank')}
              className="w-full tablet:w-auto inline-flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 tablet:px-8 tablet:py-3.5 rounded-full font-bold text-xs tablet:text-sm backdrop-blur-md border border-white/10 transition-all hover:scale-105 uppercase tracking-wide"
            >
              Download Extension
            </button>
          </motion.div>
        </div>

        {/* Bottom: Image/Video Container */}
        <motion.div
          className="relative w-full max-w-6xl flex-1 flex flex-col items-center justify-center mx-auto"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          <div className="relative w-full aspect-video group rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-lime-500/20 rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            
            {/* Placeholder Image */}
            <Image
              src="/images/herobanner.webp"
              alt="CVCircle Dashboard"
              fill
              className={`object-cover transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
              priority
              quality={100}
            />

            {/* YouTube Embed */}
            <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 pointer-events-none overflow-hidden ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <iframe
                src="https://www.youtube-nocookie.com/embed/U1ElC0WlJWQ?autoplay=1&mute=1&loop=1&playlist=U1ElC0WlJWQ&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=https://cvcircle.io&playsinline=1"
                title="CVCircle Demo"
                className="absolute top-0 left-0 w-full h-full border-0 pointer-events-none"
                allow="autoplay; encrypted-media"
                onLoad={() => setIsVideoLoaded(true)}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ticker - Stays absolute bottom overlay */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-30 overflow-hidden w-full pb-4 pt-8 backdrop-blur-sm border-t border-white/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to top, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to top, black 60%, transparent 100%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))'
        }}
      >
        <p className="text-[10px] tablet:text-xs font-bold text-white/50 uppercase tracking-[0.3em] mb-4 text-center">Works seamlessly on your favorite platforms</p>
        <div className="flex items-center space-x-16 whitespace-nowrap animate-scroll">
          {[...JOB_SITES, ...JOB_SITES].map((site, index) => (
            <div
              key={`${site.name}-${index}`}
              className="flex items-center space-x-4 text-white/70 hover:text-white transition-all duration-300 opacity-90 hover:opacity-100 group"
            >
              <div className="w-8 h-8 flex-shrink-0 bg-white rounded-full flex items-center justify-center p-1.5 shadow-xl group-hover:scale-110 transition-transform">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=64`}
                  alt={site.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs tablet:text-sm font-bold tracking-widest">{site.name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
