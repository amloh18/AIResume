'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, User, Mail, Phone, MapPin, Globe, ArrowRight, X } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { AICVParser } from '@/lib/services/aiCVParser';

interface PersonalInfoStepProps {
  onNext: () => void;
}

export default function PersonalInfoStep({ onNext }: PersonalInfoStepProps) {
  const { state, dispatch } = useOnboarding();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');

    try {
      const result = await AICVParser.parseCV(file);
      
      if (result.success && result.data) {
        dispatch({ type: 'UPDATE_CV_DATA', payload: result.data });
        setShowUpload(false);
        // Auto-fill the form with parsed data
        if (result.data.basics) {
          // Update form fields with parsed data
          const basics = result.data.basics;
          // You can add more auto-fill logic here
        }
      } else {
        setUploadError(result.error || 'Failed to parse CV');
      }
    } catch (error) {
      setUploadError('An error occurred while parsing the CV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        basics: {
          ...state.cvData.basics,
          [field]: value
        }
      }
    });
  };

  const handleLocationChange = (field: string, value: string) => {
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        basics: {
          ...state.cvData.basics,
          location: {
            ...state.cvData.basics.location,
            [field]: value
          }
        }
      }
    });
  };

  const handleNext = () => {
    // Validate required fields
    if (!state.cvData.basics.name || !state.cvData.basics.email) {
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Personal Information
        </h2>
        <p className="text-xl text-white/60">
          Tell us about yourself and upload your existing CV if you have one
        </p>
      </motion.div>

      {/* CV Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <FileText size={32} className="text-lime-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">Upload Your CV</h3>
          <p className="text-white/60">
            Upload your existing CV to automatically fill in the form, or start from scratch
          </p>
          
          {!showUpload ? (
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-6 py-3 rounded-xl font-semibold hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25"
            >
              Upload CV
            </button>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-center space-y-4">
                  <Upload size={48} className="text-white/40 mx-auto" />
                  <div>
                    <p className="text-white font-medium">Drop your CV here or click to browse</p>
                    <p className="text-white/60 text-sm">Supports PDF, DOC, DOCX, and TXT files</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Processing...' : 'Choose File'}
                  </button>
                </div>
              </div>
              
              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {uploadError}
                </div>
              )}
              
              <button
                onClick={() => setShowUpload(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                Or start from scratch →
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Personal Information Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
      >
        <h3 className="text-2xl font-bold text-white mb-6">Personal Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={state.cvData.basics.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>

          {/* Professional Title */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Professional Title
            </label>
            <input
              type="text"
              value={state.cvData.basics.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
              placeholder="e.g., Software Engineer, Marketing Manager"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="email"
                value={state.cvData.basics.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                placeholder="Enter your email address"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="tel"
                value={state.cvData.basics.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Website
            </label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="url"
                value={state.cvData.basics.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                placeholder="https://your-website.com"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              City
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={state.cvData.basics.location.city}
                onChange={(e) => handleLocationChange('city', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                placeholder="Enter your city"
              />
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        <div className="mt-6">
          <label className="block text-white/80 text-sm font-medium mb-2">
            Professional Summary
          </label>
          <textarea
            value={state.cvData.basics.summary}
            onChange={(e) => handleInputChange('summary', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200 resize-none"
            rows={4}
            placeholder="Write a brief professional summary about yourself..."
          />
        </div>
      </motion.div>

      {/* Next Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center"
      >
        <button
          onClick={handleNext}
          disabled={!state.cvData.basics.name || !state.cvData.basics.email}
          className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
        >
          Continue to Experience
          <ArrowRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}
