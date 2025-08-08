'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const FloatingCTA = () => {
  return (
    <motion.div
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 gpu-accelerated"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
      style={{ willChange: 'transform, opacity' }}
    >
      <motion.a
        href="/register"
        className="group relative inline-block bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-lime-400/50 transition-all duration-200 whitespace-nowrap btn-hover"
        whileHover={{ 
          scale: 1.02,
          boxShadow: "0 15px 30px -5px rgba(132, 204, 22, 0.3)"
        }}
        whileTap={{ scale: 0.98 }}
        style={{ willChange: 'transform' }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ filter: 'blur(20px)' }}
        />
        
        <motion.div
          className="relative flex items-center gap-2"
          whileHover={{ x: 5 }}
        >
          <span className="whitespace-nowrap">Get Started</span>
          <motion.div
            whileHover={{ rotate: 45 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowRight size={20} />
          </motion.div>
        </motion.div>
        
        {/* 3D Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-lime-400/20 to-lime-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ 
            filter: 'blur(30px)',
            transform: 'translateZ(-10px)'
          }}
        />
      </motion.a>
    </motion.div>
  );
};

export default FloatingCTA;
