'use client';

import React, { useEffect, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, X, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { heroTopPaddingClass } from '@/components/landing/announcementBannerConfig';

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

const Hero = ({ withBanner = false }: { withBanner?: boolean }) => {
  const router = useRouter();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPopupMuted, setIsPopupMuted] = useState(false);

  return (
    <section
      id="hero"
      className="relative h-screen min-h-[800px] desktop:min-h-[900px] w-full overflow-hidden flex flex-col items-center bg-[#0a0a0c]"
    >
      {/* Background Ambient Glows */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 20% 15%, rgba(1, 63, 46, 0.25) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 80% 50%, rgba(20, 184, 166, 0.08) 0%, transparent 65%),
            radial-gradient(ellipse 70% 50% at 50% 85%, rgba(1, 63, 46, 0.2) 0%, transparent 65%),
            linear-gradient(180deg, #0e1013 0%, #0a0a0c 50%, #060708 100%)
          `
        }}
      />

      {/* Content Wrapper */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 flex flex-col items-center h-full">
        
        {/* Top: Celebrating Line */}
        <div className={`${heroTopPaddingClass(withBanner)} w-full flex flex-col items-center transition-[padding] duration-300`}>
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
                <span className="text-[#36D39B]">15,000+</span> professionals celebrating new jobs
              </p>
            </div>
          </motion.div>

          {/* Headline & CTAs */}
          <motion.p
            className="mb-4 text-xs tablet:text-sm font-semibold uppercase tracking-[0.25em] text-[#36D39B] text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            AI-powered career tools
          </motion.p>

          <motion.h1
            className="tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-[#F5F7F7] mb-8 sm:mb-10 tracking-tighter leading-[1.1] sm:leading-[1.1] text-4xl! tracking-normal! w-full text-center px-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Build a Better Resume <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">
              With AI
            </span>
          </motion.h1>

          <motion.p
            className="text-body tablet:text-h3 desktop:text-h3 text-gray-400 mb-8 tablet:mb-10 max-w-3xl mx-auto leading-relaxed text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <span className="text-white font-semibold">Create an ATS-friendly resume, tailor it to every job, and apply with confidence using AI-powered resume tools.</span>
          </motion.p>

          <motion.div
            className="flex flex-col tablet:flex-row items-center justify-center gap-4 w-full tablet:w-auto mb-12 desktop:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <button
              onClick={() => router.push('/welcome')}
              className="group w-full tablet:w-auto inline-flex items-center justify-center gap-3 bg-[#013f2e] hover:bg-[#025c43] text-white px-6 py-3 tablet:px-8 tablet:py-3.5 rounded-full font-bold text-small tablet:text-small shadow-lg transition-colors duration-200 hover:scale-105 uppercase tracking-wide"
            >
              Build My Resume
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={() => router.push('/explore')}
              className="w-full tablet:w-auto inline-flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 tablet:px-8 tablet:py-3.5 rounded-full font-bold text-small tablet:text-small backdrop-blur-md border border-white/10 transition-all hover:scale-105 uppercase tracking-wide cursor-pointer"
            >
              Explore Templates
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
                alt="AIResume - Resume Builder Dashboard"
                fill
                className="object-cover transition-opacity duration-1000"
                priority
                quality={100}
              />

              {/* YouTube Embed */}
              <div className={`absolute inset-0 w-full h-full transition-opacity duration-1000 pointer-events-none overflow-hidden ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <iframe
                  src="https://www.youtube-nocookie.com/embed/U1ElC0WlJWQ?autoplay=1&mute=1&loop=1&playlist=U1ElC0WlJWQ&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=https://buildairesume.com&playsinline=1"
                  title="AIResume Demo"
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
                title="AIResume Demo Popup"
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
