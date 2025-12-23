'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lock } from 'lucide-react';

interface AITeaserProps {
  blurredContent: string;
  onUnlock: () => void;
  featureName: string;
}

export default function AITeaser({ blurredContent, onUnlock, featureName }: AITeaserProps) {
  return (
    <div className="relative">
      {/* Blurred content */}
      <div 
        className="blur-sm select-none pointer-events-none"
        style={{ filter: 'blur(8px)' }}
      >
        {blurredContent}
      </div>
      
      {/* Overlay with unlock button */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
        <motion.button
          onClick={onUnlock}
          className="flex flex-col items-center gap-2 px-6 py-4 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-xl font-semibold transition-all shadow-lg"
          whileHover={{ scale: 1.05 }}
        >
          <Sparkles className="w-5 h-5" />
          <span>Unlock {featureName}</span>
          <span className="text-xs font-normal">Upgrade to Pro</span>
        </motion.button>
      </div>
    </div>
  );
}

