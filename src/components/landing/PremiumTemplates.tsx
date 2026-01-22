'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CardSwap, { Card } from '@/components/CardSwap';

interface Template {
  id: string;
  name: string;
  thumbnail: string;
  preview: string;
}

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
  const cardSwapDelay = 4000; // Match the delay prop in CardSwap

  const handleCtaClick = () => {
    router.push('/sign-up');
  };

  const handleCardClick = (index: number) => {
    setCurrentIndex(index);
  };

  // Track automatic card cycling to update the active template name
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % templates.length);
    }, cardSwapDelay);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="premium-templates"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#141810]"
    >
      {/* Background Effects - Subtle dark glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#603a86]/20 rounded-full blur-[150px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1500px] mx-auto px-4 tablet:px-6 desktop:px-8 pt-8 pb-20">
        {/* Main Container with Luxury Design - Matching Landing Page Theme */}
        <motion.div
          className="relative backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden min-h-[700px] pt-4 tablet:pt-0 bg-[#603a86]"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backgroundColor: '#603a86'
          }}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="relative w-full h-full flex flex-col desktop:flex-row items-center justify-between min-h-[700px] pl-8 tablet:pl-12 desktop:pl-16 pb-4 tablet:pb-6 desktop:pb-8">
            {/* Left Side - Text Content */}
            <div className="flex-1 flex flex-col justify-center space-y-6 desktop:space-y-8 z-10">
              {/* Badge */}
              <div className="text-lime-400 uppercase tracking-wider text-xs tablet:text-xs font-semibold">
                CRAFTED FOR SUCCESS
              </div>

              {/* Title - Shows active template name */}
              <motion.h2
                key={currentIndex}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="text-3xl tablet:text-4xl desktop:text-6xl font-bold text-white leading-tight"
              >
                {templates[currentIndex].name.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {word}
                    {i < templates[currentIndex].name.split(' ').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </motion.h2>

              {/* Description */}
              <p className="text-white/70 text-sm tablet:text-base desktop:text-lg leading-relaxed max-w-lg">
                A clean, modern, and straightforward design that lets your experience speak for itself. Perfect for any industry.
              </p>

              {/* CTA Button */}
              <motion.button
                onClick={handleCtaClick}
                className="bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-[rgb(129,255,0)]/30 w-fit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View Templates
              </motion.button>
            </div>

            {/* Right Side - CardSwap Component */}
            <div className="flex-1 flex items-center justify-end relative w-full desktop:w-auto h-full overflow-visible p-0">
              <div className="mt-8 tablet:mt-12 desktop:mt-16 mr-4 tablet:mr-6 desktop:mr-8">
                <CardSwap
                  width={450}
                  height={550}
                  cardDistance={60}
                  verticalDistance={70}
                  delay={cardSwapDelay}
                  pauseOnHover={true}
                  onCardClick={handleCardClick}
                  skewAmount={6}
                  easing="elastic"
                >
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      customClass="bg-white rounded-2xl overflow-hidden shadow-2xl"
                    >
                      <div className="relative w-full h-full p-4">
                        <Image
                          src={template.preview}
                          alt={template.name}
                          fill
                          className="object-contain rounded-lg"
                          quality={80}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          loading="lazy"
                        />
                      </div>
                    </Card>
                  ))}
                </CardSwap>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PremiumTemplates;
