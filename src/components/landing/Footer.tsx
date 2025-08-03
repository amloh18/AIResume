'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Logo from '../ui/Logo';
import { Twitter, Linkedin, Github, MessageCircle, Mail, ArrowRight, Heart } from 'lucide-react';

const Footer = () => {
  const quickLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Support', href: '#support' },
    { name: 'Blog', href: '#blog' },
  ];

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: '#', color: 'from-blue-400 to-blue-500' },
    { name: 'LinkedIn', icon: Linkedin, href: '#', color: 'from-blue-600 to-blue-700' },
    { name: 'GitHub', icon: Github, href: '#', color: 'from-gray-600 to-gray-700' },
    { name: 'Discord', icon: MessageCircle, href: '#', color: 'from-purple-400 to-purple-500' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <footer className="relative bg-black border-t border-white/10 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-r from-lime-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Column 1: Logo + Mission */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Logo size="lg" className="text-white" />
            </motion.div>
            <p className="text-white/70 leading-relaxed max-w-sm text-lg">
              Empowering job seekers with modern tools to create stunning CVs, 
              track applications, and connect with industry professionals.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon;
                return (
                  <motion.a
                    key={index}
                    href={social.href}
                    className={`group relative w-12 h-12 bg-gradient-to-br ${social.color} rounded-2xl flex items-center justify-center text-white shadow-2xl hover:shadow-xl transition-all duration-300 overflow-hidden`}
                    title={social.name}
                    whileHover={{ 
                      scale: 1.1,
                      rotateY: 15,
                      y: -5,
                      boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.5)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    style={{
                      transformStyle: 'preserve-3d',
                      perspective: '1000px'
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ filter: 'blur(10px)' }}
                    />
                    <IconComponent size={20} className="relative z-10" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Column 2: Quick Links */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-white">Quick Links</h3>
            <ul className="space-y-4">
              {quickLinks.map((link, index) => (
                <motion.li 
                  key={index}
                  whileHover={{ x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(link.href);
                    }}
                    className="text-white/60 hover:text-lime-400 transition-colors duration-300 text-lg font-medium group flex items-center gap-2"
                    whileHover={{ x: 5 }}
                  >
                    <span>{link.name}</span>
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      whileHover={{ rotate: 45 }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </motion.a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Column 3: Newsletter */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-white">Stay Updated</h3>
            <p className="text-white/70 text-lg">
              Get the latest updates on new features and job search tips.
            </p>
            <div className="space-y-6">
              <motion.div 
                className="flex group"
                whileHover={{ scale: 1.02 }}
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                <motion.input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 bg-white/5 border border-white/10 rounded-l-2xl px-6 py-4 text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors duration-300 backdrop-blur-sm"
                  whileFocus={{ scale: 1.02 }}
                />
                <motion.button 
                  className="group relative bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-r-2xl font-semibold hover:shadow-2xl hover:shadow-lime-400/25 transition-all duration-300 overflow-hidden"
                  whileHover={{ 
                    scale: 1.05,
                    rotateY: 5,
                    boxShadow: "0 20px 40px -12px rgba(132, 204, 22, 0.4)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    transformStyle: 'preserve-3d',
                    perspective: '1000px'
                  }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-lime-300 to-lime-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ filter: 'blur(20px)' }}
                  />
                  <motion.div
                    className="relative flex items-center justify-center gap-2"
                    whileHover={{ x: 5 }}
                  >
                    <Mail size={18} />
                    <span>Subscribe</span>
                    <motion.div
                      whileHover={{ rotate: 45 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight size={16} />
                    </motion.div>
                  </motion.div>
                </motion.button>
              </motion.div>
              <p className="text-sm text-white/40">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Bottom Bar */}
        <motion.div 
          className="border-t border-white/10 mt-16 pt-12 flex flex-col md:flex-row justify-between items-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div 
            className="text-white/60 text-sm flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <span>© 2025 CVCircle. All rights reserved.</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Heart size={14} className="text-red-400 fill-current" />
            </motion.div>
          </motion.div>
          <div className="flex space-x-8 mt-6 md:mt-0">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link, index) => (
              <motion.a 
                key={index}
                href="#" 
                className="text-white/60 hover:text-lime-400 text-sm transition-colors duration-300 font-medium"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {link}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
