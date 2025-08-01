'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Lightbulb, 
  FileText, 
  Palette, 
  Download,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

interface OnboardingTip {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action?: string;
}

interface OnboardingTipsProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const OnboardingTips: React.FC<OnboardingTipsProps> = ({
  isVisible,
  onClose,
  onComplete
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [completedTips, setCompletedTips] = useState<Set<string>>(new Set());

  const tips: OnboardingTip[] = [
    {
      id: 'template',
      title: 'Choose a Template',
      description: 'Start by selecting a professional template that matches your industry and style. You can change it anytime without losing your content.',
      icon: FileText,
      action: 'Browse Templates'
    },
    {
      id: 'customize',
      title: 'Customize Your Content',
      description: 'Edit your personal information, work experience, education, and skills. Use the AI assistant to get suggestions and improve your content.',
      icon: Palette,
      action: 'Start Editing'
    },
    {
      id: 'snippets',
      title: 'Add Professional Snippets',
      description: 'Use pre-written professional snippets to quickly add compelling content to your CV. AI will suggest relevant snippets based on your current section.',
      icon: Lightbulb,
      action: 'Explore Snippets'
    },
    {
      id: 'export',
      title: 'Export When Ready',
      description: 'Download your CV as a PDF for job applications or save as JSON for future editing. Your work is automatically saved as you type.',
      icon: Download,
      action: 'Export CV'
    }
  ];

  const handleTipComplete = (tipId: string) => {
    setCompletedTips(prev => new Set(Array.from(prev).concat([tipId])));
  };

  const handleNext = () => {
    if (currentTip < tips.length - 1) {
      handleTipComplete(tips[currentTip].id);
      setCurrentTip(currentTip + 1);
    } else {
      handleTipComplete(tips[currentTip].id);
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome to CV Studio!</h2>
              <p className="text-white/80 text-sm">Let's get you started</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            {tips.map((tip, index) => (
              <div
                key={tip.id}
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  index <= currentTip ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {React.createElement(tips[currentTip].icon, { 
                  className: "w-8 h-8 text-purple-600" 
                })}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {tips[currentTip].title}
              </h3>
              
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {tips[currentTip].description}
              </p>

              {tips[currentTip].action && (
                <button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                >
                  {tips[currentTip].action}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Skip tutorial
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {currentTip + 1} of {tips.length}
              </span>
              {completedTips.has(tips[currentTip].id) && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OnboardingTips; 