'use client';

import React from 'react';
import { motion } from 'framer-motion';

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

const ChromeExtension = () => {
  return (
    <section id="chrome-extension" className="relative pt-32 pb-20 bg-[#141810] overflow-hidden">
      {/* Background Effects - Subtle dark glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#81ff00]/5 rounded-full blur-[150px]"></div>
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
              <h2 className="text-2xl tablet:text-2xl desktop:text-3xl font-bold text-white mb-4 text-left">
                Our Browser Extension Works on
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
                  100+ Job Sites
                </span>
              </h2>
              <p className="text-xs tablet:text-sm desktop:text-base text-white/70 max-w-2xl text-left">
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
            {JOB_SITES.map((site, index) => (
              <motion.div
                key={site.name}
                className="rounded-xl px-4 py-3 tablet:px-6 tablet:py-4 text-white text-xs tablet:text-xs font-medium shadow-lg flex items-center space-x-2 tablet:space-x-3 flex-shrink-0"
                style={{ backgroundColor: '#603a86' }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="w-6 h-6 tablet:w-8 tablet:h-8 flex-shrink-0 bg-white rounded-full overflow-hidden flex items-center justify-center">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=128`}
                    alt={site.name}
                    className="w-4 h-4 tablet:w-5 tablet:h-5 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span className="font-semibold">{site.name}</span>
              </motion.div>
            ))}

            {/* Duplicate set for seamless loop */}
            {JOB_SITES.map((site, index) => (
              <motion.div
                key={`${site.name}-duplicate`}
                className="rounded-xl px-4 py-3 tablet:px-6 tablet:py-4 text-white text-xs tablet:text-xs font-medium shadow-lg flex items-center space-x-2 tablet:space-x-3 flex-shrink-0"
                style={{ backgroundColor: '#603a86' }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="w-6 h-6 tablet:w-8 tablet:h-8 flex-shrink-0 bg-white rounded-full overflow-hidden flex items-center justify-center">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=128`}
                    alt={site.name}
                    className="w-4 h-4 tablet:w-5 tablet:h-5 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
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