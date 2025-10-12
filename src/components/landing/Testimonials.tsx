'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, TrendingUp, Users, Award, ChevronLeft, ChevronRight } from 'lucide-react';

interface TestimonialData {
  _id: string;
  username: string;
  avatar?: string;
  designation: string;
  company: string;
  starRating: number;
  message: string;
}

interface MetricsData {
  activeUsers: string;
  successRate: string;
  jobsLanded: string;
}

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [metrics, setMetrics] = useState<MetricsData>({
    activeUsers: "50K+",
    successRate: "95%",
    jobsLanded: "10K+"
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(1);

  // Default testimonials as fallback
  const defaultTestimonials = [
    {
      _id: "1",
      username: "Sarah Chen",
      designation: "Software Engineer",
      company: "Google",
      starRating: 5,
      message: "CVCircle helped me land my dream job at Google. The CV builder is incredibly intuitive and professional."
    },
    {
      _id: "2",
      username: "Michael Rodriguez",
      designation: "Product Manager",
      company: "Microsoft",
      starRating: 5,
      message: "The job tracker feature is a game-changer. I can finally keep track of all my applications in one place."
    },
    {
      _id: "3",
      username: "Emily Johnson",
      designation: "UX Designer",
      company: "Amazon",
      starRating: 5,
      message: "The community support is amazing. I got feedback from real HR professionals that helped me improve my resume significantly."
    }
  ];

  const stats = [
    { number: metrics.activeUsers, label: "Active Users", icon: Users },
    { number: metrics.successRate, label: "Success Rate", icon: TrendingUp },
    { number: metrics.jobsLanded, label: "Jobs Landed", icon: Award }
  ];

  useEffect(() => {
    fetchTestimonials();
    fetchMetrics();
    
    // Set cards per view based on screen size
    const updateCardsPerView = () => {
      if (window.innerWidth >= 1024) {
        setCardsPerView(3);
      } else if (window.innerWidth >= 768) {
        setCardsPerView(2);
      } else {
        setCardsPerView(1);
      }
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await fetch('/api/testimonials');
      if (response.ok) {
        const data = await response.json();
        setTestimonials(data.testimonials || defaultTestimonials);
      } else {
        setTestimonials(defaultTestimonials);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      setTestimonials(defaultTestimonials);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + cardsPerView >= testimonials.length ? 0 : prevIndex + cardsPerView
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex - cardsPerView < 0 ? Math.max(0, testimonials.length - cardsPerView) : prevIndex - cardsPerView
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.02
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1
    }
  };

  return (
    <section id="testimonials" className="relative py-32 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0">
        {/* Grid Lines */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(132, 204, 22, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(132, 204, 22, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Grid Dots */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(132, 204, 22, 0.4) 2px, transparent 2px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: '25px 25px'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-black/80"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-lime-400/5 to-blue-400/5 rounded-full blur-3xl"></div>
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
          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 text-center">
            Trusted by job seekers,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              loved by professionals
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Join thousands of successful job seekers who have landed their dream positions using <span className="text-lime-400">CV</span><span className="text-white/70">Circle.io</span>.
          </p>
        </motion.div>

        {/* Enhanced Testimonials Carousel */}
        <motion.div 
          className="relative mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Carousel Container */}
          <div className="relative overflow-hidden">
            <motion.div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ 
                transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
                width: `${(testimonials.length / cardsPerView) * 100}%`
              }}
            >
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial._id}
                  className="group relative flex-shrink-0 px-4"
                  style={{ width: `${100 / testimonials.length}%` }}
                  variants={cardVariants}
                >
                  <motion.div
                    className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 h-full card-hover"
                    whileHover={{ 
                      scale: 1.02,
                      y: -5,
                      boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    style={{ willChange: 'transform' }}
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
                      {testimonial.message}
                    </p>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-6 relative z-10">
                      {[...Array(testimonial.starRating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          whileHover={{ scale: 1.2 }}
                        >
                          <Star size={20} className="text-yellow-400 fill-current" />
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Author Info */}
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center">
                        <span className="text-black font-bold text-lg">
                          {testimonial.username.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg">
                          {testimonial.username}
                        </div>
                        <div className="text-white/60 text-sm">
                          {testimonial.designation} at {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Arrows */}
          {testimonials.length > cardsPerView && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-3 hover:bg-white/20 transition-all duration-300 z-10"
                aria-label="Previous testimonials"
              >
                <ChevronLeft size={24} className="text-white" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-3 hover:bg-white/20 transition-all duration-300 z-10"
                aria-label="Next testimonials"
              >
                <ChevronRight size={24} className="text-white" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {testimonials.length > cardsPerView && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: Math.ceil(testimonials.length / cardsPerView) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index * cardsPerView)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    Math.floor(currentIndex / cardsPerView) === index
                      ? 'bg-lime-400 scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Enhanced Stats - Horizontal for all screens */}
        <motion.div 
          className="flex flex-row justify-center items-center gap-4 sm:gap-8 lg:gap-16"
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
                className="text-center group flex-1"
                whileHover={{ scale: 1.05, y: -10 }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.div 
                  className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-lime-400 to-lime-500 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-6 shadow-2xl"
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
                  <IconComponent size={24} className="text-black sm:w-8 sm:h-8" />
                </motion.div>
                <motion.div 
                  className="text-3xl sm:text-5xl font-bold text-lime-400 mb-2 sm:mb-4"
                  whileHover={{ 
                    scale: 1.1,
                    textShadow: "0 0 30px rgba(132, 204, 22, 0.5)"
                  }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-white/60 text-sm sm:text-lg font-medium">{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
