'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from '../ui/Logo';
import { X, Linkedin, Instagram, Mail, ArrowRight, Heart, CheckCircle, AlertCircle, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const quickLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Support', href: '#support' },
    { name: 'Blog', href: '#blog' },
  ];

  const socialLinks = [
    { name: 'X', icon: X, href: 'https://x.com/buildairesume' },
    { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/buildairesume.com/' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/build-ai-resume/' },
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

  const handleNewsletterSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setSubscriptionStatus('error');
      setStatusMessage('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);
    setSubscriptionStatus('idle');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          source: 'footer'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscriptionStatus('success');
        setStatusMessage(data.message);
        setEmail('');
      } else {
        setSubscriptionStatus('error');
        setStatusMessage(data.error || 'Failed to subscribe');
      }
    } catch (error) {
      setSubscriptionStatus('error');
      setStatusMessage('Network error. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="relative bg-[#060709] border-t border-white/[0.06] overflow-hidden">
      {/* Background Effects - Subtle dark ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(1, 63, 46, 0.18) 0%, transparent 70%)'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 py-20">
        <motion.div
          className="grid grid-cols-2 tablet:grid-cols-2 desktop:grid-cols-4 gap-4 tablet:gap-6"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Column 1: Contact Details (Mobile: Column 1) */}
          <motion.div
            className="space-y-4 tablet:space-y-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-body tablet:text-h3 font-bold text-white mb-4 tablet:mb-6">Contact Us</h3>

            <div className="space-y-4 tablet:space-y-6">
              {/* Email */}
              <motion.div
                className="flex items-center space-x-2 tablet:space-x-4 group"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="w-8 h-8 tablet:w-10 tablet:h-10 bg-[#0c1a14] border border-emerald-500/25 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  whileHover={{
                    scale: 1.1,
                    boxShadow: "0 10px 25px -5px rgba(1, 63, 46, 0.5)"
                  }}
                >
                  <Mail className="w-3.5 h-3.5 tablet:w-[18px] tablet:h-[18px] text-[#36D39B]" />
                </motion.div>
                <div>
                  <p className="text-white/60 text-small tablet:text-small">Email</p>
                  <a
                    href="mailto:support@buildairesume.com"
                    className="text-white hover:text-[#36D39B] transition-colors duration-300 font-medium text-small tablet:text-small break-all"
                  >
                    support@buildairesume.com
                  </a>
                </div>
              </motion.div>

              {/* Phone */}
              <motion.div
                className="flex items-center space-x-2 tablet:space-x-4 group"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="w-8 h-8 tablet:w-10 tablet:h-10 bg-[#0c1a14] border border-emerald-500/25 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  whileHover={{
                    scale: 1.1,
                    boxShadow: "0 10px 25px -5px rgba(1, 63, 46, 0.5)"
                  }}
                >
                  <Phone className="w-3.5 h-3.5 tablet:w-[18px] tablet:h-[18px] text-[#36D39B]" />
                </motion.div>
                <div>
                  <p className="text-white/60 text-small tablet:text-small">Phone</p>
                  <a
                    href="tel:+447879768984"
                    className="text-white hover:text-[#36D39B] transition-colors duration-300 font-medium text-small tablet:text-small"
                  >
                    +44 7879768984
                  </a>
                </div>
              </motion.div>

              {/* Address */}
              <motion.div
                className="flex items-center space-x-2 tablet:space-x-4 group"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="w-8 h-8 tablet:w-10 tablet:h-10 bg-[#0c1a14] border border-emerald-500/25 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  whileHover={{
                    scale: 1.1,
                    boxShadow: "0 10px 25px -5px rgba(1, 63, 46, 0.5)"
                  }}
                >
                  <MapPin className="w-3.5 h-3.5 tablet:w-[18px] tablet:h-[18px] text-[#36D39B]" />
                </motion.div>
                <div>
                  <p className="text-white/60 text-small tablet:text-small">Address</p>
                  <p className="text-white font-medium text-small tablet:text-body">
                    London, England
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Column 2: Quick Links (Mobile: Column 2) */}
          <motion.div
            className="space-y-4 tablet:space-y-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-body tablet:text-h3 font-bold text-white mb-4 tablet:mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <motion.li
                  key={index}
                  className="flex"
                  whileHover={{ x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(link.href);
                    }}
                    className="text-white/60 hover:text-[#36D39B] transition-colors duration-300 text-small font-medium group flex items-center gap-2"
                    whileHover={{ x: -5 }}
                  >
                    <span>{link.name}</span>
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      whileHover={{ rotate: 45 }}
                    >
                      <ArrowRight size={14} />
                    </motion.div>
                  </motion.a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Column 3: Logo + Mission (Mobile: Full width below) */}
          <motion.div
            className="space-y-8 col-span-2 tablet:col-span-1"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="flex items-center justify-center flex-shrink-0 rounded-xl overflow-hidden">
                <Logo size="lg" />
              </div>
            </motion.div>
            <p className="text-white/70 leading-relaxed max-w-sm text-body">
              Empowering job seekers with modern tools to create stunning resumes
              and CVs, tailor them to any job, track applications, and connect
              with industry professionals.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon;
                return (
                  <motion.a
                    key={index}
                    href={social.href}
                    className="group relative w-12 h-12 bg-[#0c1a14] border border-emerald-500/25 rounded-2xl flex items-center justify-center text-[#36D39B] shadow-lg transition-all duration-300 overflow-hidden"
                    title={social.name}
                    whileHover={{
                      scale: 1.1,
                      boxShadow: "0 10px 25px -5px rgba(1, 63, 46, 0.5)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-[#36D39B]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ filter: 'blur(10px)' }}
                    />
                    <IconComponent size={20} className="relative z-10" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Column 4: Newsletter */}
          <motion.div
            className="space-y-8 col-span-2 tablet:col-span-1"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-h3 font-bold text-white">Stay Updated</h3>
            <p className="text-white/70 text-body">
              Get the latest updates on new features and job search tips.
            </p>
            <form onSubmit={handleNewsletterSubscription} className="space-y-3">
              <motion.input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-lime-400 transition-colors duration-300 backdrop-blur-sm text-small"
                whileFocus={{ scale: 1.02 }}
                disabled={isSubscribing}
              />

              <motion.button
                type="submit"
                disabled={isSubscribing}
                className="w-full group relative bg-[#013f2e] hover:bg-[#025c43] text-white px-3 py-2 rounded-xl font-bold shadow-lg transition-colors duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{
                  scale: isSubscribing ? 1 : 1.02,
                  boxShadow: isSubscribing ? "none" : "0 10px 25px -5px rgba(1, 63, 46, 0.5)"
                }}
                whileTap={{ scale: isSubscribing ? 1 : 0.98 }}
              >
                <motion.div
                  className="relative flex items-center justify-center gap-2"
                  whileHover={{ x: isSubscribing ? 0 : 3 }}
                >
                  {isSubscribing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Mail size={12} />
                    </motion.div>
                  ) : (
                    <Mail size={12} />
                  )}
                  <span className="text-small">{isSubscribing ? 'Subscribing...' : 'Subscribe'}</span>
                  {!isSubscribing && (
                    <motion.div
                      whileHover={{ rotate: 45 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight size={10} />
                    </motion.div>
                  )}
                </motion.div>
              </motion.button>

              {/* Status Message */}
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 text-small ${subscriptionStatus === 'success'
                    ? 'text-lime-400'
                    : subscriptionStatus === 'error'
                      ? 'text-red-400'
                      : 'text-white/60'
                    }`}
                >
                  {subscriptionStatus === 'success' && <CheckCircle size={16} />}
                  {subscriptionStatus === 'error' && <AlertCircle size={16} />}
                  {statusMessage}
                </motion.div>
              )}

              <p className="text-small text-white/40">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </form>
          </motion.div>

        </motion.div>

        {/* Enhanced Bottom Bar */}
        <motion.div
          className="border-t border-white/10 mt-16 pt-12 flex flex-col tablet:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="text-white/60 text-small flex flex-col tablet:flex-row items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <span>© 2026 <span className="text-[#36D39B] font-bold">AIResume</span> by <span className="text-white">Morigrid Labs</span>. All rights reserved.</span>
            <div className="flex items-center gap-2">
              <span className="text-white/40 hidden tablet:inline">|</span>
              <span className="text-white/60">Made with love</span>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Heart size={14} className="text-red-500 fill-current" />
              </motion.div>
            </div>
          </motion.div>

          <div className="flex space-x-8">
            <motion.a
              href="/legal#privacy"
              className="text-white/60 hover:text-[#36D39B] text-small transition-colors duration-300 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Privacy Policy
            </motion.a>
            <motion.a
              href="/legal#terms"
              className="text-white/60 hover:text-[#36D39B] text-small transition-colors duration-300 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Terms of Service
            </motion.a>
            <motion.a
              href="/legal#cookies"
              className="text-white/60 hover:text-[#36D39B] text-small transition-colors duration-300 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Cookie Policy
            </motion.a>
            <motion.a
              href="/legal#support"
              className="text-white/60 hover:text-[#36D39B] text-small transition-colors duration-300 font-medium"
              whileTap={{ scale: 0.95 }}
            >
              Support
            </motion.a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
