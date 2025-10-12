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
    <section id="chrome-extension" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Save Jobs in{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              Seconds
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our Chrome extension makes job hunting effortless. Save jobs from LinkedIn, Indeed, 
            and 15+ other job sites directly to your <span className="text-lime-400">CV</span><span className="text-gray-300">Circle.io</span> dashboard with just one click.
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
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">One-Click Save</h3>
                  <p className="text-gray-300">Click our extension icon on any job posting to instantly save it to your dashboard.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Smart Parsing</h3>
                  <p className="text-gray-300">Automatically extracts job title, company, location, and description from any job site.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-700 to-blue-800 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Instant Sync</h3>
                  <p className="text-gray-300">Saved jobs appear immediately in your <span className="text-lime-400">CV</span><span className="text-gray-300">Circle.io</span> dashboard for easy tracking and management.</p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadClick}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
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

              {/* Supported Job Sites */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Works on 15+ Job Sites</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'LinkedIn', color: 'from-blue-600 to-blue-700' },
                    { name: 'Indeed', color: 'from-blue-500 to-blue-600' },
                    { name: 'Glassdoor', color: 'from-blue-700 to-blue-800' },
                    { name: 'ZipRecruiter', color: 'from-blue-400 to-blue-500' },
                    { name: 'Monster', color: 'from-blue-600 to-blue-700' },
                    { name: 'AngelList', color: 'from-blue-500 to-blue-600' }
                  ].map((site, index) => (
                    <motion.div
                      key={site.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                      viewport={{ once: true }}
                      className={`bg-gradient-to-r ${site.color} rounded-lg px-3 py-2 text-white text-sm font-medium shadow-md`}
                    >
                      {site.name}
                    </motion.div>
                  ))}
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

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-white mb-2">15+</div>
            <div className="text-gray-300">Supported Job Sites</div>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-white mb-2">1-Click</div>
            <div className="text-gray-300">Save Process</div>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg">
            <div className="text-3xl font-bold text-white mb-2">Instant</div>
            <div className="text-gray-300">Dashboard Sync</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ChromeExtension;
