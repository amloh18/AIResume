'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  thumbnail: string;
  preview: string;
}

/**
 * Helper function to get S3 fallback URL for template images
 */
const getTemplateImageS3Url = (filename: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL;
  if (s3BaseUrl) {
    return `${s3BaseUrl}/${encodeURIComponent(filename)}`;
  }
  return null;
};

/**
 * Helper function to get template image URL
 */
const getTemplateImageUrl = (filename: string): string => {
  return `/templates/${encodeURIComponent(filename)}`;
};

const templates: Template[] = [
  {
    id: 'designer-modern',
    name: 'Designer Modern',
    thumbnail: getTemplateImageUrl('Designer Modern.png'),
    preview: getTemplateImageUrl('Designer Modern.png')
  },
  {
    id: 'executive-professional',
    name: 'Executive Professional',
    thumbnail: getTemplateImageUrl('Executive Professional.png'),
    preview: getTemplateImageUrl('Executive Professional.png')
  },
  {
    id: 'minimal-professional',
    name: 'Minimal Professional',
    thumbnail: getTemplateImageUrl('Minimal Professional.png'),
    preview: getTemplateImageUrl('Minimal Professional.png')
  },
  {
    id: 'executive-minimal',
    name: 'Executive Minimal',
    thumbnail: getTemplateImageUrl('Executive minimal.png'),
    preview: getTemplateImageUrl('Executive minimal.png')
  },
  {
    id: 'data-driven-pro',
    name: 'Data Driven Pro',
    thumbnail: getTemplateImageUrl('Data Driven Pro.png'),
    preview: getTemplateImageUrl('Data Driven Pro.png')
  },
  {
    id: 'elegant-timeline',
    name: 'Elegant Timeline',
    thumbnail: getTemplateImageUrl('Elegant Timeline.png'),
    preview: getTemplateImageUrl('Elegant Timeline.png')
  },
  {
    id: 'executive-standard',
    name: 'Executive Standard',
    thumbnail: getTemplateImageUrl('Executive Standard.png'),
    preview: getTemplateImageUrl('Executive Standard.png')
  },
  {
    id: 'header-professional',
    name: 'Header Professional',
    thumbnail: getTemplateImageUrl('Header Professional.png'),
    preview: getTemplateImageUrl('Header Professional.png')
  },
  {
    id: 'one-pager-professional',
    name: 'One Pager Professional',
    thumbnail: getTemplateImageUrl('One pager Professional.jpg'),
    preview: getTemplateImageUrl('One pager Professional.jpg')
  },
  {
    id: 'professional-minimal',
    name: 'Professional Minimal',
    thumbnail: getTemplateImageUrl('Professinal Minimal.png'),
    preview: getTemplateImageUrl('Professinal Minimal.png')
  },
  {
    id: 'tech-pro-blue',
    name: 'Tech Pro Blue',
    thumbnail: getTemplateImageUrl('Tech Pro Blue.png'),
    preview: getTemplateImageUrl('Tech Pro Blue.png')
  },
  {
    id: 'classic-minimal',
    name: 'Classic Minimal',
    thumbnail: getTemplateImageUrl('Minimal Professional.png'),
    preview: getTemplateImageUrl('Minimal Professional.png')
  }
];

const PremiumTemplates = () => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCtaClick = () => {
    router.push('/sign-up');
  };

  // Track scroll position to determine when section should be sticky
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      
      // Section enters viewport (top reaches 0) - become sticky
      // Stay sticky while section is in viewport
      // Become unsticky when section scrolls completely past (top < 0 and bottom < 0)
      const isSectionInView = rect.top <= 0 && rect.bottom > 0;
      
      // If section has scrolled completely past, make it unsticky
      if (rect.bottom <= 0) {
        setIsSticky(false);
      } else if (isSectionInView) {
        // Section is in viewport - make it sticky
        setIsSticky(true);
      } else if (rect.top > 0) {
        // Section hasn't reached top yet - not sticky
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle vertical scroll to advance templates
  useEffect(() => {
    const mainContainer = containerRef.current;
    if (!mainContainer) return;

    let scrollAccumulator = 0;
    const scrollThreshold = 50; // Pixels to accumulate before changing template
    let isChanging = false;

    const handleWheel = (e: WheelEvent) => {
      if (!isSticky) return; // Only intercept when sticky
      
      const containerRect = mainContainer.getBoundingClientRect();
      const isInside = 
        e.clientX >= containerRect.left &&
        e.clientX <= containerRect.right &&
        e.clientY >= containerRect.top &&
        e.clientY <= containerRect.bottom;

      if (isInside) {
        // Check boundaries
        const isAtStart = currentIndex === 0;
        const isAtEnd = currentIndex === templates.length - 1;
        
        // Accumulate scroll
        scrollAccumulator += e.deltaY;
        
        // Check if we should change template
        if (Math.abs(scrollAccumulator) >= scrollThreshold && !isChanging) {
          isChanging = true;
          
          if (scrollAccumulator > 0 && !isAtEnd) {
            // Scrolling down - next template
            e.preventDefault();
            e.stopPropagation();
            setCurrentIndex(prev => Math.min(prev + 1, templates.length - 1));
            scrollAccumulator = 0;
          } else if (scrollAccumulator < 0 && !isAtStart) {
            // Scrolling up - previous template
            e.preventDefault();
            e.stopPropagation();
            setCurrentIndex(prev => Math.max(prev - 1, 0));
            scrollAccumulator = 0;
          } else if (scrollAccumulator > 0 && isAtEnd) {
            // At last template and scrolling down - allow page scroll to continue
            // Don't prevent default - let page scroll naturally
            scrollAccumulator = 0;
            isChanging = false;
            return;
          } else if (scrollAccumulator < 0 && isAtStart) {
            // At first template and scrolling up - allow page scroll up
            scrollAccumulator = 0;
            isChanging = false;
            return;
          } else {
            scrollAccumulator = 0;
            isChanging = false;
            return;
          }
          
          // Reset changing flag after animation
          setTimeout(() => {
            isChanging = false;
          }, 600);
        } else if (Math.abs(scrollAccumulator) >= scrollThreshold && !isAtEnd) {
          // Prevent default while changing (except at last template when scrolling down)
          e.preventDefault();
          e.stopPropagation();
        } else if (isAtEnd && scrollAccumulator > 0) {
          // At last template and scrolling down - allow page scroll
          scrollAccumulator = 0;
        }
      } else {
        scrollAccumulator = 0;
      }
    };

    mainContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      mainContainer.removeEventListener('wheel', handleWheel);
    };
  }, [currentIndex, isSticky]);

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < templates.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <section 
      ref={sectionRef}
      id="premium-templates" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900"
      style={{
        position: isSticky ? 'sticky' : 'relative',
        top: isSticky ? 0 : 'auto',
        zIndex: isSticky ? 100 : 1
      }}
    >
      {/* Background Effects - Matching Landing Page Theme */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Main Container with Luxury Design - Matching Landing Page Theme */}
        <motion.div
          ref={containerRef}
          className="relative bg-gradient-to-br from-gray-800/50 via-gray-900/40 to-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden pl-6 sm:pl-8 lg:pl-12"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Template Container - Single Template View */}
          <div className="relative w-full h-[80vh] min-h-[600px] max-h-[900px] flex">
            {templates.map((template, index) => {
              const isActive = index === currentIndex;
              
              return (
                <motion.div
                  key={template.id}
                  className="absolute inset-0 flex"
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    scale: isActive ? 1 : 0.95,
                    zIndex: isActive ? 1 : 0
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  {/* Content Container with symmetric padding */}
                  <div className="w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2 px-8 sm:px-12 lg:px-16 py-8 sm:py-12 lg:py-16">
                    {/* Left Side - Text Content */}
                    <motion.div
                      className="flex-1 flex flex-col justify-center space-y-6 lg:space-y-8 z-10"
                      initial={{ opacity: 0, x: -100, rotateY: -30 }}
                      animate={{
                        opacity: isActive ? 1 : 0.3,
                        x: isActive ? 0 : -50,
                        rotateY: isActive ? 0 : -20,
                        scale: isActive ? 1 : 0.95
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{
                        perspective: '1000px',
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      {/* Badge */}
                      <motion.div
                        className="text-lime-400 uppercase tracking-wider text-xs sm:text-sm font-semibold"
                        animate={{ opacity: isActive ? 1 : 0.5 }}
                      >
                        CRAFTED FOR SUCCESS
                      </motion.div>

                      {/* Template Name */}
                      <motion.h2
                        className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight"
                        animate={{
                          opacity: isActive ? 1 : 0.4,
                          y: isActive ? 0 : 20
                        }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                      >
                        {template.name.split(' ').map((word, i) => (
                          <React.Fragment key={i}>
                            {word}
                            {i < template.name.split(' ').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </motion.h2>

                      {/* Description */}
                      <motion.p
                        className="text-white/70 text-base sm:text-lg lg:text-xl leading-relaxed max-w-lg"
                        animate={{
                          opacity: isActive ? 1 : 0.3,
                          y: isActive ? 0 : 10
                        }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      >
                        A clean, modern, and straightforward design that lets your experience speak for itself. Perfect for any industry.
                      </motion.p>

                      {/* CTA Button */}
                      <motion.button
                        onClick={handleCtaClick}
                        className="bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-[rgb(129,255,0)]/30 w-fit"
                        animate={{
                          opacity: isActive ? 1 : 0.5,
                          scale: isActive ? 1 : 0.95
                        }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Customize This Template
                      </motion.button>
                    </motion.div>

                    {/* Right Side - Template Preview with 3D Effect */}
                    <motion.div
                      className="flex-1 flex items-center justify-center relative w-full lg:w-auto"
                      style={{
                        isolation: 'isolate'
                      }}
                      initial={{ opacity: 0, x: 100, rotateY: 30 }}
                      animate={{
                        opacity: isActive ? 1 : 0.2,
                        x: isActive ? 0 : 50,
                        rotateY: isActive ? 0 : 20,
                        scale: isActive ? 1 : 0.9,
                        z: isActive ? 0 : -100
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      {/* Next Template Preview Behind - Peeking from Right */}
                      {(() => {
                        const nextIndex = (index + 1) % templates.length;
                        const nextTemplate = templates[nextIndex];
                        const isNextVisible = isActive;
                        
                        return (
                          <motion.div
                            className="absolute w-full max-w-[200px] sm:max-w-[250px] lg:max-w-lg aspect-[8.5/11] rounded-2xl overflow-hidden"
                            style={{
                              left: '70%',
                              zIndex: 0,
                              transform: 'translateX(-30%)'
                            }}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{
                              opacity: isNextVisible ? 0.4 : 0,
                              scale: isNextVisible ? 0.85 : 0.8,
                              rotateY: isNextVisible ? 15 : 20,
                              rotateX: isNextVisible ? 5 : 10
                            }}
                            transition={{ duration: 0.6 }}
                          >
                            <div className="relative w-full h-full bg-white/80 rounded-2xl p-4 shadow-xl">
                              <Image
                                src={nextTemplate.preview}
                                alt={nextTemplate.name}
                                fill
                                className="object-contain rounded-lg opacity-70"
                                unoptimized
                                onError={(e) => {
                                  try {
                                    const target = e.target as HTMLImageElement;
                                    if (!target) return;
                                    
                                    const currentSrc = target.src || '';
                                    
                                    if (target.dataset.triedFallback === 'true') {
                                      return;
                                    }
                                    
                                    const decodedPath = decodeURIComponent(nextTemplate.preview);
                                    const filename = decodedPath.split('/').pop() || '';
                                    target.dataset.triedFallback = 'true';
                                    
                                    const s3Url = getTemplateImageS3Url(filename);
                                    if (s3Url && !currentSrc.includes('s3.') && !currentSrc.includes('amazonaws.com')) {
                                      target.src = s3Url;
                                    } else {
                                      const directPath = `/templates/${encodeURIComponent(filename)}`;
                                      if (directPath !== nextTemplate.preview && !currentSrc.includes(directPath)) {
                                        target.src = directPath;
                                      }
                                    }
                                  } catch (error) {
                                    // Silently handle errors in error handler to prevent recursion
                                  }
                                }}
                              />
                            </div>
                          </motion.div>
                        );
                      })()}
                      
                      {/* Current Template Preview Container with Depth */}
                      <motion.div
                        className="relative w-full max-w-[200px] sm:max-w-[250px] lg:max-w-lg aspect-[8.5/11] rounded-2xl overflow-hidden"
                        style={{
                          zIndex: 10,
                          position: 'relative'
                        }}
                        animate={{
                          boxShadow: isActive 
                            ? '0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            : '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                          rotateY: isActive ? 0 : 15,
                          rotateX: isActive ? 0 : 5
                        }}
                        transition={{ duration: 0.6 }}
                        style={{
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        <div className="relative w-full h-full bg-white rounded-2xl p-4 shadow-2xl">
                          <Image
                            src={template.preview}
                            alt={template.name}
                            fill
                            className="object-contain rounded-lg"
                            priority={isActive}
                            unoptimized
                            onError={(e) => {
                              try {
                                const target = e.target as HTMLImageElement;
                                if (!target) return;
                                
                                const currentSrc = target.src || '';
                                
                                if (target.dataset.triedFallback === 'true') {
                                  console.error(`[PremiumTemplates] All template preview fallbacks exhausted for: ${template.preview}`);
                                  return;
                                }
                                
                                const decodedPath = decodeURIComponent(template.preview);
                                const filename = decodedPath.split('/').pop() || '';
                                target.dataset.triedFallback = 'true';
                                
                                const s3Url = getTemplateImageS3Url(filename);
                                if (s3Url && !currentSrc.includes('s3.') && !currentSrc.includes('amazonaws.com')) {
                                  console.log(`[PremiumTemplates] Template preview falling back to S3: ${s3Url}`);
                                  target.src = s3Url;
                                } else {
                                  const directPath = `/templates/${encodeURIComponent(filename)}`;
                                  if (directPath !== template.preview && !currentSrc.includes(directPath)) {
                                    console.log(`[PremiumTemplates] Template preview trying direct encoded path: ${directPath}`);
                                    target.src = directPath;
                                  } else {
                                    console.error(`[PremiumTemplates] Template preview failed to load and no fallback available: ${template.preview}`);
                                  }
                                }
                              } catch (error) {
                                // Silently handle errors in error handler to prevent recursion
                                if (error instanceof Error) {
                                  console.error(`[PremiumTemplates] Error in image error handler: ${error.message}`);
                                }
                              }
                            }}
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
              <span className="text-white/60 text-sm font-medium">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <div className="w-px h-4 bg-white/20"></div>
              <span className="text-white/40 text-sm">
                {String(templates.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-2xl hover:scale-110"
            aria-label="Previous template"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={() => scrollToIndex(Math.min(templates.length - 1, currentIndex + 1))}
            disabled={currentIndex === templates.length - 1}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-2xl hover:scale-110"
            aria-label="Next template"
          >
            <ChevronRight size={24} />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default PremiumTemplates;
