'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';

interface ProductVideoProps {
  videoSrc?: string;
  posterSrc?: string;
  title?: string;
  description?: string;
  className?: string;
}

const ProductVideo: React.FC<ProductVideoProps> = ({
  videoSrc = '/videos/product-demo.mp4', // You'll need to add this video file
  posterSrc = '/images/video-poster.jpg', // You'll need to add this image
  title = "See CV Circle in Action",
  description = "Watch how easy it is to create professional CVs with AI assistance",
  className = ""
}) => {
  // Check if video file exists, if not show placeholder
  const [videoExists, setVideoExists] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  React.useEffect(() => {
    // Check if video file exists
    fetch(videoSrc, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          setVideoExists(true);
          setShowPlaceholder(false);
        } else {
          setVideoExists(false);
          setShowPlaceholder(true);
        }
      })
      .catch(() => {
        setVideoExists(false);
        setShowPlaceholder(true);
      });
  }, [videoSrc]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const handlePlayPause = () => {
    const video = document.getElementById('product-video') as HTMLVideoElement;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    const video = document.getElementById('product-video') as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    const video = document.getElementById('product-video') as HTMLVideoElement;
    if (video) {
      if (!isFullscreen) {
        if (video.requestFullscreen) {
          video.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleTimeUpdate = () => {
    const video = document.getElementById('product-video') as HTMLVideoElement;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = document.getElementById('product-video') as HTMLVideoElement;
    if (video) {
      setDuration(video.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = document.getElementById('product-video') as HTMLVideoElement;
    if (video) {
      const seekTime = parseFloat(e.target.value);
      video.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <section className={`py-16 bg-gradient-to-br from-blue-50 to-indigo-100 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        <div className="text-center mb-12">
          <motion.h2 
            className="text-4xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {title}
          </motion.h2>
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {description}
          </motion.p>
        </div>

        <motion.div 
          className="relative max-w-5xl mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Video Container */}
          <div 
            className="relative bg-black rounded-2xl shadow-2xl overflow-hidden"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {showPlaceholder ? (
              // Placeholder when video doesn't exist
              <div className="relative bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-center">
                <div className="max-w-2xl mx-auto">
                  <motion.div
                    className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Play className="w-12 h-12 text-white" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-white mb-4">Product Demo Coming Soon</h3>
                  <p className="text-blue-100 text-lg mb-6">
                    We're creating an amazing video to show you how CV Circle works. 
                    In the meantime, try our platform for free!
                  </p>
                  <div className="flex flex-col tablet:flex-row gap-4 justify-center">
                    <motion.button
                      className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.location.href = '/sign-up'}
                    >
                      Try CV Circle Free
                    </motion.button>
                    <motion.button
                      className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.location.href = '/#features'}
                    >
                      Learn More
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              // Actual video when file exists
              <>
            <video
              id="product-video"
              className="w-full h-auto"
              poster={posterSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
              preload="metadata"
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Play/Pause Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <motion.button
                  onClick={handlePlayPause}
                  className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all duration-300 shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-8 h-8 text-blue-600 ml-1" />
                </motion.button>
              </div>
            )}

            {/* Video Controls */}
            <motion.div 
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="flex items-center space-x-4 text-white">
                {/* Play/Pause Button */}
                <button
                  onClick={handlePlayPause}
                  className="hover:text-blue-400 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                {/* Progress Bar */}
                <div className="flex-1 flex items-center space-x-2">
                  <span className="text-sm">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm">{formatTime(duration)}</span>
                </div>

                {/* Volume Button */}
                <button
                  onClick={handleMute}
                  className="hover:text-blue-400 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={handleFullscreen}
                  className="hover:text-blue-400 transition-colors"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
              </>
            )}
          </div>

          {/* Video Features */}
          <div className="mt-8 grid grid-cols-1 tablet:grid-cols-3 gap-6">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Setup</h3>
              <p className="text-gray-600 text-sm">Get started in under 2 minutes</p>
            </motion.div>

            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered</h3>
              <p className="text-gray-600 text-sm">Smart optimization and suggestions</p>
            </motion.div>

            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Maximize className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Professional Results</h3>
              <p className="text-gray-600 text-sm">ATS-optimized and visually appealing</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </section>
  );
};

export default ProductVideo;
