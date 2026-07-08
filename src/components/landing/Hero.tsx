'use client';

import React, { useEffect, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, X, Volume2, VolumeX } from 'lucide-react';
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
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPopupMuted, setIsPopupMuted] = useState(false);

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
              <p className="text-small tablet:text-small font-semibold text-white/90">
                <span className="text-[#81ff00]">15,000+</span> professionals celebrating new jobs
              </p>
            </div>
          </motion.div>

          {/* Headline & CTAs */}
          <motion.h1
            className="!text-[1.8rem] sm:!text-[2.2rem] tablet:!text-[2.8rem] desktop:!text-[3.2rem] font-extrabold text-white mb-10 tracking-tighter leading-[1.1] sm:leading-none w-full text-center px-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="relative inline-block w-full sm:w-auto">
              <span className="relative z-10 block py-3 px-4 sm:px-8 whitespace-normal sm:whitespace-nowrap">
                All Job tools in one Platform,<br className="hidden sm:block" />
                Start Creating CV now
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
            className="text-body tablet:text-h3 desktop:text-h3 text-gray-400 mb-8 tablet:mb-10 max-w-3xl mx-auto leading-relaxed text-center"
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
              className="group w-full tablet:w-auto inline-flex items-center justify-center gap-3 bg-[#81ff00] hover:bg-[#6dd600] text-black px-6 py-3 tablet:px-8 tablet:py-3.5 rounded-full font-bold text-small tablet:text-small shadow-[0_0_20px_rgba(129,255,0,0.3)] transition-all hover:scale-105 uppercase tracking-wide"
            >
              START FREE
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={() => window.open('https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=item-share-cb', '_blank')}
              className="w-full tablet:w-auto inline-flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 tablet:px-8 tablet:py-3.5 rounded-full font-bold text-small tablet:text-small backdrop-blur-md border border-white/10 transition-all hover:scale-105 uppercase tracking-wide"
            >
              Download Extension
            </button>
          </motion.div>
        </div>

        {/* Bottom: Image/Video Container */}
        <div className="relative w-full flex justify-center mb-8">
          <motion.div
            className="relative w-[140%] sm:w-full max-w-6xl flex flex-col items-center justify-center cursor-pointer overflow-visible shrink-0"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            onClick={() => setIsPopupOpen(true)}
          >
            <div className="relative w-full aspect-video group rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-lime-500/20 rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              
              {/* Expand Button Overlay */}
              <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 bg-black/60 text-[#81ff00] rounded-full flex items-center justify-center border border-[#81ff00]/30 shadow-[0_0_20px_rgba(129,255,0,0.3)] transform scale-90 group-hover:scale-100 transition-transform duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m12-5V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m12 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </div>
              </div>

              {/* Placeholder Image */}
              <Image
                src="/images/herobanner.webp"
                alt="CVCircle Dashboard"
                fill
                sizes="100vw"
                className="object-cover transition-opacity duration-1000"
                priority
                quality={100}
              />

              {/* YouTube Embed */}
              <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 pointer-events-none overflow-hidden ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <iframe
                  src="https://www.youtube-nocookie.com/embed/U1ElC0WlJWQ?autoplay=1&mute=1&loop=1&playlist=U1ElC0WlJWQ&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=https://cvcircle.io&playsinline=1"
                  title="CVCircle Demo"
                  className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                  allow="autoplay; encrypted-media"
                  onLoad={() => setIsVideoLoaded(true)}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox / Video Popup overlay with Mute/Unmute */}
      <AnimatePresence>
        {isPopupOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPopupOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close and Sound Controls bar */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button
                  onClick={() => setIsPopupMuted(!isPopupMuted)}
                  className="p-3 rounded-full bg-black/60 text-white border border-white/10 hover:bg-lime-400 hover:text-black transition-colors"
                  title={isPopupMuted ? "Unmute" : "Mute"}
                >
                  {isPopupMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsPopupOpen(false)}
                  className="p-3 rounded-full bg-black/60 text-white border border-white/10 hover:bg-lime-400 hover:text-black transition-colors"
                  title="Close Video"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* YouTube embed inside popup */}
              <iframe
                src={`https://www.youtube-nocookie.com/embed/U1ElC0WlJWQ?autoplay=1&mute=${isPopupMuted ? '1' : '0'}&controls=1&showinfo=0&rel=0&modestbranding=1&enablejsapi=1`}
                title="CVCircle Demo Popup"
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        <p className="text-[10px] tablet:text-small font-bold text-white/50 uppercase tracking-[0.3em] mb-4 text-center">Works seamlessly on your favorite platforms</p>
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
              <span className="text-small tablet:text-small font-bold tracking-widest">{site.name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
