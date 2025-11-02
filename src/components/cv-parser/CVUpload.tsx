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

      // Add debugging before passing to form
      console.log('CVUpload passing data to form:', parsedData);
      console.log('Data structure validation:', {
        hasPersonalInfo: !!parsedData.personalInfo,
        personalInfoKeys: parsedData.personalInfo ? Object.keys(parsedData.personalInfo) : [],
        educationLength: parsedData.education?.length || 0,
        experienceLength: parsedData.experience?.length || 0,
        skillsLength: parsedData.skills?.length || 0,
        projectsLength: parsedData.projects?.length || 0
      });
      
      // Simulate success delay
      setTimeout(() => {
        try {
          onCVParsed(parsedData);
        } catch (error) {
          console.error('Error in onCVParsed callback:', error);
          setUploadStatus('error');
          setErrorMessage('Failed to process parsed data');
        }
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
    try {
      console.log('Starting CV file parsing for:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // Use direct parsing API (no AI dependency)
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
      console.log('Raw parsed data:', result);

      // The direct parsing API already returns the correct format
      // Just validate and clean the data
      const mapped = validateAndCleanFormData(result);
      
      console.log('Mapped form data:', mapped);
      
      // Validate the mapped data structure
      const validationErrors = validateFormData(mapped);
      if (validationErrors.length > 0) {
        console.warn('Form data validation warnings:', validationErrors);
      }
      
      return mapped;
    } catch (error) {
      console.error('CV parsing error:', error);
      return getEmptyStructure();
    }
  };

  // Helper function to validate form data structure
  const validateFormData = (data: any): string[] => {
    const errors: string[] = [];
    
    if (!data.personalInfo) {
      errors.push('Missing personalInfo section');
    } else {
      if (typeof data.personalInfo.email !== 'string') {
        errors.push('Invalid email format in personalInfo');
      }
      if (data.personalInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalInfo.email)) {
        errors.push('Invalid email pattern in personalInfo');
      }
    }
    
    if (!Array.isArray(data.education)) {
      errors.push('Education must be an array');
    }
    
    if (!Array.isArray(data.experience)) {
      errors.push('Experience must be an array');
    }
    
    if (!Array.isArray(data.skills)) {
      errors.push('Skills must be an array');
    }
    
    if (!Array.isArray(data.projects)) {
      errors.push('Projects must be an array');
    }
    
    return errors;
  };

  // Helper function to validate and fix data structure
  const asMonth = (value: any): string => {
    if (!value || typeof value !== 'string') {
      console.log('🔍 asMonth: Invalid input:', value, 'type:', typeof value);
      return '';
    }
    const trimmed = value.trim();
    console.log('🔍 asMonth processing:', trimmed);
    
    // Accept YYYY-MM, YYYY-MM-DD, YYYY
    const yyyyMm = trimmed.match(/^\d{4}-(0[1-9]|1[0-2])$/);
    if (yyyyMm) {
      console.log('✅ asMonth: YYYY-MM format:', yyyyMm[0]);
      return yyyyMm[0];
    }
    const yyyyMmDd = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    if (yyyyMmDd) {
      const result = `${yyyyMmDd[1]}-${yyyyMmDd[2]}`;
      console.log('✅ asMonth: YYYY-MM-DD format:', trimmed, '->', result);
      return result;
    }
    const yyyy = trimmed.match(/^(\d{4})$/);
    if (yyyy) {
      const result = `${yyyy[1]}-01`;
      console.log('✅ asMonth: YYYY format:', trimmed, '->', result);
      return result;
    }
    
    // Try to parse other common date formats
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const result = `${year}-${month}`;
        console.log('✅ asMonth: Parsed date:', trimmed, '->', result);
        return result;
      }
    } catch (error) {
      console.log('❌ asMonth: Failed to parse date:', trimmed, error);
    }
    
    console.log('❌ asMonth: No match for:', trimmed);
    return '';
  };

  const splitName = (fullName: string): { firstName: string; lastName: string } => {
    if (!fullName) return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts.slice(-1).join('') };
  };

  const mapParsedDataToForm = (data: any) => {
    const empty = getEmptyStructure();
    
    // Handle direct parsing API structure (CVData interface)
    if (data.personalInfo && data.education && data.experience && data.skills && data.projects) {
      // Direct parsing API structure - already in the correct format
      return validateAndCleanFormData(data);
    }
    
    // Map from universal CV schema to form schema
    const basics = data.basics || {};
    const profiles: Array<any> = Array.isArray(basics.profiles) ? basics.profiles : [];
    const linkedIn = profiles.find(p => String(p.network || '').toLowerCase().includes('linkedin'))?.url || '';
    const github = profiles.find(p => String(p.network || '').toLowerCase().includes('github'))?.url || '';
    const name = splitName(basics.name || '');

    // Map education with proper field mapping
    const education = Array.isArray(data.education) ? data.education.map((e: any) => ({
      institution: sanitizeString(e?.institution || ''),
      degree: sanitizeString(e?.studyType || ''), // studyType -> degree
      field: sanitizeString(e?.area || ''), // area -> field
      location: sanitizeString(''), // Not available in CV schema
      startDate: asMonth(e?.startDate),
      endDate: asMonth(e?.endDate),
      current: !e?.endDate || e?.endDate === '', // current if no end date
      gpa: sanitizeString(e?.score || ''), // score -> gpa
      description: sanitizeString('')
    })) : [];

    // Map work experience with proper field mapping
    const experience = Array.isArray(data.work) ? data.work.map((w: any) => ({
      company: sanitizeString(w?.name || ''), // name -> company
      position: sanitizeString(w?.position || ''),
      location: sanitizeString(''), // Not available in CV schema
      startDate: asMonth(w?.startDate),
      endDate: asMonth(w?.endDate),
      current: !w?.endDate || w?.endDate === '', // current if no end date
      description: sanitizeString(w?.summary || ''), // summary -> description
      achievements: Array.isArray(w?.highlights) ? w.highlights.map(sanitizeString).filter(Boolean) : []
    })) : [];

    // Map skills with proper field mapping
    const skills = Array.isArray(data.skills) ? data.skills.map((s: any) => ({
      category: sanitizeString(s?.name || 'Skills'), // name -> category
      skills: Array.isArray(s?.keywords) ? s.keywords.map(sanitizeString).filter(Boolean) : [] // keywords -> skills
    })).filter((skill: any) => skill.category && skill.skills.length > 0) : [];

    // Map projects with proper field mapping
    const projects = Array.isArray(data.projects) ? data.projects.map((p: any) => ({
      title: sanitizeString(p?.name || ''), // name -> title
      description: sanitizeString(p?.description || ''),
      technologies: Array.isArray(p?.highlights) ? p.highlights.map(sanitizeString).filter(Boolean) : [], // highlights -> technologies
      url: sanitizeString(p?.url || ''),
      github: sanitizeString(''), // Not available in CV schema
      startDate: asMonth(p?.startDate),
      endDate: asMonth(p?.endDate),
      current: !p?.endDate || p?.endDate === '' // current if no end date
    })).filter((project: any) => project.title) : [];

    // Ensure all string fields are properly sanitized to prevent validation errors
    function sanitizeString(str: any): string {
      if (typeof str !== 'string') return '';
      return str.trim().substring(0, 1000); // Limit length to prevent validation issues
    }

    // Build location string from CV location object
    const locationParts = [];
    if (basics.location?.city) locationParts.push(basics.location.city);
    if (basics.location?.region) locationParts.push(basics.location.region);
    const locationString = locationParts.join(', ');

    const formData = {
      personalInfo: {
        firstName: sanitizeString(name.firstName) || empty.personalInfo.firstName,
        lastName: sanitizeString(name.lastName) || empty.personalInfo.lastName,
        email: sanitizeString(basics.email) || empty.personalInfo.email,
        phone: sanitizeString(basics.phone) || empty.personalInfo.phone,
        location: sanitizeString(locationString) || empty.personalInfo.location,
        website: sanitizeString(basics.url) || empty.personalInfo.website,
        linkedin: sanitizeString(linkedIn) || empty.personalInfo.linkedin,
        github: sanitizeString(github) || empty.personalInfo.github,
        summary: sanitizeString(basics.summary) || empty.personalInfo.summary
      },
      education,
      experience,
      skills,
      projects
    };

    return validateAndCleanFormData(formData);
  };

  // Helper function to validate and clean form data
  const validateAndCleanFormData = (data: any) => {
    const empty = getEmptyStructure();
    
    // Ensure all required fields exist with proper types
    const cleanData = {
      personalInfo: {
        firstName: sanitizeString(data.personalInfo?.firstName) || empty.personalInfo.firstName,
        lastName: sanitizeString(data.personalInfo?.lastName) || empty.personalInfo.lastName,
        email: sanitizeString(data.personalInfo?.email) || empty.personalInfo.email,
        phone: sanitizeString(data.personalInfo?.phone) || empty.personalInfo.phone,
        location: sanitizeString(data.personalInfo?.location) || empty.personalInfo.location,
        website: sanitizeString(data.personalInfo?.website) || empty.personalInfo.website,
        linkedin: sanitizeString(data.personalInfo?.linkedin) || empty.personalInfo.linkedin,
        github: sanitizeString(data.personalInfo?.github) || empty.personalInfo.github,
        summary: sanitizeString(data.personalInfo?.summary) || empty.personalInfo.summary
      },
      education: Array.isArray(data.education) ? data.education.map((edu: any) => ({
        institution: sanitizeString(edu.institution) || '',
        degree: sanitizeString(edu.degree) || '',
        field: sanitizeString(edu.field) || '',
        location: sanitizeString(edu.location) || '',
        startDate: asMonth(edu.startDate),
        endDate: asMonth(edu.endDate),
        current: Boolean(edu.current),
        gpa: sanitizeString(edu.gpa) || '',
        description: sanitizeString(edu.description) || ''
      })) : [],
      experience: Array.isArray(data.experience) ? data.experience.map((exp: any) => ({
        company: sanitizeString(exp.company) || '',
        position: sanitizeString(exp.position) || '',
        location: sanitizeString(exp.location) || '',
        startDate: asMonth(exp.startDate),
        endDate: asMonth(exp.endDate),
        current: Boolean(exp.current),
        description: sanitizeString(exp.description) || '',
        achievements: Array.isArray(exp.achievements) ? exp.achievements.map(sanitizeString).filter(Boolean) : []
      })) : [],
      skills: Array.isArray(data.skills) ? data.skills.map((skill: any) => ({
        category: sanitizeString(skill.category) || 'Skills',
        skills: Array.isArray(skill.skills) ? skill.skills.map(sanitizeString).filter(Boolean) : []
      })).filter((skill: any) => skill.category && skill.skills.length > 0) : [],
      projects: Array.isArray(data.projects) ? data.projects.map((proj: any) => ({
        title: sanitizeString(proj.title) || '',
        description: sanitizeString(proj.description) || '',
        technologies: Array.isArray(proj.technologies) ? proj.technologies.map(sanitizeString).filter(Boolean) : [],
        url: sanitizeString(proj.url) || '',
        github: sanitizeString(proj.github) || '',
        startDate: asMonth(proj.startDate),
        endDate: asMonth(proj.endDate),
        current: Boolean(proj.current)
      })).filter((project: any) => project.title) : []
    };

    // Helper function to sanitize strings
    function sanitizeString(str: any): string {
      if (typeof str !== 'string') return '';
      // Remove any characters that might cause validation issues
      return str.trim()
        .replace(/[^\w\s@.\-+()]/g, '') // Keep only alphanumeric, spaces, and common symbols
        .substring(0, 1000); // Limit length
    }

    return cleanData;
  };

  // Helper function to get empty structure
  const getEmptyStructure = () => ({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      summary: ''
    },
    education: [],
    experience: [],
    skills: [],
    projects: []
  });

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
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
                <div className="flex justify-center space-x-6 mb-8">
                  {[
                    { icon: FileText, label: 'PDF', color: 'text-red-400' },
                    { icon: File, label: 'DOCX', color: 'text-blue-400' },
                    { icon: File, label: 'DOC', color: 'text-purple-400' },
                    { icon: FileText, label: 'RTF', color: 'text-orange-400' },
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
                <div {...getRootProps()}>
                  <motion.div
                    className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer ${
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
                        Supports PDF, DOC, DOCX, RTF, JPG, PNG (Max 10MB)
                      </p>
                    </motion.div>
                  </motion.div>
                </div>

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
                  onClick={() => onCVParsed(getEmptyStructure())}
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
