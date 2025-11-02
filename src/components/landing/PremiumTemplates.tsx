'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  thumbnail: string;
  preview: string;
}

const templates: Template[] = [
  {
    id: 'the-creative',
    name: 'The Creative',
    thumbnail: '/CV templates/Contemporary-Skills-Rating.png',
    preview: '/CV templates/Contemporary-Skills-Rating.png'
  },
  {
    id: 'the-executive',
    name: 'The Executive',
    thumbnail: '/CV templates/Executive-Professional-Layout.png',
    preview: '/CV templates/Executive-Professional-Layout.png'
  },
  {
    id: 'the-minimalist',
    name: 'The Minimalist',
    thumbnail: '/CV templates/Classic-Black-White-Minimalist.png',
    preview: '/CV templates/Classic-Black-White-Minimalist.png'
  },
  {
    id: 'the-professional',
    name: 'The Professional',
    thumbnail: '/CV templates/Modern-Professional-Single-Column.png',
    preview: '/CV templates/Modern-Professional-Single-Column.png'
  }
];

const PremiumTemplates = () => {
  const router = useRouter();
  const initialIndex = 2; // Start with "The Minimalist"
  const [selectedTemplate, setSelectedTemplate] = useState(templates[initialIndex]);
  const [bigPreviewIndex, setBigPreviewIndex] = useState(initialIndex);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const bigPreviewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Filter out the selected template from carousel
  const carouselTemplates = templates.filter(t => t.id !== selectedTemplate?.id);

  // Auto-rotate carousel every 5 seconds (flowing right)
  useEffect(() => {
    if (!isHovered && carouselTemplates.length > 0) {
      intervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => {
          const next = (prev + 1) % carouselTemplates.length;
          return next;
        });
      }, 5000);
    } else {
      // Clear interval when hovered
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, carouselTemplates.length]);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-rotate big preview through all templates
  useEffect(() => {
    if (!isHovered) {
      bigPreviewIntervalRef.current = setInterval(() => {
        setBigPreviewIndex((prev) => {
          const next = (prev + 1) % templates.length;
          setSelectedTemplate(templates[next]);
          return next;
        });
      }, 5000); // Change every 5 seconds
    } else {
      if (bigPreviewIntervalRef.current) {
        clearInterval(bigPreviewIntervalRef.current);
        bigPreviewIntervalRef.current = null;
      }
    }

    return () => {
      if (bigPreviewIntervalRef.current) {
        clearInterval(bigPreviewIntervalRef.current);
      }
    };
  }, [isHovered]);

  // Continuous scroll animation - show 2 at a time, scrolling left (opposite direction)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!carouselRef.current || isHovered || carouselTemplates.length === 0) return;
    
    const scrollAmount = 0.5; // Slower scroll for smoother effect
    
    // Start from the end for reverse scroll
    const itemWidth = window.innerWidth >= 640 ? 224 + 24 : 192 + 16; // w-56 + gap-6 or w-48 + gap-4
    const singleSetWidth = carouselTemplates.length * itemWidth;
    
    // Only set initial scroll position if ref is available
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = singleSetWidth; // Start from second set
    }
    
    const scrollInterval = setInterval(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft -= scrollAmount; // Scroll left (decreasing)
        
        // Reset scroll position when reaching start for seamless loop
        if (carouselRef.current.scrollLeft <= 0) {
          carouselRef.current.scrollLeft = singleSetWidth;
        }
      }
    }, 16); // ~60fps

    return () => clearInterval(scrollInterval);
  }, [isHovered, carouselTemplates.length]);

  const handleTemplateClick = (template: Template) => {
    const index = templates.findIndex((t) => t.id === template.id);
    setSelectedTemplate(template);
    setBigPreviewIndex(index >= 0 ? index : 0);
    setCarouselIndex(0);
  };

  const handleCtaClick = () => {
    router.push('/sign-up');
  };

  return (
    <section id="premium-templates" className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-gray-900 to-black">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content: Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-end">
          {/* Left Section - Text and Carousel */}
          <motion.div
            className="relative py-8 sm:py-10 lg:py-12 pl-8 sm:pl-10 lg:pl-12 pr-[2px] flex flex-col"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            {/* CRAFTED FOR SUCCESS */}
            <motion.div
              className="text-lime-400 uppercase tracking-wider text-sm sm:text-base font-semibold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              CRAFTED FOR SUCCESS
            </motion.div>

            {/* Main Heading */}
            {selectedTemplate && (
              <motion.h2
                key={selectedTemplate.id}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {selectedTemplate.name.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {word}
                    {i < selectedTemplate.name.split(' ').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </motion.h2>
            )}

            {/* Description */}
            <motion.p
              className="text-white/80 text-base sm:text-lg mb-8 max-w-md leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              A clean, modern, and straightforward design that lets your experience speak for itself. Perfect for any industry.
            </motion.p>

            {/* CTA Button */}
            <motion.button
              onClick={handleCtaClick}
              className="bg-lime-400 hover:bg-lime-500 text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-400/20 w-fit mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Customize This Template
            </motion.button>

            {/* Carousel Section - Right Below Text */}
            <motion.div
              className="mt-4 pt-4"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Container to show exactly 2 thumbnails at a time */}
              <div 
                ref={carouselRef}
                className="relative overflow-x-auto overflow-y-hidden w-[400px] sm:w-[472px] max-w-full scrollbar-hide"
                style={{ 
                  scrollBehavior: 'auto'
                }}
              >
                <div 
                  className="flex gap-4 sm:gap-6 pb-4"
                  style={{ 
                    width: 'max-content'
                  }}
                >
                  {/* Render templates multiple times for seamless loop */}
                  {carouselTemplates.length > 0 && [...carouselTemplates, ...carouselTemplates, ...carouselTemplates].map((template, index) => (
                    <motion.div
                      key={`${template.id}-${index}`}
                      className="flex-shrink-0 cursor-pointer group"
                      onClick={() => handleTemplateClick(template)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: carouselTemplates.length > 0 ? (index % carouselTemplates.length) * 0.1 : 0 }}
                    >
                      <div className="relative">
                        {/* Thumbnail Container */}
                        <div
                          className="relative w-48 sm:w-56 h-64 sm:h-72 rounded-lg overflow-hidden transition-all duration-300 ring-2 ring-gray-700 hover:ring-lime-400/50"
                        >
                          {isLoading ? (
                            <div className="w-full h-full bg-gray-700 animate-pulse flex items-center justify-center">
                              <div className="text-gray-500 text-sm">Loading...</div>
                            </div>
                          ) : (
                            <Image
                              src={template.thumbnail}
                              alt={template.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-110"
                              unoptimized
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Section - Preview */}
          <motion.div
            className="relative py-8 sm:py-10 lg:py-12 pr-8 sm:pr-10 lg:pr-12 pl-[2px] hidden lg:flex items-end justify-center"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            {/* Frame around preview */}
            <div className="relative w-full h-[800px] flex items-center justify-center p-4">
              {/* Template Preview */}
              <div className="relative bg-white rounded-lg p-4 transform rotate-0 w-full h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center rounded">
                    <div className="text-gray-400 text-lg">Loading template preview...</div>
                  </div>
                ) : selectedTemplate ? (
                  <motion.div
                    key={selectedTemplate.id}
                    className="relative w-full h-full rounded overflow-hidden flex items-center justify-center"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%',
                      aspectRatio: '8.5 / 11'
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Image
                      src={selectedTemplate.preview}
                      alt={selectedTemplate.name}
                      fill
                      className="object-contain"
                      priority
                      unoptimized
                      onLoad={() => setIsLoading(false)}
                      sizes="(max-width: 1024px) 0vw, 50vw"
                    />
                  </motion.div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PremiumTemplates;
