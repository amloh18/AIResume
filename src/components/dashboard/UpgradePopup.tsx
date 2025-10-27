'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Crown, 
  Sparkles, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';

interface UpgradePopupProps {
  onClose: () => void;
  userId: string;
}

const UpgradePopup: React.FC<UpgradePopupProps> = ({ onClose, userId }) => {
  const { user } = useUnifiedAuth();
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    // Store dismissal in localStorage with timestamp
    const dismissalKey = `upgradePopupDismissed_${userId}_${Date.now()}`;
    localStorage.setItem(dismissalKey, 'true');
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleUpgrade = () => {
    // TODO: Implement upgrade flow
    console.log('Upgrade clicked');
    handleClose();
  };

  const premiumFeatures = [
    {
      icon: Crown,
      title: 'Unlimited CVs',
      description: 'Create as many CVs as you need for different roles'
    },
    {
      icon: Sparkles,
      title: 'Advanced Templates',
      description: 'Access premium templates designed by professionals'
    },
    {
      icon: Zap,
      title: 'AI Credits',
      description: 'Get more AI-powered content suggestions and optimizations'
    },
    {
      icon: Star,
      title: 'Priority Support',
      description: 'Get faster response times and dedicated support'
    }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-[#1A261A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-lime-400 to-lime-500 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Unlock Premium Features</h2>
                  <p className="text-white/60">Take your career to the next level</p>
                </div>
              </div>
              
              <motion.button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Success Message */}
              <div className="bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-lime-400" />
                  <div>
                    <h3 className="text-lime-400 font-semibold">Master CV Created Successfully!</h3>
                    <p className="text-white/80 text-sm">You're now ready to start your career journey</p>
                  </div>
                </div>
              </div>

              {/* Premium Features */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">What's included in Premium?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {premiumFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-lime-400/30 transition-all duration-200"
                      >
                        <div className="w-10 h-10 bg-gradient-to-r from-lime-400 to-lime-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                          <p className="text-white/70 text-sm">{feature.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    $9.99<span className="text-lg text-white/60">/month</span>
                  </div>
                  <p className="text-white/80 text-sm">Cancel anytime • 7-day free trial</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-white/10">
              <motion.button
                onClick={handleClose}
                className="px-6 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Maybe Later
              </motion.button>
              
              <motion.button
                onClick={handleUpgrade}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Upgrade Now
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradePopup;
