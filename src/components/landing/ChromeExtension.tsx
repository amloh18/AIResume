'use client';

import React from 'react';
import { motion } from 'framer-motion';

const ChromeExtension = () => {
  return (
    <section id="chrome-extension" className="relative py-20 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Works on{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              15+ Job Sites
            </span>
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Seamlessly integrate with all major job boards and career platforms
          </p>
        </motion.div>

        {/* Job Sites Ticker */}
        <motion.div
          className="relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center space-x-8 whitespace-nowrap animate-scroll">
            {[
              { name: 'LinkedIn', logo: '🔗', color: 'from-blue-600 to-blue-700' },
              { name: 'Indeed', logo: '💼', color: 'from-blue-500 to-blue-600' },
              { name: 'Glassdoor', logo: '🏢', color: 'from-blue-700 to-blue-800' },
              { name: 'ZipRecruiter', logo: '⚡', color: 'from-blue-400 to-blue-500' },
              { name: 'Monster', logo: '👹', color: 'from-blue-600 to-blue-700' },
              { name: 'AngelList', logo: '👼', color: 'from-blue-500 to-blue-600' },
              { name: 'RemoteOK', logo: '🌍', color: 'from-blue-600 to-blue-700' },
              { name: 'We Work Remotely', logo: '🏠', color: 'from-blue-500 to-blue-600' },
              { name: 'Dice', logo: '🎲', color: 'from-blue-600 to-blue-700' },
              { name: 'Stack Overflow', logo: '💻', color: 'from-blue-500 to-blue-600' },
              { name: 'FlexJobs', logo: '💪', color: 'from-blue-600 to-blue-700' },
              { name: 'CareerBuilder', logo: '🏗️', color: 'from-blue-500 to-blue-600' },
              { name: 'SimplyHired', logo: '🎯', color: 'from-blue-600 to-blue-700' },
              { name: 'Upwork', logo: '🚀', color: 'from-blue-500 to-blue-600' },
              { name: 'Freelancer', logo: '💼', color: 'from-blue-600 to-blue-700' }
            ].map((site, index) => (
              <motion.div
                key={site.name}
                className={`bg-gradient-to-r ${site.color} rounded-xl px-6 py-4 text-white text-sm font-medium shadow-lg flex items-center space-x-3 flex-shrink-0`}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <span className="text-xl">{site.logo}</span>
                <span className="font-semibold">{site.name}</span>
              </motion.div>
            ))}
            
            {/* Duplicate set for seamless loop */}
            {[
              { name: 'LinkedIn', logo: '🔗', color: 'from-blue-600 to-blue-700' },
              { name: 'Indeed', logo: '💼', color: 'from-blue-500 to-blue-600' },
              { name: 'Glassdoor', logo: '🏢', color: 'from-blue-700 to-blue-800' },
              { name: 'ZipRecruiter', logo: '⚡', color: 'from-blue-400 to-blue-500' },
              { name: 'Monster', logo: '👹', color: 'from-blue-600 to-blue-700' },
              { name: 'AngelList', logo: '👼', color: 'from-blue-500 to-blue-600' },
              { name: 'RemoteOK', logo: '🌍', color: 'from-blue-600 to-blue-700' },
              { name: 'We Work Remotely', logo: '🏠', color: 'from-blue-500 to-blue-600' },
              { name: 'Dice', logo: '🎲', color: 'from-blue-600 to-blue-700' },
              { name: 'Stack Overflow', logo: '💻', color: 'from-blue-500 to-blue-600' },
              { name: 'FlexJobs', logo: '💪', color: 'from-blue-600 to-blue-700' },
              { name: 'CareerBuilder', logo: '🏗️', color: 'from-blue-500 to-blue-600' },
              { name: 'SimplyHired', logo: '🎯', color: 'from-blue-600 to-blue-700' },
              { name: 'Upwork', logo: '🚀', color: 'from-blue-500 to-blue-600' },
              { name: 'Freelancer', logo: '💼', color: 'from-blue-600 to-blue-700' }
            ].map((site, index) => (
              <motion.div
                key={`${site.name}-duplicate`}
                className={`bg-gradient-to-r ${site.color} rounded-xl px-6 py-4 text-white text-sm font-medium shadow-lg flex items-center space-x-3 flex-shrink-0`}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <span className="text-xl">{site.logo}</span>
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