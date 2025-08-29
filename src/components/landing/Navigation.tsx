'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Logo from '../ui/Logo';
import { Menu, X } from 'lucide-react';
import LoginModal from '../auth/LoginModal';
import SignupModal from '../onboarding/AuthModal';
import BetaSignupModal from './BetaSignupModal';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(80);
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { href: '#hero', label: 'Home' },
    { href: '#features', label: 'Features' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#pricing', label: 'Pricing' },
  ];

  // Measure navbar height and set CSS variable
  useEffect(() => {
    const updateNavbarHeight = () => {
      const navbar = document.querySelector('nav');
      if (navbar) {
        const height = navbar.offsetHeight;
        setNavbarHeight(height);
        document.documentElement.style.setProperty('--navbar-height', `${height}px`);
      }
    };

    updateNavbarHeight();
    window.addEventListener('resize', updateNavbarHeight);
    return () => window.removeEventListener('resize', updateNavbarHeight);
  }, []);

  // Add scroll effect for navbar opacity
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleLoginSuccess = (userData: any) => {
    setIsLoginModalOpen(false);
    
    // Set flag for new user CV setup (in case they haven't completed onboarding)
    sessionStorage.setItem('needsCVSetup', 'true');
    sessionStorage.setItem('fromLogin', 'true');
    
    // Use router.push instead of window.location.href for better navigation
    window.location.href = '/dashboard';
  };

  const handleSwitchToSignup = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsSignupModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const handleSignupSuccess = (userData: any) => {
    setIsSignupModalOpen(false);
    
    // Set flag for new user CV setup
    sessionStorage.setItem('needsCVSetup', 'true');
    sessionStorage.setItem('fromRegistration', 'true');
    
    // Use router.push instead of window.location.href for better navigation
    window.location.href = '/dashboard';
  };

  return (
    <>
      {/* Transparent Navbar - Part of Hero Banner */}
      <nav className="sticky top-0 z-[1000] px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <div className={`transition-all duration-300 rounded-full px-8 py-4 ${
            scrolled 
              ? 'bg-black/30 backdrop-blur-lg shadow-lg' 
              : 'bg-transparent'
          }`}>
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
                    className="relative text-white/90 hover:text-lime-400 transition-colors font-medium text-base group px-3 py-2 rounded-full"
                    whileHover={{
                      y: -2,
                      backgroundColor: 'rgba(132, 204, 22, 0.1)'
                    }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {link.label}
                  </motion.a>
                ))}
              </div>

              {/* Desktop Login Button */}
              <div className="hidden md:flex items-center space-x-4">
                <motion.button
                  className="border border-white/20 text-white px-6 py-3 rounded-full font-medium text-base hover:bg-white/10 transition-all"
                  whileHover={{
                    scale: 1.05,
                    borderColor: 'rgba(132, 204, 22, 0.5)'
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsBetaModalOpen(true)}
                >
                  Join Beta
                </motion.button>
                <motion.button
                  className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-3 rounded-full font-medium text-base hover:shadow-lg hover:shadow-lime-400/25 transition-all"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 10px 25px -5px rgba(132, 204, 22, 0.4)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLoginClick}
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
                    <X size={24} className="text-white" />
                  ) : (
                    <Menu size={24} className="text-white" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      <motion.div
        className="md:hidden fixed left-1/2 transform -translate-x-1/2 z-[999] w-80 max-w-[90vw]"
        style={{ top: `${navbarHeight + 16}px` }}
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
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 5 }}
              >
                {link.label}
              </motion.a>
            ))}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <motion.button
                className="w-full border border-white/20 text-white px-4 py-3 rounded-2xl font-medium text-lg hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsBetaModalOpen(true);
                  setIsMenuOpen(false);
                }}
              >
                Join Beta
              </motion.button>
              <motion.button
                className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-3 rounded-2xl font-medium text-lg hover:shadow-lg hover:shadow-lime-400/25 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  handleLoginClick();
                  setIsMenuOpen(false);
                }}
              >
                Login
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSwitchToRegister={handleSwitchToSignup}
        onLogin={handleLoginSuccess}
      />

      {/* Signup Modal */}
      <SignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onSuccess={handleSignupSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* Beta Signup Modal */}
      <BetaSignupModal
        isOpen={isBetaModalOpen}
        onClose={() => setIsBetaModalOpen(false)}
      />
    </>
  );
};

export default Navigation;
