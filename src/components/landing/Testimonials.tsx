'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimationFrame } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

export interface TestimonialData {
  _id: string;
  username: string;
  avatar?: string;
  designation: string;
  company: string;
  starRating: number;
  message: string;
}

export const DEFAULT_TESTIMONIALS: TestimonialData[] = [
  {
    _id: "1",
    username: "Sunil K.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    designation: "Lead Engineer",
    company: "",
    starRating: 5,
    message: "I expected this to just overwrite my experience with generic buzzwords. It doesn't. It's an efficient tool for breaking writer's block, not a crutch. It *stays out of your way*."
  },
  {
    _id: "2",
    username: "Jessica M.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    designation: "Marketing Coordinator",
    company: "",
    starRating: 5,
    message: "The browser extension is just... CLUTCH. I'm on a job site, I click, and it's saved. I don't have to think. The tracker is the only thing keeping me sane."
  },
  {
    _id: "3",
    username: "Tom P.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    designation: "Operations Manager",
    company: "",
    starRating: 5,
    message: "That gentle nudge that says 'It's been 7 days since you applied' is all I need. It's professional, not obnoxious, and helped me stay on top of follow-ups."
  },
  {
    _id: "4",
    username: "Emily R.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    designation: "Product & Marketing",
    company: "",
    starRating: 5,
    message: "I used to have 10 different 'CV_v2_final' files. The 'Journey' feature is just plain smart. My Marketing and Product journeys each have tailored docs."
  },
  {
    _id: "5",
    username: "David G.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    designation: "Office Administrator",
    company: "",
    starRating: 5,
    message: "My old Word template would just... explode if I added a new line. This is the first time I've used a CV builder that felt safe. It's clean and I can't break it."
  },
  {
    _id: "6",
    username: "Sarah B.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    designation: "Sales Director",
    company: "",
    starRating: 5,
    message: "I sent a support message at 9 PM on a Sunday. A real person emailed back in 20 minutes and *personally* fixed the issue. That's how you earn a customer for life."
  },
  {
    _id: "7",
    username: "Aisha T.",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?w=100&h=100&fit=crop",
    designation: "Recent Graduate",
    company: "",
    starRating: 5,
    message: "The AI suggested ways to frame my university projects using the STAR method. I went from zero callbacks to landing three interviews in two weeks."
  }
];

// Re-usable Small Testimonial Snippet
export const TestimonialSnippet = ({ index }: { index: number }) => {
  const testimonial = DEFAULT_TESTIMONIALS[index % DEFAULT_TESTIMONIALS.length];
  
  return (
    <div className="w-full py-16 relative overflow-hidden flex justify-center bg-transparent">
      {/* Subtle quote icons for context without breaking the flow */}
      <Quote 
        size={120} 
        className="absolute -left-10 top-1/2 -translate-y-1/2 text-white/[0.02] -rotate-12 pointer-events-none" 
      />
      <Quote 
        size={120} 
        className="absolute -right-10 top-1/2 -translate-y-1/2 text-white/[0.02] rotate-12 pointer-events-none transform scale-x-[-1]" 
      />

      <motion.div 
        className="relative z-10 max-w-4xl px-6 flex flex-col tablet:flex-row items-center gap-8 tablet:gap-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
           <div className="flex -space-x-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-[#141810] bg-gray-800 overflow-hidden shadow-xl ring-1 ring-white/10">
                  <img src={`https://i.pravatar.cc/100?u=snippet${index}-${i}`} alt="user" className="w-full h-full object-cover opacity-80" />
                </div>
              ))}
           </div>
           <div className="flex items-center gap-1">
             {[...Array(5)].map((_, i) => (
               <Star key={i} size={10} className="text-[#81ff00] fill-current opacity-80" />
             ))}
           </div>
        </div>

        <div className="flex-1 text-center tablet:text-left relative">
          <p className="text-white/90 text-body tablet:text-h3 italic font-medium leading-relaxed tracking-tight">
            "{testimonial.message}"
          </p>
          <div className="mt-4 flex flex-col tablet:flex-row tablet:items-center gap-1 tablet:gap-3">
            <span className="text-[#81ff00]/90 text-[11px] uppercase tracking-[0.2em] font-black">
              Verified Experience
            </span>
            <span className="hidden tablet:block text-white/10 text-small">|</span>
            <p className="text-white/40 text-[11px] uppercase tracking-widest font-bold">
              {testimonial.username} • {testimonial.designation}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Testimonials = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const isPaused = useRef(false);

  useAnimationFrame((time, delta) => {
    if (scrollContainerRef.current && !isPaused.current) {
      const baseSpeed = 40; // pixels per second
      scrollPositionRef.current += (delta / 1000) * baseSpeed;
      
      const container = scrollContainerRef.current;
      const totalWidth = container.scrollWidth / 2;
      
      if (scrollPositionRef.current >= totalWidth) {
        scrollPositionRef.current = 0;
      }
      container.style.transform = `translateX(-${scrollPositionRef.current}px)`;
    }
  });

  return (
    <section id="testimonials" className="relative pt-32 pb-24 bg-[#141810] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        {/* Section Header */}
        <div className="text-left mb-16">
          {/* Decorative squiggle */}
          <motion.div
            className="mb-6 flex justify-start"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#81ff00]">
              <path
                d="M2 12C6 6 10 18 14 12C18 6 22 18 26 12C30 6 34 18 38 12C42 6 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
          <h2 className="!text-[2rem] tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-white mb-4 tracking-tighter !leading-[1.05] text-left">
            <span className="text-lime-400">15,000+</span> professionals celebrating new jobs
          </h2>
          <p className="text-white/60 text-small tablet:text-body max-w-2xl text-left">
            Join thousands of successful job seekers who have landed their dream positions using CVCircle.
          </p>
        </div>

        {/* Single Row Continuous Carousel */}
        <div 
          className="relative -mx-4 tablet:-mx-6 desktop:-mx-8 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
          }}
        >
          <div
            ref={scrollContainerRef}
            className="flex items-stretch space-x-6 whitespace-nowrap py-4"
            onMouseEnter={() => isPaused.current = true}
            onMouseLeave={() => isPaused.current = false}
          >
            {[...DEFAULT_TESTIMONIALS, ...DEFAULT_TESTIMONIALS].map((testimonial, idx) => (
              <div
                key={`${testimonial._id}-${idx}`}
                className="inline-block w-[350px] tablet:w-[400px] desktop:w-[450px] min-h-[320px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 whitespace-normal flex-shrink-0 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(testimonial.starRating)].map((_, i) => (
                      <Star key={i} size={16} className="text-[#81ff00] fill-current" />
                    ))}
                  </div>
                  <p className="text-white/90 text-body tablet:text-h3 leading-relaxed mb-8 italic font-medium">
                    "{testimonial.message}"
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shadow-lg">
                    <img 
                      src={testimonial.avatar || `https://i.pravatar.cc/100?u=${testimonial._id}`} 
                      alt={testimonial.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-white font-bold text-small tracking-tight">{testimonial.username}</div>
                    <div className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-black">{testimonial.designation}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
