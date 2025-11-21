'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const ChromeExtension = () => {
  return (
    <section id="chrome-extension" className="relative pt-32 pb-20 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="flex flex-col tablet:flex-row items-start tablet:items-center justify-between gap-4 tablet:gap-6 mb-4">
            <div className="flex-1">
              <h2 className="text-3xl tablet:text-3xl desktop:text-4xl font-bold text-white mb-4 text-left">
                Our Browser Extension Works on
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
                  100+ Job Sites
                </span>
              </h2>
              <p className="text-sm tablet:text-base desktop:text-lg text-white/70 max-w-2xl text-left">
                Seamlessly integrate with all major job boards and career platforms
              </p>
            </div>
            <motion.button
              onClick={() => window.open('https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=item-share-cb', '_blank')}
              className="bg-lime-400 hover:bg-lime-500 text-black font-semibold px-6 py-3 tablet:px-8 tablet:py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-400/20 whitespace-nowrap flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Download Browser Extension
            </motion.button>
          </div>
        </motion.div>

        {/* Job Sites Ticker */}
        <motion.div
          className="relative overflow-hidden -mx-4 tablet:-mx-6 desktop:-mx-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true }}
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
          }}
        >
          <div className="flex items-center space-x-8 whitespace-nowrap animate-scroll">
            {[
              { name: 'LinkedIn', logoUrl: 'https://logo.clearbit.com/linkedin.com' },
              { name: 'Indeed', logoUrl: 'https://logo.clearbit.com/indeed.com' },
              { name: 'Glassdoor', logoUrl: 'https://logo.clearbit.com/glassdoor.com' },
              { name: 'ZipRecruiter', logoUrl: 'https://logo.clearbit.com/ziprecruiter.com' },
              { name: 'Monster', logoUrl: 'https://logo.clearbit.com/monster.com' },
              { name: 'AngelList', logoUrl: 'https://logo.clearbit.com/angel.co' },
              { name: 'RemoteOK', logoUrl: 'https://logo.clearbit.com/remoteok.com' },
              { name: 'We Work Remotely', logoUrl: 'https://logo.clearbit.com/weworkremotely.com' },
              { name: 'Dice', logoUrl: 'https://logo.clearbit.com/dice.com' },
              { name: 'Stack Overflow', logoUrl: 'https://logo.clearbit.com/stackoverflow.com' },
              { name: 'FlexJobs', logoUrl: 'https://logo.clearbit.com/flexjobs.com' },
              { name: 'CareerBuilder', logoUrl: 'https://logo.clearbit.com/careerbuilder.com' },
              { name: 'SimplyHired', logoUrl: 'https://logo.clearbit.com/simplyhired.com' },
              { name: 'Upwork', logoUrl: 'https://logo.clearbit.com/upwork.com' },
              { name: 'Freelancer', logoUrl: 'https://logo.clearbit.com/freelancer.com' }
            ].map((site, index) => (
              <motion.div
                key={site.name}
                className="rounded-xl px-4 py-3 tablet:px-6 tablet:py-4 text-white text-xs tablet:text-sm font-medium shadow-lg flex items-center space-x-2 tablet:space-x-3 flex-shrink-0"
                style={{ backgroundColor: '#603a86' }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="relative w-6 h-6 tablet:w-8 tablet:h-8 flex-shrink-0">
                  <Image
                    src={site.logoUrl}
                    alt={site.name}
                    fill
                    className="object-contain"
                    quality={75}
                    sizes="32px"
                  />
                </div>
                <span className="font-semibold">{site.name}</span>
              </motion.div>
            ))}
            
            {/* Duplicate set for seamless loop */}
            {[
              { name: 'LinkedIn', logoUrl: 'https://logo.clearbit.com/linkedin.com' },
              { name: 'Indeed', logoUrl: 'https://logo.clearbit.com/indeed.com' },
              { name: 'Glassdoor', logoUrl: 'https://logo.clearbit.com/glassdoor.com' },
              { name: 'ZipRecruiter', logoUrl: 'https://logo.clearbit.com/ziprecruiter.com' },
              { name: 'Monster', logoUrl: 'https://logo.clearbit.com/monster.com' },
              { name: 'AngelList', logoUrl: 'https://logo.clearbit.com/angel.co' },
              { name: 'RemoteOK', logoUrl: 'https://logo.clearbit.com/remoteok.com' },
              { name: 'We Work Remotely', logoUrl: 'https://logo.clearbit.com/weworkremotely.com' },
              { name: 'Dice', logoUrl: 'https://logo.clearbit.com/dice.com' },
              { name: 'Stack Overflow', logoUrl: 'https://logo.clearbit.com/stackoverflow.com' },
              { name: 'FlexJobs', logoUrl: 'https://logo.clearbit.com/flexjobs.com' },
              { name: 'CareerBuilder', logoUrl: 'https://logo.clearbit.com/careerbuilder.com' },
              { name: 'SimplyHired', logoUrl: 'https://logo.clearbit.com/simplyhired.com' },
              { name: 'Upwork', logoUrl: 'https://logo.clearbit.com/upwork.com' },
              { name: 'Freelancer', logoUrl: 'https://logo.clearbit.com/freelancer.com' }
            ].map((site, index) => (
              <motion.div
                key={`${site.name}-duplicate`}
                className="rounded-xl px-4 py-3 tablet:px-6 tablet:py-4 text-white text-xs tablet:text-sm font-medium shadow-lg flex items-center space-x-2 tablet:space-x-3 flex-shrink-0"
                style={{ backgroundColor: '#603a86' }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="relative w-6 h-6 tablet:w-8 tablet:h-8 flex-shrink-0">
                  <Image
                    src={site.logoUrl}
                    alt={site.name}
                    fill
                    className="object-contain"
                    quality={75}
                    sizes="32px"
                  />
                </div>
                <span className="font-semibold">{site.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ChromeExtension;