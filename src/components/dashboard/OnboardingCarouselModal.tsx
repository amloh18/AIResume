'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Target, 
  Sparkles, 
  Plus,
  ArrowRight,
  CheckCircle,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OnboardingCarouselModalProps {
  userId: string;
}

const OnboardingCarouselModal: React.FC<OnboardingCarouselModalProps> = ({ userId }) => {
  const router = useRouter();
  const [currentCard, setCurrentCard] = useState(0);
  const [visitedCards, setVisitedCards] = useState<boolean[]>([false, false, false, false]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mark current card as visited
  useEffect(() => {
    const newVisitedCards = [...visitedCards];
    newVisitedCards[currentCard] = true;
    setVisitedCards(newVisitedCards);
  }, [currentCard]);

  const cards = [
    {
      id: 'journey-cards',
      title: 'Journey Cards',
      subtitle: 'Link Documents to Applications',
      description: 'Connect your CVs and cover letters directly to job applications for seamless tracking and management.',
      icon: FileText,
      features: [
        'Upload and organize your documents',
        'Link CVs to specific job applications',
        'Track application status with visual cards',
        'Never lose track of your applications again'
      ],
      image: '/images/onboarding/journey-cards-demo.svg',
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'application-tracker',
      title: 'Application Tracker',
      subtitle: 'Download Our Extension',
      description: 'Install our browser extension to automatically track job applications across all major job boards.',
      icon: Target,
      features: [
        'One-click application tracking',
        'Works with LinkedIn, Indeed, Glassdoor',
        'Automatic job details extraction',
        'Real-time application status updates'
      ],
      image: '/images/onboarding/extension-tracker.svg',
      color: 'from-green-500 to-teal-600'
    },
    {
      id: 'career-report',
      title: 'Career Report',
      subtitle: 'AI-Powered Insights',
      description: 'Get personalized career analysis and recommendations powered by advanced AI technology.',
      icon: Sparkles,
      features: [
        'AI analysis of your experience level',
        'Personalized career path recommendations',
        'Skills gap identification',
        'Strategic career advice'
      ],
      image: '/images/onboarding/career-report-preview.svg',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'master-cv',
      title: 'Master CV',
      subtitle: 'Your Career Foundation',
      description: 'Create your comprehensive Master CV that serves as the foundation for all your job applications.',
      icon: Plus,
      features: [
        'Comprehensive CV builder',
        'AI-powered content optimization',
        'Multiple template options',
        'ATS-friendly formatting'
      ],
      image: '/images/onboarding/master-cv-benefits.svg',
      color: 'from-lime-500 to-green-600'
    }
  ];

  const nextCard = () => {
    if (currentCard < cards.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentCard(currentCard + 1);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const prevCard = () => {
    if (currentCard > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentCard(currentCard - 1);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleCreateMasterCV = () => {
    // Set flag to indicate user is coming from onboarding
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fromOnboarding', 'true');
    }
    router.push('/ai-career-report');
  };

  const allCardsVisited = visitedCards.every(visited => visited);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-[#1A261A] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-lime-400 to-lime-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">CV</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome to CVCircle</h2>
              <p className="text-white/60 text-sm">Let's get you started</p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {cards.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentCard 
                    ? 'bg-lime-400 w-8' 
                    : visitedCards[index] 
                      ? 'bg-lime-400/50' 
                      : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Content */}
        <div className="relative h-[500px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-0 flex"
            >
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
                  {/* Left Side - Content */}
                  <div className="flex flex-col justify-center space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 bg-gradient-to-r ${cards[currentCard].color} rounded-xl flex items-center justify-center`}>
                        {React.createElement(cards[currentCard].icon, { className: "w-8 h-8 text-white" })}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{cards[currentCard].title}</h3>
                        <p className="text-lime-400 font-medium">{cards[currentCard].subtitle}</p>
                      </div>
                    </div>

                    <p className="text-white/80 text-lg leading-relaxed">
                      {cards[currentCard].description}
                    </p>

                    <div className="space-y-3">
                      {cards[currentCard].features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3"
                        >
                          <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0" />
                          <span className="text-white/70">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side - Image */}
                  <div className="flex items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="relative"
                    >
                      <div className="w-full h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                        <img
                          src={cards[currentCard].image}
                          alt={`${cards[currentCard].title} preview`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <motion.button
            onClick={prevCard}
            disabled={currentCard === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              currentCard === 0
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            whileHover={currentCard > 0 ? { scale: 1.05 } : {}}
            whileTap={currentCard > 0 ? { scale: 0.95 } : {}}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </motion.button>

          <div className="flex items-center gap-2">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentCard(index);
                    setIsTransitioning(false);
                  }, 150);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentCard 
                    ? 'bg-lime-400' 
                    : visitedCards[index] 
                      ? 'bg-lime-400/50 hover:bg-lime-400/70' 
                      : 'bg-white/20 hover:bg-white/30'
                }`}
              />
            ))}
          </div>

          {currentCard === cards.length - 1 ? (
            <motion.button
              onClick={handleCreateMasterCV}
              disabled={!allCardsVisited}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                allCardsVisited
                  ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-black hover:from-lime-300 hover:to-lime-400'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              whileHover={allCardsVisited ? { scale: 1.05 } : {}}
              whileTap={allCardsVisited ? { scale: 0.95 } : {}}
            >
              Create Master CV
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              onClick={nextCard}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingCarouselModal;
