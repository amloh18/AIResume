'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, TrendingUp, Users, Award } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "CVCircle helped me land my dream job at Google. The CV builder is incredibly intuitive and the templates are professional.",
      author: "Sarah Chen",
      role: "Software Engineer",
      company: "Google",
      rating: 5
    },
    {
      quote: "The job tracker feature is a game-changer. I can finally keep track of all my applications in one place.",
      author: "Michael Rodriguez",
      role: "Product Manager",
      company: "Microsoft",
      rating: 5
    },
    {
      quote: "The community support is amazing. I got feedback from real HR professionals that helped me improve my resume significantly.",
      author: "Emily Johnson",
      role: "UX Designer",
      company: "Amazon",
      rating: 5
    }
  ];

  const companies = [
    { name: "Google", logo: "🔍", color: "from-blue-500 to-blue-600" },
    { name: "Microsoft", logo: "🪟", color: "from-green-500 to-green-600" },
    { name: "Amazon", logo: "📦", color: "from-orange-500 to-orange-600" },
    { name: "Apple", logo: "🍎", color: "from-gray-500 to-gray-600" },
    { name: "Meta", logo: "📘", color: "from-blue-600 to-blue-700" },
    { name: "Netflix", logo: "📺", color: "from-red-500 to-red-600" }
  ];

  const stats = [
    { number: "50K+", label: "Active Users", icon: Users },
    { number: "95%", label: "Success Rate", icon: TrendingUp },
    { number: "10K+", label: "Jobs Landed", icon: Award }
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
    <section id="testimonials" className="relative py-32 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
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
            Trusted by job seekers,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              loved by professionals
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Join thousands of successful job seekers who have landed their dream positions using CVCircle.
          </p>
        </motion.div>

        {/* Enhanced Testimonials Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="group relative"
              variants={cardVariants}
            >
              <motion.div
                className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full"
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
                  className="absolute inset-0 rounded-3xl bg-gradient-to-br from-lime-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ filter: 'blur(20px)' }}
                />
                
                {/* Quote Icon */}
                <motion.div 
                  className="text-5xl text-lime-400 mb-6"
                  whileHover={{ 
                    scale: 1.2,
                    rotateY: 15,
                    textShadow: "0 0 30px rgba(132, 204, 22, 0.5)"
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <Quote />
                </motion.div>
                
                {/* Quote Text */}
                <p className="text-white/80 text-lg leading-relaxed mb-8 relative z-10">
                  {testimonial.quote}
                </p>
                
                {/* Rating */}
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Star size={20} className="text-lime-400 fill-current" />
                    </motion.div>
                  ))}
                </div>
                
                {/* Author */}
                <div className="flex items-center relative z-10">
                  <motion.div 
                    className="w-14 h-14 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center mr-4 shadow-2xl"
                    whileHover={{ 
                      scale: 1.1,
                      rotateY: 15,
                      boxShadow: "0 10px 30px -10px rgba(132, 204, 22, 0.5)"
                    }}
                    style={{
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                  >
                    <span className="text-black font-bold text-xl">
                      {testimonial.author.charAt(0)}
                    </span>
                  </motion.div>
                  <div>
                    <div className="text-white font-semibold text-lg">{testimonial.author}</div>
                    <div className="text-white/60 text-sm">{testimonial.role}</div>
                    <div className="text-lime-400 text-sm font-medium">{testimonial.company}</div>
                  </div>
                </div>
                
                {/* Border Glow on Hover */}
                <motion.div
                  className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-lime-400/30 transition-all duration-500"
                  style={{
                    background: 'linear-gradient(45deg, transparent, transparent)',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude'
                  }}
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Company Logos */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl font-bold text-white/80 mb-12">
            Where our users work
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {companies.map((company, index) => (
              <motion.div
                key={index}
                className="group cursor-pointer"
                whileHover={{ 
                  scale: 1.1,
                  y: -10,
                  rotateY: 10
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.div 
                  className={`w-16 h-16 bg-gradient-to-br ${company.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl`}
                  whileHover={{ 
                    scale: 1.2,
                    rotateY: 15,
                    boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.5)"
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <span className="text-2xl">{company.logo}</span>
                </motion.div>
                <div className="text-white/60 text-sm font-medium group-hover:text-lime-400 transition-colors duration-300">
                  {company.name}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Stats */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div 
                key={index}
                className="text-center group"
                whileHover={{ scale: 1.05, y: -10 }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-lime-400 to-lime-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
                  whileHover={{ 
                    scale: 1.2,
                    rotateY: 15,
                    boxShadow: "0 20px 40px -12px rgba(132, 204, 22, 0.5)"
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <IconComponent size={32} className="text-black" />
                </motion.div>
                <motion.div 
                  className="text-5xl font-bold text-lime-400 mb-4"
                  whileHover={{ 
                    scale: 1.1,
                    textShadow: "0 0 30px rgba(132, 204, 22, 0.5)"
                  }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-white/60 text-lg font-medium">{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
