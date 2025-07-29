'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Typewriter from '../ui/Typewriter';
import { Play, ArrowRight, Sparkles } from 'lucide-react';

const Hero = () => {
  const typewriterWords = ['CV', 'Cover Letter', 'Job Tracker'];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated Gradient Orbs */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-lime-400/60 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        
        {/* Grid Lines with 3D Effect */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform rotate-12"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/3 to-transparent transform -rotate-12"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Main Heading with 3D Effect */}
        <motion.h1 
          className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{
            textShadow: '0 0 30px rgba(132, 204, 22, 0.3)',
            transformStyle: 'preserve-3d',
            perspective: '1000px'
          }}
        >
          Create{' '}
          <motion.span
            className="inline-block"
            whileHover={{ 
              rotateY: 10,
              scale: 1.05,
              textShadow: '0 0 50px rgba(132, 204, 22, 0.5)'
            }}
            transition={{ duration: 0.3 }}
          >
            <Typewriter 
              words={typewriterWords} 
              className="text-lime-400"
            />
          </motion.span>
        </motion.h1>

        {/* Subheading */}
        <motion.p 
          className="text-xl sm:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Your one-stop platform for job seekers. Smart, fast, beautiful.
        </motion.p>

        {/* Enhanced CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <motion.button 
            className="group relative bg-gradient-to-r from-lime-400 to-lime-500 text-black px-10 py-5 rounded-full font-semibold text-lg shadow-2xl hover:shadow-lime-400/50 transition-all duration-300 overflow-hidden"
            whileHover={{ 
              scale: 1.05,
              rotateY: 5,
              boxShadow: "0 25px 50px -12px rgba(132, 204, 22, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ filter: 'blur(20px)' }}
            />
            <motion.div
              className="relative flex items-center gap-3"
              whileHover={{ x: 5 }}
            >
              <Sparkles size={20} />
              <span>Try App</span>
              <motion.div
                whileHover={{ rotate: 45 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight size={20} />
              </motion.div>
            </motion.div>
          </motion.button>
          
          <motion.button 
            className="group relative border-2 border-white/20 text-white px-10 py-5 rounded-full font-semibold text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm overflow-hidden"
            whileHover={{ 
              scale: 1.05,
              rotateY: -5,
              borderColor: 'rgba(132, 204, 22, 0.5)'
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-lime-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ filter: 'blur(20px)' }}
            />
            <div className="relative flex items-center gap-3">
              <Play size={20} />
              <span>Watch Demo</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Enhanced App Screenshot Placeholder */}
        <motion.div 
          className="relative max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 1 }}
        >
          <motion.div 
            className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl"
            whileHover={{ 
              scale: 1.02,
              rotateY: 2,
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.8)"
            }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
          >
            <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center relative overflow-hidden">
              {/* Mock UI Elements */}
              <div className="absolute inset-4 bg-gray-600/20 rounded-xl border border-white/10"></div>
              <div className="absolute top-6 left-6 w-32 h-8 bg-lime-400/20 rounded-lg"></div>
              <div className="absolute top-6 right-6 w-24 h-8 bg-blue-400/20 rounded-lg"></div>
              <div className="absolute bottom-6 left-6 w-48 h-12 bg-gray-600/30 rounded-lg"></div>
              
              <div className="text-center relative z-10">
                <motion.div 
                  className="w-20 h-20 bg-gradient-to-br from-lime-400 to-lime-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
                  animate={{
                    rotateY: [0, 10, 0],
                    boxShadow: [
                      "0 0 20px rgba(132, 204, 22, 0.3)",
                      "0 0 40px rgba(132, 204, 22, 0.6)",
                      "0 0 20px rgba(132, 204, 22, 0.3)"
                    ]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <div className="w-10 h-10 bg-white rounded-lg shadow-lg"></div>
                </motion.div>
                <p className="text-white/80 text-xl font-semibold mb-2">App Interface Preview</p>
                <p className="text-white/50 text-sm">Beautiful, intuitive CV builder with 3D effects</p>
              </div>
            </div>
          </motion.div>
          
          {/* Enhanced Floating Elements */}
          <motion.div 
            className="absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full shadow-2xl"
            animate={{
              y: [0, -20, 0],
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute -bottom-6 -right-6 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full shadow-2xl"
            animate={{
              y: [0, 20, 0],
              rotate: [360, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </motion.div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 2 }}
      >
        <motion.div 
          className="w-8 h-14 border-2 border-white/30 rounded-full flex justify-center relative"
          animate={{
            y: [0, 10, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <motion.div 
            className="w-2 h-4 bg-gradient-to-b from-lime-400 to-lime-500 rounded-full mt-3"
            animate={{
              y: [0, 20, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
        <p className="text-center mt-2 text-sm font-medium">Scroll to explore</p>
      </motion.div>
    </section>
  );
};

export default Hero;
