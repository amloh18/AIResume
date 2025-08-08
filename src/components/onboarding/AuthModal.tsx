'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, AlertCircle, User, ArrowRight, Sparkles } from 'lucide-react';
import { signIn, getSession } from 'next-auth/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
  selectedRole?: string;
}

export default function AuthModal({ isOpen, onClose, onSuccess, selectedRole }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  // Registration form state
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: loginData.email,
        password: loginData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        const session = await getSession();
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            image: session.user.image
          };
          localStorage.setItem('user', JSON.stringify(userData));
          onSuccess(userData);
        } else {
          setError('Failed to establish session. Please try again.');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (registerData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          role: selectedRole || 'user'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const userData = {
          id: result.data.user._id,
          email: result.data.user.email,
          name: `${result.data.user.firstName} ${result.data.user.lastName}`,
          firstName: result.data.user.firstName,
          lastName: result.data.user.lastName
        };
        localStorage.setItem('user', JSON.stringify(userData));
        onSuccess(userData);
      } else {
        const errorResult = await response.json();
        if (response.status === 409) {
          setError('Email already exists. Please use a different email or try logging in.');
        } else {
          setError(errorResult.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setError('');
      setLoginData({ email: '', password: '' });
      setRegisterData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-500 rounded-lg flex items-center justify-center">
                  <Sparkles size={16} className="text-black" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Toggle */}
              <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isLogin 
                      ? 'bg-lime-400 text-black shadow-lg' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !isLogin 
                      ? 'bg-lime-400 text-black shadow-lg' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}

              {/* Login Form */}
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.form
                    key="login"
                    onSubmit={handleLogin}
                    className="space-y-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Enter your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register"
                    onSubmit={handleRegister}
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                          <input
                            type="text"
                            value={registerData.firstName}
                            onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                            placeholder="First name"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Last name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Create a password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-lime-400 to-lime-500 text-black py-3 rounded-lg font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
