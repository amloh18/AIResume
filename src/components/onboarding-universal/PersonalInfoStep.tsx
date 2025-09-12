'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle,
  Loader2
} from 'lucide-react';

interface PersonalInfoStepProps {
  cvData: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

export default function PersonalInfoStep({ cvData, onUpdate, onNext }: PersonalInfoStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse CV');
      }
      
      const result = await response.json();
      
      if (result.personalInfo) {
        // Update CV data with parsed information
        onUpdate({
          basics: {
            ...cvData.basics,
            ...result.personalInfo
          }
        });
        
        setShowUpload(false);
        setIsProcessing(true);
        
        // Show success message briefly, then flip the card
        setTimeout(() => {
          setIsProcessing(false);
          if (!isFlipped) {
            setIsFlipped(true);
          }
        }, 2000);
      } else {
        setUploadError('Failed to parse CV data');
      }
    } catch (error) {
      console.error('CV parsing error:', error);
      setUploadError(error instanceof Error ? error.message : 'An error occurred while parsing the CV');
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
    onUpdate({
      basics: {
        ...cvData.basics,
        [field]: value
      }
    });
  };

  const handleLocationChange = (field: string, value: string) => {
    onUpdate({
      basics: {
        ...cvData.basics,
        location: {
          ...cvData.basics.location,
          [field]: value
        }
      }
    });
  };

  const handleNext = () => {
    // Validate required fields
    if (!cvData.basics.name || !cvData.basics.email) {
      return;
    }
    onNext();
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setShowUpload(false);
    setUploadError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4">
      <div className="w-full max-w-4xl flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Get a Head Start
          </h2>
          <p className="text-xl text-white/60">
            Upload your existing CV to automatically fill in your details, or start from scratch
          </p>
        </motion.div>

        {/* Card Container */}
        <div className="w-full max-w-2xl mb-8">
          {/* Flippable Card Container */}
          <div className="relative perspective-1000">
            <motion.div
              className="relative w-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front Side - CV Upload/Parsing */}
              <motion.div
                className="absolute w-full backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 min-h-[500px] flex flex-col justify-center">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-2xl flex items-center justify-center mx-auto">
                      <FileText size={40} className="text-lime-400" />
                    </div>
                    <h3 className="text-3xl font-bold text-white">Upload & Parse CV</h3>
                    <p className="text-white/60 text-lg max-w-md mx-auto">
                      Upload your existing CV to automatically fill in your details, or start from scratch
                    </p>
                    
                    {!showUpload ? (
                      <div className="space-y-4">
                        <button
                          onClick={() => setShowUpload(true)}
                          className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25"
                        >
                          Upload & Parse CV
                        </button>
                        
                        <button
                          onClick={handleFlip}
                          className="text-white/60 hover:text-white transition-colors text-lg font-medium flex items-center gap-2 mx-auto"
                        >
                          Or, Fill Manually <span className="text-lime-400">↻</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
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
                              <p className="text-white font-medium text-lg">Drop your CV here or click to browse</p>
                              <p className="text-white/60">Supports PDF, DOC, DOCX, and TXT files</p>
                            </div>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium"
                              disabled={isUploading}
                            >
                              {isUploading ? 'Processing...' : 'Choose File'}
                            </button>
                          </div>
                        </div>
                        
                        {uploadError && (
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                            {uploadError}
                          </div>
                        )}
                        
                        {isUploading && (
                          <div className="p-4 bg-lime-500/10 border border-lime-500/20 rounded-lg text-lime-400 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 size={16} className="animate-spin" />
                              Processing your CV...
                            </div>
                          </div>
                        )}
                        
                        {isProcessing && (
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle size={16} />
                              CV parsed successfully! Flipping card...
                            </div>
                          </div>
                        )}
                        
                        <button
                          onClick={handleFlip}
                          className="text-white/60 hover:text-white transition-colors text-lg font-medium flex items-center gap-2 mx-auto"
                        >
                          Or, Fill Manually <span className="text-lime-400">↻</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Back Side - Personal Details Form */}
              <motion.div
                className="absolute w-full backface-hidden"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 min-h-[500px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Your Details</h3>
                    <button
                      onClick={handleFlip}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
                    >
                      <RotateCcw size={16} />
                      Back to Upload
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-white/80 text-xs font-medium mb-2">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={cvData.basics.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                    </div>

                    {/* Professional Title */}
                    <div>
                      <label className="block text-white/80 text-xs font-medium mb-2">
                        Professional Title
                      </label>
                      <input
                        type="text"
                        value={cvData.basics.label || ''}
                        onChange={(e) => handleInputChange('label', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                        placeholder="e.g., Software Engineer, Marketing Manager"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-white/80 text-xs font-medium mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type="email"
                          value={cvData.basics.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Enter your email address"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-white/80 text-xs font-medium mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type="tel"
                          value={cvData.basics.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-white/80 text-xs font-medium mb-2">
                        Website
                      </label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type="url"
                          value={cvData.basics.url || ''}
                          onChange={(e) => handleInputChange('url', e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="https://your-website.com"
                        />
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-white/80 text-xs font-medium mb-2">
                        City
                      </label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={cvData.basics.location?.city || ''}
                          onChange={(e) => handleLocationChange('city', e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200"
                          placeholder="Enter your city"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Summary */}
                  <div className="mt-4">
                    <label className="block text-white/80 text-xs font-medium mb-2">
                      Professional Summary
                    </label>
                    <textarea
                      value={cvData.basics.summary || ''}
                      onChange={(e) => handleInputChange('summary', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-200 resize-none"
                      rows={3}
                      placeholder="Write a brief professional summary about yourself..."
                    />
                  </div>

                  {/* Continue Button */}
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleNext}
                      disabled={!cvData.basics.name || !cvData.basics.email}
                      className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-200 shadow-lg shadow-lime-400/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                    >
                      Save & Continue
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
