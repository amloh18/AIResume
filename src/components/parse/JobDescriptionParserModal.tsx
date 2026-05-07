'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'; // Using Radix UI Dialog (install if not present)
import { X, Upload, FileText, GripVertical, Sparkles, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface JobDescriptionParserModalProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedData {
  jobTitle?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  benefits?: string[];
  matchScore?: number;
  missingSkills?: string[];
}

export default function JobDescriptionParserModal({ open, onClose }: JobDescriptionParserModalProps) {
  const { isDark } = useTheme();
  const [jdInput, setJdInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Parse job description (mock function - connect to real API)
  const handleParse = async () => {
    setParsing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setParsedData({
      jobTitle: 'Senior Frontend Engineer',
      company: 'TechCorp Inc',
      location: 'San Francisco, CA (Remote)',
      salary: '$120k - $160k',
      description: 'We are looking for a senior frontend engineer to lead our web platform...',
      requirements: [
        '5+ years of experience with React/Next.js',
        'Strong TypeScript skills',
        'Experience with state management (Redux, Zustand)',
        'Familiarity with GraphQL and REST APIs',
      ],
      responsibilities: [
        'Build and maintain React components',
        'Collaborate with design team',
        'Optimize application performance',
      ],
      skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
      matchScore: 85,
      missingSkills: ['Webpack', 'Jest'],
    });
    setParsing(false);
  };

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setParsedData(null);
      setJdInput('');
      setDragPosition({ x: 0, y: 0 });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        ref={modalRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          'sm:max-w-3xl p-0 overflow-hidden transition-all duration-200',
          isDark 
            ? 'bg-gray-900/95 border-gray-700' 
            : 'bg-white/95 border-gray-200',
          'backdrop-blur-xl border shadow-2xl',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          'rounded-2xl'
        )}
        style={{
          transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`,
        }}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-6 py-4 border-b cursor-grab active:cursor-grabbing',
          isDark ? 'border-gray-700' : 'border-gray-200'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Parse Job Description
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                Extract structured data from any job posting
              </DialogDescription>
            </div>
          </div>
            <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500"
              onClick={(e) => { e.stopPropagation(); /* Handle help */ }}
            >
              <Sparkles size={16} />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Input Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Paste Job Description
            </label>
            <textarea
              value={jdInput}
              onChange={(e) => setJdInput(e.target.value)}
              placeholder="Paste the full job description here..."
              className={cn(
                'w-full h-40 p-4 rounded-xl border resize-none text-sm leading-relaxed',
                'focus:outline-none focus:ring-2 focus:ring-lime-500/50',
                isDark 
                  ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              )}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                <Upload size={16} />
                Upload PDF/Doc
              </button>
              <span className="text-xs text-gray-500">or paste text directly</span>
            </div>
          </div>

          {/* Parse Button */}
          <button
            onClick={handleParse}
            disabled={parsing || !jdInput.trim()}
            className={cn(
              'w-full py-3 px-6 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-600 hover:to-emerald-700',
              'shadow-lg shadow-lime-500/30 hover:shadow-lime-500/50'
            )}
          >
            {parsing ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Parsing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={18} />
                Parse & Analyze
              </span>
            )}
          </button>

          {/* Parsed Results */}
          {parsedData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="space-y-5 border-t pt-5"
            >
              {/* Match Score */}
              {parsedData.matchScore && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-lime-50 to-emerald-50 dark:from-lime-900/30 dark:to-emerald-900/30 border border-lime-200 dark:border-lime-800">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-lg">
                    <span className="text-2xl font-black text-lime-600 dark:text-lime-400">
                      {parsedData.matchScore}%
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      Match Score
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Your CV matches {parsedData.matchScore}% of this job&apos;s requirements
                    </p>
                  </div>
                </div>
              )}

              {/* Structured Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Job Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText size={14} />
                    Job Details
                  </h4>
                  
                  {parsedData.jobTitle && (
                    <DetailItem label="Title" value={parsedData.jobTitle} dark={isDark} />
                  )}
                  {parsedData.company && (
                    <DetailItem label="Company" value={parsedData.company} dark={isDark} />
                  )}
                  {parsedData.location && (
                    <DetailItem label="Location" value={parsedData.location} dark={isDark} />
                  )}
                  {parsedData.salary && (
                    <DetailItem label="Salary" value={parsedData.salary} dark={isDark} />
                  )}
                </div>

                {/* Extracted Skills */}
                {parsedData.skills.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Sparkles size={14} />
                      Skills Required
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Requirements & Responsibilities */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Requirements</h4>
                <ul className="space-y-2">
                  {parsedData.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Missing Skills (if low match) */}
              {parsedData.missingSkills && parsedData.missingSkills.length > 0 && (
                <div className="space-y-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle size={14} />
                    Consider Adding These Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.missingSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                  Save to Tracker
                </button>
                <button className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                  Generate Cover Letter
                </button>
                <button className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Sparkles size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={cn('text-sm font-medium', dark ? 'text-white' : 'text-gray-900')}>{value}</p>
    </div>
  );
}
