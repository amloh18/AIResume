'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight, Brain, Users, Crown } from 'lucide-react';

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('essential'); // 'essential' or 'pro'

  const essentialPlans = [
    {
      name: 'Free Plan',
      price: '€0',
      period: '',
      description: 'First-time users, casual job seekers',
      features: [
        'Create & edit up to 3 CVs',
        '1 export',
        'Basic design snippets'
      ],
      notIncluded: [
        'AI Assistant',
        'Cover Letter Generator',
        'Job Tracker',
        'Community Access'
      ],
      popular: false,
      color: 'from-green-400 to-green-500',
      glowColor: 'from-green-400/20 to-green-500/20',
      icon: Brain
    },
    {
      name: 'Day Pass',
      price: '€2.99',
      period: 'valid for 24 hours',
      description: 'Quick job applications, one-day polishers',
      features: [
        '5 CV exports',
        'AI Assistant included',
        'Cover Letter Generation',
        'Limited Style Snippets'
      ],
      notIncluded: [
        'Job Tracker',
        'Community Access'
      ],
      popular: true,
      color: 'from-blue-400 to-blue-500',
      glowColor: 'from-blue-400/20 to-blue-500/20',
      icon: Star
    }
  ];

  const proPlans = [
    {
      name: 'Monthly Pro',
      price: '€19',
      period: 'per month',
      description: 'Active job seekers needing all tools',
      features: [
        'Unlimited CVs & Exports',
        'AI Assistant + Cover Letters',
        'Full Job Tracker Access',
        'All Style Snippets',
        'Community Access (read-only)',
        'Standard Email Support'
      ],
      notIncluded: [],
      popular: false,
      color: 'from-yellow-400 to-yellow-500',
      glowColor: 'from-yellow-400/20 to-yellow-500/20',
      icon: Crown
    },
    {
      name: 'Quarterly Pro',
      price: '€49',
      period: 'per 3 months',
      description: 'Consistent job hunting or portfolio building',
      features: [
        'Everything in Monthly, plus:',
        'Mock Interview Access',
        'Community Participation',
        'Priority Email Support'
      ],
      notIncluded: [],
      popular: true,
      color: 'from-orange-400 to-orange-500',
      glowColor: 'from-orange-400/20 to-orange-500/20',
      icon: Users
    },
    {
      name: 'Annual Pro',
      price: '€120',
      period: 'per year',
      description: 'Long-term career builders or professionals',
      features: [
        'All features unlocked, including:',
        'Early job access in community',
        'Unlimited everything',
        'Premium Support',
        'Future Pro Add-ons included'
      ],
      notIncluded: [],
      popular: false,
      color: 'from-red-400 to-red-500',
      glowColor: 'from-red-400/20 to-red-500/20',
      icon: Crown
    }
  ];

  const plans = useMemo(() => {
    return selectedCategory === 'essential' ? essentialPlans : proPlans;
  }, [selectedCategory]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 50, 
      rotateX: -10,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0,
      scale: 1
    }
  };

  return (
    <section id="pricing" className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black overflow-hidden py-16 pt-32">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-black"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Pricing
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            {selectedCategory === 'essential' 
              ? 'Get started, test the tools, or make a quick move — no long-term commitment needed.'
              : 'Everything unlocked. Built for power users, pros, and anyone serious about landing the next opportunity.'
            }
          </p>
        </motion.div>

        {/* Pricing Toggle */}
        <motion.div 
          className="flex justify-center items-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center space-x-4">
            <span className={`text-sm font-medium transition-colors duration-300 ${selectedCategory === 'essential' ? 'text-white' : 'text-white/60'}`}>
              Essential Access
            </span>
            <button
              onClick={() => setSelectedCategory(selectedCategory === 'essential' ? 'pro' : 'essential')}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                selectedCategory === 'pro' ? 'bg-lime-400' : 'bg-gray-600'
              }`}
            >
              <motion.span
                className="absolute inline-block h-6 w-6 rounded-full bg-white shadow-lg"
                animate={{
                  x: selectedCategory === 'pro' ? 32 : 4
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                layout
              />
            </button>
            <span className={`text-sm font-medium transition-colors duration-300 ${selectedCategory === 'pro' ? 'text-white' : 'text-white/60'}`}>
              Pro Access
              {selectedCategory === 'pro' && (
                <Crown size={16} className="inline ml-2 text-lime-400" />
              )}
            </span>
          </div>
        </motion.div>

        {/* Enhanced Pricing Cards */}
        <motion.div 
          key={selectedCategory}
          className={`grid grid-cols-1 md:grid-cols-2 ${selectedCategory === 'essential' ? 'lg:grid-cols-2 max-w-4xl' : 'lg:grid-cols-3 max-w-6xl'} gap-6 lg:gap-8 mx-auto`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <motion.div
                key={`${plan.name}-${selectedCategory}`}
                className="relative group"
                variants={cardVariants}
                style={{
                  zIndex: plans.length - index,
                  transform: `translateY(${index * 10}px)`
                }}
              >
                <motion.div
                  className={`relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 h-full min-h-[600px] flex flex-col ${
                    plan.popular ? 'ring-2 ring-lime-400/50 shadow-2xl shadow-lime-400/20' : ''
                  }`}
                  whileHover={{ 
                    scale: 1.02,
                    rotateY: 3,
                    rotateX: 3,
                    y: -5,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  {/* Glow Effect */}
                  <motion.div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${plan.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    style={{ filter: 'blur(30px)' }}
                  />
                  
                  {/* Popular Badge */}
                  {plan.popular && (
                    <motion.div 
                      className="absolute top-0 right-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    >
                      <div className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-3 py-1 rounded-bl-3xl rounded-tr-3xl text-xs font-bold shadow-2xl">
                        <Star size={12} className="inline mr-1" />
                        Most Popular
                      </div>
                    </motion.div>
                  )}

                  {/* Plan Name and Icon */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <motion.div 
                        className={`w-10 h-10 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center shadow-2xl`}
                        whileHover={{ 
                          scale: 1.1,
                          rotateY: 15,
                          boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)"
                        }}
                        style={{
                          transformStyle: 'preserve-3d',
                          perspective: '1000px'
                        }}
                      >
                        <IconComponent size={20} className="text-white" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    </div>
                    <div className="text-base text-white/60 font-medium">{plan.description}</div>
                  </div>

                  {/* Price with 3D Effect */}
                  <motion.div 
                    className="text-center mb-6"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-5xl font-bold text-white mb-2" style={{
                      textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
                    }}>
                      {plan.price}
                    </div>
                    <div className="text-white/60 text-base">{plan.period}</div>
                  </motion.div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <motion.div 
                        key={`${plan.name}-feature-${fIndex}`}
                        className="flex items-center"
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center mr-3 shadow-lg">
                          <Check size={12} className="text-black font-bold" />
                        </div>
                        <span className="text-white/80 text-base">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Not Included */}
                  {plan.notIncluded.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h4 className="text-base font-semibold text-white/60 mb-2">Not Included:</h4>
                      <ul className="space-y-2 text-white/60 text-base">
                        {plan.notIncluded.map((item, niIndex) => (
                          <li key={`${plan.name}-not-included-${niIndex}`} className="flex items-center">
                            <span className="mr-2">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Enhanced CTA Button */}
                  {plan.price !== '€0' && (
                    <motion.button 
                      className={`group relative w-full py-4 px-6 rounded-full font-semibold text-base transition-all duration-300 overflow-hidden mt-auto ${
                        plan.popular
                          ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-black shadow-2xl shadow-lime-400/25'
                          : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-xl'
                      }`}
                      whileHover={{ 
                        scale: 1.02,
                        rotateY: 3,
                        boxShadow: plan.popular 
                          ? "0 25px 50px -12px rgba(132, 204, 22, 0.4)"
                          : "0 20px 40px -12px rgba(0, 0, 0, 0.5)"
                      }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                      }}
                    >
                      <motion.div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                          plan.popular 
                            ? 'bg-gradient-to-r from-lime-300 to-lime-400' 
                            : 'bg-gradient-to-r from-gray-600 to-gray-700'
                        }`}
                        style={{ filter: 'blur(20px)' }}
                      />
                      <motion.div
                        className="relative flex items-center justify-center gap-2"
                        whileHover={{ x: 5 }}
                      >
                        <span>Subscribe Now</span>
                        <motion.div
                          whileHover={{ rotate: 45 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ArrowRight size={16} />
                        </motion.div>
                      </motion.div>
                    </motion.button>
                  )}

                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Enhanced Bottom CTA */}
        <motion.div 
          className="text-center mt-12 lg:mt-16"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-white/60 mb-4 lg:mb-6 text-base lg:text-lg">Have questions about pricing?</p>
          <motion.button 
            className="group text-lime-400 hover:text-lime-300 font-semibold transition-colors duration-300 flex items-center gap-2 mx-auto"
            whileHover={{ x: 5 }}
          >
            <span>Contact our sales team</span>
            <motion.div
              whileHover={{ rotate: 45 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight size={16} />
            </motion.div>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
