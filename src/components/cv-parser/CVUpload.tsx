'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface CVUploadProps {
  onCVParsed: (parsedData: any) => void;
  onClose: () => void;
}

const CVUpload: React.FC<CVUploadProps> = ({ onCVParsed, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Parse the file based on type
      setUploadStatus('parsing');
      const parsedData = await parseCVFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');

      // Simulate success delay
      setTimeout(() => {
        onCVParsed(parsedData);
      }, 1000);

    } catch (error) {
      console.error('CV parsing error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CV');
    } finally {
      setIsUploading(false);
    }
  }, [onCVParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false,
    disabled: isUploading
  });

  const parseCVFile = async (file: File): Promise<any> => {
    // This is a mock implementation - in production, you'd use actual parsing libraries
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock parsed data based on the CV image provided
        const mockParsedData = {
          personalInfo: {
            firstName: 'Le Hoang',
            lastName: 'Nhi',
            email: 'nhilhto@gmail.com',
            phone: '+84 123 456 789',
            location: 'Ho Chi Minh City, Vietnam',
            linkedin: 'linkedin.com/in/lehoangnhi',
            summary: 'Passionate student with strong academic background in Finance, Law, and Business Management. Seeking opportunities to apply knowledge and develop professional skills.'
          },
          education: [
            {
              institution: 'University of Economics and Law',
              degree: 'MSc Finance',
              field: 'Finance',
              startDate: '2023',
              endDate: '2025',
              current: true,
              description: 'Advanced studies in financial management and analysis'
            },
            {
              institution: 'University of Economics and Law',
              degree: 'BSc in Law, Economics and Management',
              field: 'Law, Economics, Management',
              startDate: '2020',
              endDate: '2024',
              current: false,
              description: 'Comprehensive study of legal, economic, and management principles'
            }
          ],
          experience: [
            {
              company: 'Ernst & Young',
              position: 'Intern',
              location: 'Ho Chi Minh City, Vietnam',
              startDate: '2024',
              endDate: '2024',
              current: false,
              description: 'Gained practical experience in professional services and consulting',
              achievements: [
                'Assisted with financial analysis and reporting',
                'Participated in client meetings and presentations',
                'Developed understanding of audit and consulting processes'
              ]
            }
          ],
          skills: [
            {
              category: 'Technical Skills',
              skills: ['Financial Analysis', 'Microsoft Excel', 'PowerPoint', 'Data Analysis']
            },
            {
              category: 'Soft Skills',
              skills: ['Communication', 'Teamwork', 'Problem Solving', 'Leadership']
            },
            {
              category: 'Languages',
              skills: ['Vietnamese (Native)', 'English (Fluent)', 'Chinese (Basic)']
            }
          ],
          projects: [
            {
              title: 'Financial Analysis Project',
              description: 'Comprehensive analysis of market trends and investment opportunities',
              technologies: ['Excel', 'Financial Modeling'],
              startDate: '2024',
              endDate: '2024',
              current: false
            }
          ]
        };

        resolve(mockParsedData);
      }, 2000); // Simulate parsing time
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-4xl mx-4 bg-gradient-to-br from-gray-900/95 to-black/95 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="relative p-8 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Upload Your CV
              </h2>
              <p className="text-white/60 text-lg">
                Let us parse your CV and create your professional profile
              </p>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} className="text-white" />
            </motion.button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {uploadStatus === 'idle' && (
              <motion.div
                key="upload-area"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* File Type Icons */}
                <div className="flex justify-center space-x-8 mb-8">
                  {[
                    { icon: FileText, label: 'PDF', color: 'text-red-400' },
                    { icon: File, label: 'DOCX', color: 'text-blue-400' },
                    { icon: Image, label: 'Image', color: 'text-green-400' }
                  ].map((fileType, index) => (
                    <motion.div
                      key={fileType.label}
                      className="flex flex-col items-center space-y-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${fileType.color}`}>
                        <fileType.icon size={32} />
                      </div>
                      <span className="text-white/60 text-sm font-medium">{fileType.label}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Drop Zone */}
                <motion.div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                    isDragActive
                      ? 'border-lime-400 bg-lime-400/10'
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input {...getInputProps()} />
                  
                  <motion.div
                    className="flex flex-col items-center space-y-4"
                    animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                  >
                    <motion.div
                      className="p-6 rounded-full bg-gradient-to-br from-lime-400 to-lime-500"
                      animate={isDragActive ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Upload size={48} className="text-black" />
                    </motion.div>
                    
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {isDragActive ? 'Drop your CV here' : 'Drag & drop your CV'}
                      </h3>
                      <p className="text-white/60 text-lg">
                        or click to browse files
                      </p>
                    </div>
                    
                    <p className="text-white/40 text-sm">
                      Supports PDF, DOCX, JPG, PNG (Max 10MB)
                    </p>
                  </motion.div>
                </motion.div>

                {/* Or Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gray-900/95 text-white/40">or</span>
                  </div>
                </div>

                {/* Manual Entry Button */}
                <motion.button
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl text-white font-medium hover:bg-white/10 transition-colors duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onCVParsed({})}
                >
                  Start with empty CV
                </motion.button>
              </motion.div>
            )}

            {uploadStatus === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Upload size={32} className="text-black" />
                </motion.div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Uploading CV...</h3>
                  <p className="text-white/60">Please wait while we process your file</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                
                <p className="text-white/40 text-sm">{uploadProgress}% complete</p>
              </motion.div>
            )}

            {uploadStatus === 'parsing' && (
              <motion.div
                key="parsing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <FileText size={32} className="text-white" />
                </motion.div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Parsing CV...</h3>
                  <p className="text-white/60">Extracting information from your document</p>
                </div>

                <div className="flex justify-center space-x-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-white/40 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {uploadStatus === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 300 }}
                >
                  <CheckCircle size={32} className="text-white" />
                </motion.div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">CV Parsed Successfully!</h3>
                  <p className="text-white/60">Redirecting to CV editor...</p>
                </div>
              </motion.div>
            )}

            {uploadStatus === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 300 }}
                >
                  <AlertCircle size={32} className="text-white" />
                </motion.div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Parsing Failed</h3>
                  <p className="text-white/60 mb-4">{errorMessage}</p>
                  
                  <motion.button
                    className="px-6 py-3 bg-lime-400 text-black font-medium rounded-xl hover:bg-lime-300 transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setUploadStatus('idle');
                      setErrorMessage('');
                      setUploadProgress(0);
                    }}
                  >
                    Try Again
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CVUpload; 