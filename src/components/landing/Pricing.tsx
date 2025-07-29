'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: 'Basic',
      price: '$19',
      period: '/month',
      seats: '3 seats available',
      storage: '500GB of cloud storage',
      trial: '7 DAYS FOR FREE',
      popular: false,
      color: 'from-gray-600 to-gray-700',
      glowColor: 'from-gray-400/20 to-gray-500/20'
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      seats: '9 seats available',
      storage: '1TB of cloud storage',
      trial: '14 DAYS FOR FREE',
      popular: true,
      color: 'from-gray-600 to-gray-700',
      glowColor: 'from-gray-400/20 to-gray-500/20'
    },
    {
      name: 'Unlimited',
      price: '$40',
      period: '/month',
      seats: 'Unlimited seats available',
      storage: 'Unlimited cloud storage',
      trial: '30 DAYS FOR FREE',
      popular: false,
      color: 'from-yellow-400 to-yellow-500',
      glowColor: 'from-yellow-400/30 to-yellow-500/30'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 100, 
      rotateX: -15,
      scale: 0.8
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="pricing" className="relative py-32 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-black"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8">
            Pricing
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Free forever. Upgrade for unlimited seats, more cloud storage, and exclusive features.
          </p>
        </motion.div>

        {/* Enhanced Pricing Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className="relative group"
              variants={cardVariants}
              style={{
                zIndex: plans.length - index,
                transform: `translateY(${index * 10}px)`
              }}
            >
              <motion.div
                className={`relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full ${
                  plan.popular ? 'ring-2 ring-lime-400/50 shadow-2xl shadow-lime-400/20' : ''
                }`}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 5,
                  rotateX: 5,
                  y: -10,
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
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  >
                    <div className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-3 rounded-full text-sm font-bold shadow-2xl">
                      <Star size={16} className="inline mr-2" />
                      Most Popular
                    </div>
                  </motion.div>
                )}

                {/* Marketly Logo Placeholder */}
                <div className="flex items-center mb-8">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                  <span className="text-white/60 font-semibold">Marketly</span>
                </div>

                {/* 3D Abstract Metallic Graphic */}
                <motion.div 
                  className={`absolute top-6 right-6 w-16 h-16 bg-gradient-to-br ${plan.color} rounded-lg opacity-60`}
                  whileHover={{ 
                    scale: 1.2,
                    rotateY: 15,
                    rotateX: 15
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  {index === 0 && (
                    <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg transform rotate-45 scale-75"></div>
                  )}
                  {index === 1 && (
                    <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg">
                      <div className="w-3 h-3 bg-gray-400 rounded-sm absolute top-2 left-2"></div>
                      <div className="w-3 h-3 bg-gray-400 rounded-sm absolute top-2 right-2"></div>
                      <div className="w-3 h-3 bg-gray-400 rounded-sm absolute bottom-2 left-2"></div>
                      <div className="w-3 h-3 bg-gray-400 rounded-sm absolute bottom-2 right-2"></div>
                    </div>
                  )}
                  {index === 2 && (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full relative">
                      <div className="absolute inset-2 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full"></div>
                      <div className="absolute inset-4 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-full"></div>
                    </div>
                  )}
                </motion.div>

                {/* Plan Name */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                </div>

                {/* Price with 3D Effect */}
                <motion.div 
                  className="text-center mb-8"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-6xl font-bold text-white mb-2" style={{
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
                  }}>
                    {plan.price}
                  </div>
                  <div className="text-white/60">{plan.period}</div>
                </motion.div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  <motion.div 
                    className="flex items-center"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center mr-3 shadow-lg">
                      <Check size={12} className="text-black font-bold" />
                    </div>
                    <span className="text-white/80">{plan.seats}</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center mr-3 shadow-lg">
                      <Check size={12} className="text-black font-bold" />
                    </div>
                    <span className="text-white/80">{plan.storage}</span>
                  </motion.div>
                </div>

                {/* Trial */}
                <div className="text-center mb-8">
                  <div className="text-sm text-white/60 font-semibold tracking-wider">{plan.trial}</div>
                </div>

                {/* Enhanced CTA Button */}
                <motion.button 
                  className={`group relative w-full py-4 px-6 rounded-full font-semibold text-lg transition-all duration-300 overflow-hidden ${
                    plan.popular
                      ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-black shadow-2xl shadow-lime-400/25'
                      : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-xl'
                  }`}
                  whileHover={{ 
                    scale: 1.05,
                    rotateY: 5,
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

                {/* Guarantee */}
                <div className="text-center mt-6">
                  <div className="text-sm text-white/60">30-day money-back guarantee</div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Bottom CTA */}
        <motion.div 
          className="text-center mt-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <p className="text-white/60 mb-6 text-lg">Have questions about pricing?</p>
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
