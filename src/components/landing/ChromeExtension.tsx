'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const ChromeExtension = () => {
  const handleDownloadClick = () => {
    // Mock Chrome Web Store link - replace with actual store URL when published
    window.open('https://chrome.google.com/webstore/detail/cvcircle-job-saver/mock-store-id', '_blank');
  };

  return (
    <section id="chrome-extension" className="relative h-screen flex items-center bg-gradient-to-b from-gray-900 to-black overflow-hidden pt-20">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0">
        {/* Grid Lines */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Grid Dots */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(168, 85, 247, 0.4) 2px, transparent 2px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: '25px 25px'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-black/80"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-400/5 to-blue-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6 text-center">
            Save Jobs in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-500">
              Seconds
            </span>
          </h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
            Our Chrome extension makes job hunting effortless. Save jobs from LinkedIn, Indeed, 
            and 15+ other job sites directly to your <span className="text-purple-400">CV</span><span className="text-white/70">Circle.io</span> dashboard with just one click.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <motion.div 
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg"
                  whileHover={{ 
                    scale: 1.1,
                    rotateY: 15,
                    boxShadow: "0 20px 40px -12px rgba(168, 85, 247, 0.5)"
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">One-Click Save</h3>
                  <p className="text-white/80">Click our extension icon on any job posting to instantly save it to your dashboard.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <motion.div 
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg"
                  whileHover={{ 
                    scale: 1.1,
                    rotateY: 15,
                    boxShadow: "0 20px 40px -12px rgba(168, 85, 247, 0.5)"
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Smart Parsing</h3>
                  <p className="text-white/80">Automatically extracts job title, company, location, and description from any job site.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <motion.div 
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg"
                  whileHover={{ 
                    scale: 1.1,
                    rotateY: 15,
                    boxShadow: "0 20px 40px -12px rgba(168, 85, 247, 0.5)"
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Instant Sync</h3>
                  <p className="text-white/80">Saved jobs appear immediately in your <span className="text-purple-400">CV</span><span className="text-white/80">Circle.io</span> dashboard for easy tracking and management.</p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px -12px rgba(168, 85, 247, 0.5)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadClick}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {/* Browser Icons */}
              <div className="flex space-x-2 mr-4">
                {/* Chrome */}
                <div className="w-5 h-5 rounded overflow-hidden">
                  <Image
                    src="/icons/chrome.jpeg"
                    alt="Chrome"
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Edge */}
                <div className="w-5 h-5 rounded overflow-hidden">
                  <Image
                    src="/icons/Microsoft_Edge.png"
                    alt="Microsoft Edge"
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Opera */}
                <div className="w-5 h-5 rounded overflow-hidden">
                  <Image
                    src="/icons/opera.png"
                    alt="Opera"
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Safari */}
                <div className="w-5 h-5 rounded overflow-hidden">
                  <Image
                    src="/icons/Safari_browser_logo.svg.png"
                    alt="Safari"
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Download Text */}
              <span>Download Extension</span>
            </motion.button>
          </motion.div>

          {/* Right side - Visual showcase */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl">
              {/* Chrome Extension Icon */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Image
                      src="/chrome-extension/icons/icon48.png"
                      alt="CVCircle Extension"
                      width={48}
                      height={48}
                      className="rounded-lg"
                    />
                  </div>
                  {/* Chrome Web Store Badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Job Board Logos Ticker */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Works on 15+ Job Sites</h3>
                <div className="relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                  <div className="flex items-center space-x-8 animate-scroll">
                    {/* First set of job boards with logos and names */}
                    <div className="flex items-center space-x-8 whitespace-nowrap">
                      {[
                        { name: 'LinkedIn', logo: '🔗', color: 'from-blue-600 to-blue-700' },
                        { name: 'Indeed', logo: '💼', color: 'from-blue-500 to-blue-600' },
                        { name: 'Glassdoor', logo: '🏢', color: 'from-blue-700 to-blue-800' },
                        { name: 'ZipRecruiter', logo: '⚡', color: 'from-blue-400 to-blue-500' },
                        { name: 'Monster', logo: '👹', color: 'from-blue-600 to-blue-700' },
                        { name: 'AngelList', logo: '👼', color: 'from-blue-500 to-blue-600' },
                        { name: 'RemoteOK', logo: '🌍', color: 'from-blue-600 to-blue-700' },
                        { name: 'We Work Remotely', logo: '🏠', color: 'from-blue-500 to-blue-600' }
                      ].map((site, index) => (
                        <motion.div
                          key={site.name}
                          className={`bg-gradient-to-r ${site.color} rounded-lg px-4 py-3 text-white text-sm font-medium shadow-md flex items-center space-x-2`}
                          whileHover={{ scale: 1.05 }}
                        >
                          <span className="text-lg">{site.logo}</span>
                          <span>{site.name}</span>
                        </motion.div>
                      ))}
                    </div>
                    {/* Duplicate set for seamless loop */}
                    <div className="flex items-center space-x-8 whitespace-nowrap">
                      {[
                        { name: 'LinkedIn', logo: '🔗', color: 'from-blue-600 to-blue-700' },
                        { name: 'Indeed', logo: '💼', color: 'from-blue-500 to-blue-600' },
                        { name: 'Glassdoor', logo: '🏢', color: 'from-blue-700 to-blue-800' },
                        { name: 'ZipRecruiter', logo: '⚡', color: 'from-blue-400 to-blue-500' },
                        { name: 'Monster', logo: '👹', color: 'from-blue-600 to-blue-700' },
                        { name: 'AngelList', logo: '👼', color: 'from-blue-500 to-blue-600' },
                        { name: 'RemoteOK', logo: '🌍', color: 'from-blue-600 to-blue-700' },
                        { name: 'We Work Remotely', logo: '🏠', color: 'from-blue-500 to-blue-600' }
                      ].map((site, index) => (
                        <motion.div
                          key={`${site.name}-duplicate`}
                          className={`bg-gradient-to-r ${site.color} rounded-lg px-4 py-3 text-white text-sm font-medium shadow-md flex items-center space-x-2`}
                          whileHover={{ scale: 1.05 }}
                        >
                          <span className="text-lg">{site.logo}</span>
                          <span>{site.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Extension Popup Preview */}
              <div className="bg-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded"></div>
                  <span className="text-sm font-semibold text-gray-800"><span className="text-lime-600">CV</span><span className="text-gray-800">Circle.io</span> Job Saver</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="mt-3 flex space-x-2">
                  <div className="flex-1 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded text-white text-xs flex items-center justify-center">
                    Save Job
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full opacity-80"
            />
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute -bottom-4 -right-4 w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full opacity-80"
            />
          </motion.div>
        </div>

        {/* Job Board Logos Ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Works on 15+ Job Sites</h3>
            <p className="text-white/70">Save jobs from all major job boards with one click</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
            <div className="flex items-center space-x-8 animate-scroll">
              {/* First set of job boards with logos and names */}
              <div className="flex items-center space-x-8 whitespace-nowrap">
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
                  { name: 'Stack Overflow', logo: '💻', color: 'from-blue-500 to-blue-600' }
                ].map((site, index) => (
                  <motion.div
                    key={site.name}
                    className={`bg-gradient-to-r ${site.color} rounded-xl px-6 py-4 text-white text-sm font-medium shadow-lg flex items-center space-x-3`}
                    whileHover={{ scale: 1.05, y: -2 }}
                  >
                    <span className="text-xl">{site.logo}</span>
                    <span className="font-semibold">{site.name}</span>
                  </motion.div>
                ))}
              </div>
              {/* Duplicate set for seamless loop */}
              <div className="flex items-center space-x-8 whitespace-nowrap">
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
                  { name: 'Stack Overflow', logo: '💻', color: 'from-blue-500 to-blue-600' }
                ].map((site, index) => (
                  <motion.div
                    key={`${site.name}-duplicate`}
                    className={`bg-gradient-to-r ${site.color} rounded-xl px-6 py-4 text-white text-sm font-medium shadow-lg flex items-center space-x-3`}
                    whileHover={{ scale: 1.05, y: -2 }}
                  >
                    <span className="text-xl">{site.logo}</span>
                    <span className="font-semibold">{site.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ChromeExtension;
