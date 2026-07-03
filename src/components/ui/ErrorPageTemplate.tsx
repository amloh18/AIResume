'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, RefreshCcw } from 'lucide-react';

interface ErrorPageTemplateProps {
  code: string;
  title: string;
  message: string;
  onReset?: () => void;
  showHome?: boolean;
  showBack?: boolean;
}

const ErrorPageTemplate: React.FC<ErrorPageTemplateProps> = ({
  code,
  title,
  message,
  onReset,
  showHome = true,
  showBack = true,
}) => {
  return (
    <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#1a230f] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <Logo size="lg" />
      </motion.div>

      <div className="relative mb-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1 
          }}
          className="text-[120px] md:text-[180px] font-black text-[#81ff00] leading-none select-none opacity-20 dark:opacity-10"
        >
          {code}
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <h2 className="text-h1 md:text-display font-bold text-gray-900 dark:text-white mb-2 italic">
            {title}
          </h2>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-gray-600 dark:text-gray-400 max-w-md mb-10 text-h3"
      >
        {message}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-wrap items-center justify-center gap-4"
      >
        {showBack && (
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Go Back
          </Button>
        )}

        {onReset && (
          <Button
            variant="outline"
            onClick={onReset}
            className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCcw className="mr-2 w-4 h-4" />
            Try Again
          </Button>
        )}

        {showHome && (
          <Link href="/">
            <Button className="bg-[#81ff00] hover:bg-[#72e000] text-black font-semibold px-8">
              <Home className="mr-2 w-4 h-4" />
              Return Home
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-[#81ff00] rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.03, 0.08, 0.03],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-[#81ff00] rounded-full blur-[120px]"
        />
      </div>
    </div>
  );
};

export default ErrorPageTemplate;
