'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Mail } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import PageTitle from '@/components/ui/PageTitle';

const BetaPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/beta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, source: 'joinbeta-page' }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        setEmail('');
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle title="Join Beta" />
      <div className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0"
          >
            <Logo size="md" className="text-white" />
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <motion.h1
              className="text-5xl md:text-7xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Join the{' '}
              <span className="text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.8)]">
                Beta
              </span>
            </motion.h1>
            
            <motion.p
              className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Be among the first to experience the future of CV creation. 
              Get early access to our AI-powered platform and help shape the future of professional success.
            </motion.p>

            <motion.div
              className="flex flex-wrap justify-center gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <div className="flex items-center gap-2 text-lime-400">
                <CheckCircle size={20} />
                <span className="text-white/90">Early Access</span>
              </div>
              <div className="flex items-center gap-2 text-lime-400">
                <CheckCircle size={20} />
                <span className="text-white/90">Exclusive Features</span>
              </div>
              <div className="flex items-center gap-2 text-lime-400">
                <CheckCircle size={20} />
                <span className="text-white/90">Direct Feedback</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Registration Form */}
          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-white/90 text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent backdrop-blur-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    className="text-red-400 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full group relative border-2 border-lime-400/50 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-lime-400/10 transition-all backdrop-blur-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ 
                    scale: 1.02,
                    borderColor: 'rgba(132, 204, 22, 0.8)'
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-lime-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ filter: 'blur(20px)' }}
                  />
                  <div className="relative flex items-center justify-center gap-3">
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-400"></div>
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <span>Join Beta</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </div>
                </motion.button>
              </form>
            ) : (
              <motion.div
                className="text-center space-y-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="text-lime-400" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white">Thank You!</h3>
                <p className="text-white/80">
                  We've received your registration. We'll be in touch soon with early access details.
                </p>
                <motion.button
                  onClick={() => setIsSubmitted(false)}
                  className="text-lime-400 hover:text-lime-300 underline"
                  whileHover={{ scale: 1.05 }}
                >
                  Register another email
                </motion.button>
              </motion.div>
            )}
          </motion.div>

          {/* Additional Info */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <p className="text-white/60 text-sm">
              By registering, you agree to receive updates about our beta program.
              <br />
              We respect your privacy and will never share your email with third parties.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default BetaPage;
