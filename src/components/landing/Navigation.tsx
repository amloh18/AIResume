'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Logo from '../ui/Logo';
import { Menu, X, ArrowRight } from 'lucide-react';


const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);


  const navLinks = [
    { href: '#hero', label: 'Home' },
    { href: '#features', label: 'Features' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#pricing', label: 'Pricing' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsMenuOpen(false);
  };



  return (
    <>
      {/* Floating Pill Navbar */}
      <motion.nav
        className={`fixed left-4 right-4 z-50 transition-all duration-300 max-w-7xl mx-auto nav-optimized ${
          scrolled ? 'scrolled' : ''
        }`}
        style={{
          position: 'fixed',
          top: scrolled ? '0.5rem' : '2rem',
          borderRadius: '50px',
          border: scrolled ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
          willChange: 'transform, opacity, background-color',
          transform: 'translateZ(0)',
        }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={{ scale: scrolled ? 1.005 : 1.01 }}
      >
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0"
            >
              <Logo size="sm" className="text-white" />
            </motion.div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className="relative text-white/80 hover:text-lime-400 transition-colors font-medium text-sm group px-3 py-2 rounded-full"
                  whileHover={{
                    y: -2,
                    backgroundColor: 'rgba(132, 204, 22, 0.1)'
                  }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {link.label}
                </motion.a>
              ))}
            </div>

            {/* Desktop Login Button */}
            <div className="hidden md:flex items-center">
              <motion.button
                className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 rounded-full font-medium text-sm hover:shadow-lg hover:shadow-lime-400/25 transition-all"
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 10px 25px -5px rgba(132, 204, 22, 0.4)"
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/onboarding'}
              >
                Login
              </motion.button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <motion.button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isMenuOpen ? (
                  <X size={20} className="text-white" />
                ) : (
                  <Menu size={20} className="text-white" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

      </motion.nav>

      {/* Mobile Navigation Dropdown - Optimized */}
      <motion.div
        className="md:hidden fixed left-1/2 transform -translate-x-1/2 z-40 w-80 max-w-[90vw]"
        style={{ top: scrolled ? '4.5rem' : '6rem' }}
        initial={false}
        animate={{
          opacity: isMenuOpen ? 1 : 0,
          y: isMenuOpen ? 0 : -10,
          pointerEvents: isMenuOpen ? 'auto' : 'none'
        }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
      >
        <div className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="space-y-4">
            {navLinks.map((link, index) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.href);
                }}
                className="block px-4 py-3 text-white/80 hover:text-lime-400 transition-colors font-medium text-lg rounded-2xl hover:bg-white/5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 5 }}
              >
                {link.label}
              </motion.a>
            ))}
            <div className="pt-4 border-t border-white/10">
              <motion.button
                className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-3 rounded-2xl font-medium text-lg hover:shadow-lg hover:shadow-lime-400/25 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  window.location.href = '/onboarding';
                  setIsMenuOpen(false);
                }}
              >
                Login
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Navigation;
