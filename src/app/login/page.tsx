'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/auth/LoginModal';
import { ArrowLeft, Sparkles } from 'lucide-react';

type LoginStep = 'login' | 'loading' | 'complete';

const LoginPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<LoginStep>('login');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (userData: any) => {
    setCurrentStep('loading');
    setIsLoading(true);

    // Simulate loading time
    setTimeout(() => {
      setCurrentStep('complete');
      
      // Auto-redirect to dashboard after 3 seconds
      setTimeout(() => {
        // Set flag for dashboard welcome animation
        sessionStorage.setItem('fromLogin', 'true');
        window.location.href = '/dashboard';
      }, 3000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0">
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
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Back Button */}
      <motion.button
        onClick={() => router.push('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors z-10"
        whileHover={{ x: -5 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ArrowLeft size={20} />
        Back to Home
      </motion.button>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          {currentStep === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <LoginModal
                isOpen={true}
                onClose={() => router.push('/')}
                onSwitchToRegister={() => router.push('/register')}
                onLogin={handleLogin}
              />
            </motion.div>
          )}

          {currentStep === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-center space-y-8"
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={48} className="text-black" />
              </motion.div>
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome back!</h2>
                <p className="text-white/60 text-lg">Loading your dashboard and preparing your workspace</p>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="text-center space-y-8"
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
              >
                <Sparkles size={48} className="text-white" />
              </motion.div>
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Login Successful!</h2>
                <p className="text-white/60 text-lg">Redirecting to your dashboard...</p>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginPage; 