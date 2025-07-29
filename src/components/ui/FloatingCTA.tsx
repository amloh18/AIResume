'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const FloatingCTA = () => {
  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1 }}
    >
      <motion.button
        className="group relative bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-lime-400/50 transition-all duration-300"
        whileHover={{ 
          scale: 1.05,
          rotateY: 5,
          rotateX: 5,
          boxShadow: "0 25px 50px -12px rgba(132, 204, 22, 0.4)"
        }}
        whileTap={{ scale: 0.95 }}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px'
        }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ filter: 'blur(20px)' }}
        />
        
        <motion.div
          className="relative flex items-center gap-2"
          whileHover={{ x: 5 }}
        >
          <span>Get Started</span>
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
      </motion.button>
    </motion.div>
  );
};

export default FloatingCTA;
