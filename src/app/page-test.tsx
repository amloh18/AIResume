'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function TestLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-lime-500 rounded-xl flex items-center justify-center">
              <Sparkles size={24} className="text-black" />
            </div>
            <h1 className="text-4xl font-bold text-white">CVCircle</h1>
          </div>
          <p className="text-xl text-gray-300 mb-8">
            AI-Powered CV Builder with Clerk Authentication
          </p>
        </motion.div>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-green-400 mb-2">🎉 Clerk Integration Complete!</h2>
            <p className="text-green-300">
              Your beautiful app now uses Clerk authentication with your existing design system.
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              href="/sign-up"
              className="group relative inline-block bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-lime-400/50 transition-all overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Started
                <ArrowRight size={20} />
              </span>
            </motion.a>

            <motion.a
              href="/sign-in"
              className="group relative inline-block bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign In
            </motion.a>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">🎨 Beautiful Design</h3>
            <p className="text-gray-300 text-sm">Your existing design system integrated with Clerk</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">🔐 Secure Auth</h3>
            <p className="text-gray-300 text-sm">Clerk handles all authentication securely</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">🚀 Fast Setup</h3>
            <p className="text-gray-300 text-sm">5-minute setup vs hours with Firebase</p>
          </div>
        </motion.div>

        {/* Test Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12"
        >
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 className="text-blue-400 font-semibold mb-2">Test Your Integration:</h3>
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <a href="/sign-up" className="text-blue-300 hover:text-blue-200">Sign Up</a>
              <a href="/sign-in" className="text-blue-300 hover:text-blue-200">Sign In</a>
              <a href="/test-clerk" className="text-blue-300 hover:text-blue-200">Test Clerk</a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
