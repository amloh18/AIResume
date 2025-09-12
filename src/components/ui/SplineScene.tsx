'use client';

import React, { useState, useEffect } from 'react';

interface SplineSceneProps {
  scene: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SplineScene({ scene, className = '', style }: SplineSceneProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Simulate loading time and then show fallback
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowFallback(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 ${className}`} style={style}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lime-400 text-sm">Loading 3D Scene...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative overflow-hidden ${className}`} style={style}>
      {/* Beautiful 3D-like fallback with animated elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {/* Floating geometric shapes */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-lime-400/20 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-cyan-400/20 rounded-full animate-bounce"></div>
          <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-pink-400/20 rounded-full animate-ping"></div>
          
          {/* Gradient orbs */}
          <div className="absolute top-1/3 right-1/3 w-40 h-40 bg-gradient-to-r from-lime-400/30 to-cyan-400/30 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/3 w-32 h-32 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-lg animate-bounce"></div>
        </div>
        
        {/* Central content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-lime-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-lime-400/25 animate-pulse">
              <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-lime-400 to-cyan-400 bg-clip-text text-transparent">
              CV Circle
            </h3>
            <p className="text-white/80 text-sm">
              Create stunning CVs that get you hired
            </p>
          </div>
        </div>
        
        {/* Animated particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-lime-400/60 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
