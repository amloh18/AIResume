'use client';

import React from 'react';
import Image from 'next/image';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Initializing Experience' }) => {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#f3f2ee] dark:bg-[var(--bg-primary)] overflow-hidden">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Advanced Orbital Rings */}
        <div className="absolute inset-0 border-[3px] border-transparent border-t-[#83d60d] rounded-full animate-[spin_2s_linear_infinite]" />
        <div className="absolute inset-2 border-[2px] border-transparent border-b-[#83d60d]/50 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
        <div className="absolute inset-4 border-[1px] border-transparent border-r-[#83d60d]/30 rounded-full animate-[spin_1.5s_linear_infinite]" />
        
        {/* Pulsing Glow */}
        <div className="absolute inset-0 bg-[#83d60d]/10 rounded-full animate-pulse blur-xl" />
        
        {/* Central Favicon */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 z-10 p-2">
          <Image 
            src="/images/favicon.png" 
            alt="CV Circle" 
            width={128} 
            height={128} 
            className="w-full h-full object-contain animate-[float_3s_easeInOut_infinite]"
            priority
          />
        </div>
      </div>
      
      <div className="mt-12 flex flex-col items-center gap-3">
        <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-[0.25em] animate-pulse">
          {message}
        </h3>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div 
              key={i} 
              className="w-1.5 h-1.5 rounded-full bg-[#83d60d]" 
              style={{ animation: `loading-bounce 1s infinite ${i * 0.2}s` }} 
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes loading-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
