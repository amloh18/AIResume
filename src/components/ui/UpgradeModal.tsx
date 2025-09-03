'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  CheckCircle, 
  X, 
  ArrowRight,
  Star,
  Zap,
  Target,
  TrendingUp,
  Brain,
  Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  description?: string;
  benefits?: string[];
  className?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature = 'AI Assistant',
  description = 'Unlock powerful AI features to enhance your CV',
  benefits = [
    'Professional content optimization',
    'ATS keyword matching',
    'Quantified achievements',
    'Tailored suggestions'
  ],
  className = ''
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Navigate to membership page
      router.push('/dashboard/settings?tab=membership');
      onClose();
    } catch (error) {
      console.error('Error navigating to upgrade page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI Content Optimization',
      description: 'Get intelligent suggestions to improve your CV content'
    },
    {
      icon: Target,
      title: 'ATS Score Tracking',
      description: 'Real-time ATS compatibility scoring and keyword analysis'
    },
    {
      icon: TrendingUp,
      title: 'Achievement Quantification',
      description: 'Transform vague statements into impactful, quantified achievements'
    },
    {
      icon: Zap,
      title: 'Smart Suggestions',
      description: 'Context-aware recommendations based on job requirements'
    },
    {
      icon: Shield,
      title: 'Premium Templates',
      description: 'Access to premium CV templates and design options'
    },
    {
      icon: Star,
      title: 'Priority Support',
      description: 'Get help when you need it with priority customer support'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl ${className}`}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-gray-200">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-lime-500 to-lime-600 rounded-full">
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Unlock {feature}
                </h2>
                
                <p className="text-gray-600 max-w-md mx-auto">
                  {description}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0 p-2 bg-lime-100 rounded-lg">
                      <feature.icon className="h-5 w-5 text-lime-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Benefits List */}
              {benefits.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    What you'll get:
                  </h3>
                  <div className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-lime-600 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="bg-gradient-to-r from-lime-50 to-lime-100 rounded-lg p-6 mb-8">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">$9.99</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Cancel anytime • 7-day free trial
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <Sparkles className="h-4 w-4 text-lime-600" />
                    <span>Unlock all PRO features instantly</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <Crown className="h-5 w-5" />
                      <span>Upgrade to PRO</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
                
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Maybe Later
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>7-Day Trial</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <X className="h-4 w-4" />
                    <span>Cancel Anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
