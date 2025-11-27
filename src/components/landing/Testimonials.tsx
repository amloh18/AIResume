'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimationFrame } from 'framer-motion';
import { Quote, Star, TrendingUp, Users, Award } from 'lucide-react';

interface TestimonialData {
  _id: string;
  username: string;
  avatar?: string;
  designation: string;
  company: string;
  starRating: number;
  message: string;
}

interface MetricsData {
  activeUsers: string;
  successRate: string;
  jobsLanded: string;
}

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [metrics, setMetrics] = useState<MetricsData>({
    activeUsers: "50K+",
    successRate: "95%",
    jobsLanded: "10K+"
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const animationSpeedRef = useRef(0.5); // Base speed (lower = faster)

  const isPaused = useRef(false);

  // Default testimonials as fallback
  const defaultTestimonials = [
    {
      _id: "1",
      username: "Sunil K.",
      designation: "Lead Engineer",
      company: "",
      starRating: 5,
      message: "I hate AI features. They're gimmicks. I expected this one to just overwrite my experience with generic, 'synergized' buzzwords. It doesn't. I was surprised that I could use it to generate a few ideas for a bullet point, and then edit it down to sound like me. It's an efficient tool for breaking writer's block, not a crutch. It *stays out of your way*. I respect that."
    },
    {
      _id: "2",
      username: "Jessica M.",
      designation: "Marketing Coordinator",
      company: "",
      starRating: 5,
      message: "I was a complete hot mess. My job search was like 50 different tabs, a Notes app file, and a spreadsheet I'd *sometimes* update. The browser extension is just... CLUTCH. I'm on a job site, I click, and it's saved. I don't have to think. The tracker is the only thing keeping me sane. *LITERALLY*."
    },
    {
      _id: "3",
      username: "Tom P.",
      designation: "Operations Manager",
      company: "",
      starRating: 5,
      message: "I'm pretty organized, but even I lose track of which application went where. The email reminders are a simple, but very effective, feature. That gentle nudge that says 'It's been 7 days since you applied to X' is all I need. It's professional, it's not obnoxious, and it's honestly helped me stay on top of my follow-ups."
    },
    {
      _id: "4",
      username: "Emily R.",
      designation: "Product & Marketing",
      company: "",
      starRating: 5,
      message: "I'm trying to pivot from marketing into product management, so my 'one-size-fits-all' CV was getting me nowhere. I used to have 10 different 'CV_v2_final_FINAL.doc' files. The 'Journey' feature is just plain smart. I have my 'Marketing' journey and my 'Product' journey, each with its own tailored CV and cover letter. It's *so well-thought-out*."
    },
    {
      _id: "5",
      username: "David G.",
      designation: "Office Administrator",
      company: "",
      starRating: 5,
      message: "I'm just going to be honest, I'm not good with computers. The idea of formatting a resume gives me actual anxiety. My old Word template would just... explode if I tried to add a new line. This is the first time I've ever used a CV builder that felt safe. It's clean, it's simple, and I can't 'break' it. It's a huge relief."
    },
    {
      _id: "6",
      username: "Sarah B.",
      designation: "Sales Director",
      company: "",
      starRating: 5,
      message: "I had a critical formatting bug right before a major application deadline. I was panicking. I sent a support message at 9 PM on a Sunday, expecting a bot. A real person emailed me back in 20 minutes, had me try one thing, and when that didn't work, they *personally* fixed the issue on my account. I was stunned. That's how you earn a customer for life."
    }
  ];

  const stats = [
    { number: metrics.activeUsers, label: "Active Users", icon: Users },
    { number: metrics.successRate, label: "Success Rate", icon: TrendingUp },
    { number: metrics.jobsLanded, label: "Jobs Landed", icon: Award }
  ];

  useEffect(() => {
    // Set default testimonials immediately
    setTestimonials(defaultTestimonials);

    // Try to fetch from API, but don't block rendering
    fetchTestimonials().catch(console.error);
    fetchMetrics().catch(console.error);

  }, []);

  // Calculate dynamic speed based on card position relative to center
  const calculateSpeed = useCallback(() => {
    if (typeof window === 'undefined' || !scrollContainerRef.current) return 0.5;

    const container = scrollContainerRef.current;
    const containerParent = container.parentElement;
    if (!containerParent) return 0.5;

    // Use the viewport center or the visible container center
    const containerRect = containerParent.getBoundingClientRect();
    // Center of the visible viewport area (accounting for the mask)
    const containerCenter = window.innerWidth / 2;

    const cards = container.querySelectorAll('[data-testimonial-card]');
    if (cards.length === 0) return 0.5;

    let minDistance = Infinity;

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
      }
    });

    // Calculate speed: faster when far from center, slower when centered
    // Normalize distance (0 = centered, 1 = at edge)
    const maxDistance = containerRect.width / 2;
    const normalizedDistance = Math.min(minDistance / maxDistance, 1);

    // Speed multiplier: 3.0 (fast, far from center) to 0.3 (slow, centered)
    // Use easing function for smooth transitions (ease-out cubic)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedDistance = easeOutCubic(normalizedDistance);
    const speedMultiplier = 0.3 + (2.7 * easedDistance);

    return speedMultiplier;
  }, []);

  // Update animation speed based on card positions using requestAnimationFrame
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    let rafId: number;
    let lastUpdate = 0;
    const updateInterval = 100; // Update speed every 100ms for performance

    const updateSpeed = (timestamp: number) => {
      if (timestamp - lastUpdate >= updateInterval) {
        animationSpeedRef.current = calculateSpeed();
        lastUpdate = timestamp;
      }
      rafId = requestAnimationFrame(updateSpeed);
    };

    rafId = requestAnimationFrame(updateSpeed);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [testimonials, calculateSpeed]);

  // Animation frame for smooth scrolling
  useAnimationFrame((time, delta) => {
    if (!scrollContainerRef.current || isPaused.current) return;

    const speedMultiplier = animationSpeedRef.current;
    // Base speed: 30 pixels per second, adjusted by multiplier
    // Lower multiplier = slower scroll (when centered)
    // Higher multiplier = faster scroll (when not centered)
    const baseSpeed = 30; // pixels per second
    const increment = (delta / 1000) * (baseSpeed * speedMultiplier);

    scrollPositionRef.current += increment;

    const container = scrollContainerRef.current;
    const totalWidth = container.scrollWidth / 2; // Since we duplicate the content

    // Reset position when we've scrolled through one complete set
    if (scrollPositionRef.current >= totalWidth) {
      scrollPositionRef.current = 0;
    }

    container.style.transform = `translateX(-${scrollPositionRef.current}px)`;
  });

  const fetchTestimonials = async () => {
    try {
      const response = await fetch('/api/testimonials');
      if (response.ok) {
        const data = await response.json();
        setTestimonials(data.testimonials || defaultTestimonials);
      } else {
        setTestimonials(defaultTestimonials);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      setTestimonials(defaultTestimonials);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.02
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.98
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    }
  };

  // Helper function to render message with accent-colored highlighted text
  const renderMessageWithAccents = (message: string) => {
    const parts = message.split(/(\*[^*]+\*)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('*') && part.endsWith('*')) {
            // Remove asterisks and apply accent color
            const text = part.slice(1, -1);
            return (
              <span key={index} className="text-lime-400 font-medium">
                {text}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <section id="testimonials" className="relative pt-32 pb-20 flex items-center bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0">
        {/* Grid Lines */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(132, 204, 22, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(132, 204, 22, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Grid Dots */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(132, 204, 22, 0.4) 2px, transparent 2px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: '25px 25px'
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-black/80"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/5 to-blue-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-2 tablet:px-6 desktop:px-8 w-full h-full flex flex-col justify-center">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl tablet:text-3xl desktop:text-4xl font-bold text-white mb-6 text-center">
            The new way to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              build Tailored CV
            </span>
          </h2>
          <p className="text-xs tablet:text-sm desktop:text-base text-white/70 max-w-3xl mx-auto leading-relaxed">
            Join thousands of successful job seekers who have landed their dream positions using <span className="text-lime-400">CV</span><span className="text-white/70">Circle</span>.
          </p>
        </motion.div>

        {/* Enhanced Testimonials Carousel - Continuous Scroll */}
        <motion.div
          className="relative mb-20 -mx-2 tablet:-mx-6 desktop:-mx-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
          }}
        >
          {/* Carousel Container */}
          <div className="relative overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="flex items-stretch space-x-4 tablet:space-x-6 desktop:space-x-8 whitespace-nowrap"
              style={{ willChange: 'transform' }}
              onMouseEnter={() => { isPaused.current = true; }}
              onMouseLeave={() => { isPaused.current = false; }}
            >
              {/* First set of testimonials */}
              {(testimonials.length > 0 ? testimonials : defaultTestimonials).map((testimonial, index) => (
                <motion.div
                  key={testimonial._id}
                  data-testimonial-card
                  className="group relative flex-shrink-0 w-[280px] tablet:w-[320px] desktop:w-[360px]"
                  variants={cardVariants}
                >
                  <motion.div
                    className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-5 tablet:p-6 h-[450px] card-hover w-full max-w-full box-border flex flex-col overflow-hidden"
                    style={{ willChange: 'transform', minWidth: 0 }}
                    whileHover={{
                      scale: 1.02,
                      y: -5,
                      boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Glow Effect */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl bg-gradient-to-br from-lime-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ filter: 'blur(20px)' }}
                    />

                    {/* Quote Icon */}
                    <motion.div
                      className="text-xl tablet:text-2xl desktop:text-3xl text-lime-400 mb-3 tablet:mb-4"
                      whileHover={{
                        scale: 1.2,
                        rotateY: 15,
                        textShadow: "0 0 30px rgba(132, 204, 22, 0.5)"
                      }}
                      style={{
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                      }}
                    >
                      <Quote />
                    </motion.div>

                    {/* Quote Text */}
                    <p className="text-white/80 text-xs tablet:text-xs desktop:text-sm leading-relaxed mb-4 tablet:mb-6 relative z-10 flex-grow whitespace-normal break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', minWidth: 0 }}>
                      {renderMessageWithAccents(testimonial.message)}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3 tablet:mb-4 relative z-10">
                      {[...Array(testimonial.starRating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          whileHover={{ scale: 1.2 }}
                        >
                          <Star size={14} className="text-yellow-400 fill-current tablet:w-4 tablet:h-4" />
                        </motion.div>
                      ))}
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center gap-2 tablet:gap-3 relative z-10 mt-auto">
                      <div className="w-9 h-9 tablet:w-10 tablet:h-10 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-black font-bold text-xs tablet:text-sm">
                          {testimonial.username.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-semibold text-xs tablet:text-xs truncate">
                          {testimonial.username}
                        </div>
                        <div className="text-white/60 text-xs truncate">
                          {testimonial.designation}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}

              {/* Duplicate set for seamless loop */}
              {(testimonials.length > 0 ? testimonials : defaultTestimonials).map((testimonial, index) => (
                <motion.div
                  key={`${testimonial._id}-duplicate`}
                  data-testimonial-card
                  className="group relative flex-shrink-0 w-[280px] tablet:w-[320px] desktop:w-[360px]"
                  variants={cardVariants}
                >
                  <motion.div
                    className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-5 tablet:p-6 h-[450px] card-hover w-full max-w-full box-border flex flex-col overflow-hidden"
                    style={{ willChange: 'transform', minWidth: 0 }}
                    whileHover={{
                      scale: 1.02,
                      y: -5,
                      boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Glow Effect */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl bg-gradient-to-br from-lime-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ filter: 'blur(20px)' }}
                    />

                    {/* Quote Icon */}
                    <motion.div
                      className="text-xl tablet:text-2xl desktop:text-3xl text-lime-400 mb-3 tablet:mb-4"
                      whileHover={{
                        scale: 1.2,
                        rotateY: 15,
                        textShadow: "0 0 30px rgba(132, 204, 22, 0.5)"
                      }}
                      style={{
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                      }}
                    >
                      <Quote />
                    </motion.div>

                    {/* Quote Text */}
                    <p className="text-white/80 text-xs tablet:text-xs desktop:text-sm leading-relaxed mb-4 tablet:mb-6 relative z-10 flex-grow whitespace-normal break-words" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', minWidth: 0 }}>
                      {renderMessageWithAccents(testimonial.message)}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3 tablet:mb-4 relative z-10">
                      {[...Array(testimonial.starRating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          whileHover={{ scale: 1.2 }}
                        >
                          <Star size={14} className="text-yellow-400 fill-current tablet:w-4 tablet:h-4" />
                        </motion.div>
                      ))}
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center gap-2 tablet:gap-3 relative z-10 mt-auto">
                      <div className="w-9 h-9 tablet:w-10 tablet:h-10 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-black font-bold text-xs tablet:text-sm">
                          {testimonial.username.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-semibold text-xs tablet:text-xs truncate">
                          {testimonial.username}
                        </div>
                        <div className="text-white/60 text-xs truncate">
                          {testimonial.designation}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default Testimonials;
