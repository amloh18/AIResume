'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Star,
  Target,
  Briefcase,
  FileText,
  Chrome,
  TrendingUp
} from 'lucide-react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

interface UpgradePopupProps {
  onClose: () => void;
  userId: string;
}

const UpgradePopup: React.FC<UpgradePopupProps> = ({ onClose, userId }) => {
  const { user } = useUnifiedAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleClose = () => {
    setIsVisible(false);
    // Store dismissal in localStorage with timestamp
    const dismissalKey = `upgradePopupDismissed_${userId}_${Date.now()}`;
    localStorage.setItem(dismissalKey, 'true');
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    handleClose();
  };

  const pricingPlans = [
    {
      key: 'pro_monthly',
      name: 'Professional Monthly',
      price: 19,
      period: 'month',
      monthlyEquivalent: 19,
      savings: null,
      popular: true
    },
    {
      key: 'pro_quarterly', 
      name: 'Professional Quarterly',
      price: 49,
      period: 'quarter',
      monthlyEquivalent: 16.33,
      savings: '14%',
      popular: false
    },
    {
      key: 'pro_yearly',
      name: 'Professional Yearly', 
      price: 179,
      period: 'year',
      monthlyEquivalent: 14.92,
      savings: '22%',
      popular: false
    }
  ];

  const nextSteps = [
    {
      icon: Chrome,
      title: 'Install Browser Extension',
      description: 'Add jobs directly from your job portal with one click'
    },
    {
      icon: Target,
      title: 'Track Applications',
      description: 'Monitor your job applications and interview progress'
    },
    {
      icon: FileText,
      title: 'Create Tailored CVs',
      description: 'Generate customized CVs for each job application'
    },
    {
      icon: TrendingUp,
      title: 'ATS Optimization',
      description: 'Ensure your CV passes through applicant tracking systems'
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-[#1A201A] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-white/10"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#80FF00] to-lime-500 rounded-xl flex items-center justify-center">
                    <Crown className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Unlock Premium Features</h2>
                    <p className="text-white/60">Take your career to the next level</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* Congratulations Message */}
                <div className="bg-gradient-to-r from-[#80FF00]/20 to-lime-500/20 border border-[#80FF00]/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-8 h-8 text-[#80FF00] flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-[#80FF00] font-bold text-xl mb-3">Congratulations on taking your first step!</h3>
                      <p className="text-white/90 text-base leading-relaxed mb-4">
                        You've successfully created your Master CV and are now ready to accelerate your career journey. 
                        With our comprehensive platform, you can seamlessly track applications, create tailored CVs, 
                        and generate one-click cover letters with full ATS proofing.
                      </p>
                      <p className="text-white/80 text-sm">
                        Start by installing our Browser extension to add jobs directly from your job portal, 
                        then watch as your applications transform into opportunities.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 text-center">Your Career Journey Awaits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nextSteps.map((step, index) => {
                      const Icon = step.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-[#80FF00]/30 transition-all duration-200"
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-[#80FF00] to-lime-500 rounded-md flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-black" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold mb-1 text-sm">{step.title}</h4>
                            <p className="text-white/70 text-xs leading-relaxed">{step.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing Plans */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-6 text-center">Choose Your Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pricingPlans.map((plan, index) => (
                      <motion.div
                        key={plan.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-105 ${
                          plan.popular 
                            ? 'border-[#80FF00] bg-[#80FF00]/10' 
                            : 'border-white/20 hover:border-[#80FF00]/50'
                        }`}
                        onClick={() => {
                          setShowPaymentModal(true);
                        }}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-[#80FF00] text-black text-xs font-bold px-3 py-1 rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <h4 className="text-lg font-bold text-white mb-2">{plan.name}</h4>
                          <div className="mb-4">
                            {plan.period === 'month' ? (
                              <div className="text-2xl font-bold text-white">
                                £{plan.price}
                                <span className="text-sm text-white/60">/month</span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-2xl font-bold text-white">
                                  £{plan.monthlyEquivalent.toFixed(2)}
                                  <span className="text-sm text-white/60">/month</span>
                                </div>
                                <div className="text-xs text-white/60">
                                  Billed {plan.period === 'quarter' ? 'quarterly' : 'annually'} at £{plan.price}
                                </div>
                              </div>
                            )}
                            {plan.savings && (
                              <div className="text-sm text-[#80FF00] font-medium">
                                Save {plan.savings}
                              </div>
                            )}
                          </div>
                          
                          <ul className="text-left space-y-1 text-xs text-white/80 mb-4">
                            <li className="flex items-center">
                              <CheckCircle className="w-3 h-3 text-[#80FF00] mr-2 flex-shrink-0" />
                              Unlimited CVs
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-3 h-3 text-[#80FF00] mr-2 flex-shrink-0" />
                              All premium templates
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-3 h-3 text-[#80FF00] mr-2 flex-shrink-0" />
                              Cover letter generator
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-3 h-3 text-[#80FF00] mr-2 flex-shrink-0" />
                              Job tracking & management
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-3 h-3 text-[#80FF00] mr-2 flex-shrink-0" />
                              ATS optimization
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-3 h-3 text-[#80FF00] mr-2 flex-shrink-0" />
                              Priority support
                            </li>
                          </ul>
                        </div>
                      </motion.div>
                    ))}
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
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#80FF00] to-lime-500 text-black rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Choose Plan
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      {showPaymentModal && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          preselectedPlanKey="pro_monthly"
        />
      )}
    </>
  );
};

export default UpgradePopup;
