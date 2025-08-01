'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CVTemplateRenderer from './CVTemplateRenderer';

interface CVStudioEditorProps {
  zoom: number;
  isPreviewMode: boolean;
  selectedCV: string | null;
  linkedJob: any;
  onDataChange: () => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  onContentChange?: (content: string, section?: string) => void;
  userId?: string;
  cvId?: string;
  // Styling props
  styling?: {
    fontFamily: string;
    bodyFontSize: number;
    sectionTitleFontSize: number;
    nameFontSize: number;
    lineHeight: number;
    margins: number;
    sectionGap: number;
    itemSpacing: number;
    bulletSpacing: number;
  };
}

// Mock CV data structure
const defaultCVData = {
  personal_info: {
    name: "LE HOANG NHI",
    contact0: "(44) 77 026 9598",
    contact1: "nhilhto@gmail.com",
    contact2: "www.linkedin.com/in/hoangnhile141000/",
    summary: "Ambitious MSc Finance graduate from the University of Edinburgh, with previous internships in financial services, fluent in English, French & Vietnamese. Strong skills in leveraging data analytics, performing statistical analysis and using AI to perform deep-dive research. Demonstrated excellent written, verbal skills through passion projects outside of academic & corporate experience. Seeking an entry-level opportunity in Finance."
  },
  education: {
    education_0_title: "Master of Science in Finance (Merit)",
    education_0_company: "The University of Edinburgh",
    education_0_duration: "Sep 2022 – Nov 2023",
    education_0_detail_0: "Dissertation (Grade: Distinction): \"Unpacking ESG-Financial Performance Relationship: A Banking-Sector Study\".",
    education_0_detail_1: "Relevant Modules: Financial Markets and Investment, Corporate Finance, Sustainable Finance, Blockchain Governance and Policy, Financial Statement Analysis.",
    education_1_title: "BSc in Law, Economics and Management (2.1)",
    education_1_company: "University of Lyon",
    education_1_duration: "Sep 2018 – June 2022",
    education_1_detail_0: "Relevant Modules: Macroeconomics, Mathematics for Quantitative Economics, Financial Analysis, Probability and Statistics.",
    education_1_detail_1: "Extra-curricular activities: Student Representative of the Faculty of Economics and Management.",
    education_2_title: "Bachelor of Business (International Business)",
    education_2_company: "RMIT University",
    education_2_duration: "Oct 2020 – Apr 2022",
    education_2_detail_0: "Relevant Modules: International Trade, Commercial Law, Business Statistics, Political Economy for International Business."
  },
  experience: {
    experience_0_title: "Global Trade and Customs Consultant Intern",
    experience_0_company: "Ernst & Young",
    experience_0_duration: "May 2024 – Aug 2024",
    experience_0_detail_0: "Provided strategic advisory services such as customs valuation optimisation, classification analysis for imported/exported goods, risk assessment and mitigation, to over 10 multinational clients.",
    experience_0_detail_1: "Enhanced client response accuracy by conducting in-depth research on customs laws, regulations, and precedent cases.",
    experience_0_detail_2: "Contributed to successful engagements for clients like Samsung Electronics and Louis Vuitton.",
    experience_1_title: "Insight Days",
    experience_1_company: "Bank of America",
    experience_1_duration: "May 2023",
    experience_1_detail_0: "Attended a 3-day summit hosted by BoA, presenting on the state of AI and ESG in the Banking & Finance industry.",
    experience_1_detail_1: "Received good feedback from BoA senior management.",
    experience_2_title: "Transfer Pricing Intern",
    experience_2_company: "Ernst & Young",
    experience_2_duration: "May 2020 – Aug 2020",
    experience_2_detail_0: "Compiled financial reports and devised key metrics like profitability and solvency ratios.",
    experience_2_detail_1: "Benchmarked pricing analysis for ~15 companies, calculating arm's length prices."
  },
  leadership: {
    leadership_0_title: "Social Media Manager",
    leadership_0_company: "Account with 210K followers (210K on TikTok, 12.5K on Instagram)",
    leadership_0_duration: "May 2020 – Present",
    leadership_0_detail_0: "Achieved 30M+ total views by creating content targeting students in UK, France & Scotland.",
    leadership_0_detail_1: "Used Advanced Analytics to review metrics and adapt strategy.",
    leadership_0_detail_2: "Conducted research across industries: fashion, beauty, F&B, education, directed videos, and achieved 100% deliverable success.",
    leadership_1_title: "Executive Secretary",
    leadership_1_company: "Association of Vietnamese Students in Lyon",
    leadership_1_duration: "Oct 2019 – Oct 2020",
    leadership_1_detail_0: "Organised major cultural and academic workshops.",
    leadership_1_detail_1: "Delivered 15%+ cost savings managing ~€5000 in budget."
  },
  project: {
    project_0_title: "Kellogg's Company Analysis using top-down approach / Equity Valuation",
    project_0_duration: "Feb 2023 – Apr 2023",
    project_0_detail_0: "Conducted a comprehensive equity valuation using DCF and P/E ratios.",
    project_0_detail_1: "Used Refinitiv & Damodaran data to forecast cash flows, WACC, and terminal value."
  },
  skills: {
    skills_detail_0: "Languages: Fluent in English, French, Vietnamese; proficient in Mandarin Chinese.",
    skills_detail_1: "IT: Microsoft Office Suite (Excel, Word, PowerPoint, Visio), Statistical analysis software (STATA17).",
    skills_detail_2: "Certificates: Finance Accelerator Simulator Experience (AmplifyME), Stock Valuation with Comparable Company Analysis (Coursera), Analysing Company Performance using Ratios (Coursera)."
  }
};

// Enhanced Editable Field Component
const EditableField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  tag?: 'div' | 'h1' | 'h2' | 'h3' | 'span' | 'textarea';
  multiline?: boolean;
  isPreview?: boolean;
  style?: React.CSSProperties;
}> = ({ value, onChange, placeholder, className = '', tag: Tag = 'div', multiline = false, isPreview = false, style }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const startEditing = () => {
    if (!isPreview) {
      setIsEditing(true);
      setCurrentValue(value);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(currentValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || (multiline && !e.shiftKey))) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setCurrentValue(value);
      handleBlur();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }
  }, [isEditing, multiline]);

  if (isEditing) {
    if (multiline || Tag === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full resize-none overflow-hidden relative z-30 ${className}`}
          style={style}
          autoFocus
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full relative z-30 ${className}`}
        style={style}
        autoFocus
      />
    );
  }

  const DisplayTag = (Tag === 'textarea' || multiline) ? 'div' : Tag;
  return (
    <DisplayTag
      className={`${!isPreview ? 'cursor-pointer hover:bg-gray-100' : ''} p-1 rounded-md whitespace-pre-wrap ${className}`}
      onClick={startEditing}
      style={style}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </DisplayTag>
  );
};

// Enhanced Section Component
const Section: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
  isPreview?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ 
  id, 
  title, 
  children, 
  isPreview = false, 
  onDelete, 
  onDuplicate, 
  onMoveUp, 
  onMoveDown, 
  isFirst = false, 
  isLast = false 
}) => {
  return (
    <div className="relative group/section mb-6 border-2 border-dashed border-transparent hover:border-gray-200 rounded-lg p-1 transition-all duration-200">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-300 pb-1">
          {title}
        </h2>
        
        {!isPreview && (
          <div className="flex items-center space-x-2 opacity-0 group-hover/section:opacity-100 transition-opacity relative z-20">
            {/* Move Up Button */}
            {!isFirst && onMoveUp && (
              <button
                onClick={onMoveUp}
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
                title="Move Up"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* Move Down Button */}
            {!isLast && onMoveDown && (
              <button
                onClick={onMoveDown}
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
                title="Move Down"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <button
              onClick={onDuplicate}
              className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
              title="Duplicate Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                <path d="M3 7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
              title="Delete Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Section Content */}
      <div className="section-content">
        {children}
      </div>
    </div>
  );
};

const CVStudioEditor: React.FC<CVStudioEditorProps> = ({
  zoom,
  isPreviewMode,
  selectedCV,
  linkedJob,
  onDataChange,
  currentPage,
  onPageChange,
  totalPages,
  userId,
  cvId,
  styling = {
    fontFamily: 'Arial, sans-serif',
    bodyFontSize: 11,
    sectionTitleFontSize: 15,
    nameFontSize: 20,
    lineHeight: 1.0,
    margins: 96,
    sectionGap: 10,
    itemSpacing: 2,
    bulletSpacing: 4
  }
}) => {
  const [cvData, setCVData] = useState(defaultCVData);
  const [templateData, setTemplateData] = useState({
    display: {
      layout: "single-column",
      padding: `${styling.margins}px`,
      fontFamily: styling.fontFamily,
      sectionSpacing: `${styling.sectionGap}px`
    },
    sections: [
      {
        id: "personal_info",
        type: "header",
        content: {
          name: "",
          contact: ["", "", ""],
          summary: ""
        },
        styleSnippetId: "snippet_header"
      },
      {
        id: "experience",
        type: "section",
        title: "Work Experience",
        entries: [],
        styleSnippetId: "snippet_experience"
      },
      {
        id: "education",
        type: "section",
        title: "Education",
        entries: [],
        styleSnippetId: "snippet_education"
      },
      {
        id: "skills",
        type: "section",
        title: "Skills",
        details: [],
        styleSnippetId: "snippet_skills"
      }
    ],
    snippetStyles: [
      {
        id: "snippet_header",
        category: "Header",
        style: {
          fontWeight: "bold",
          fontSize: `${styling.nameFontSize}px`,
          color: "#1a1a1a",
          marginBottom: "12px",
          lineHeight: styling.lineHeight.toString()
        }
      },
      {
        id: "snippet_experience",
        category: "Experience",
        style: {
          titleFontSize: `${styling.sectionTitleFontSize}px`,
          fontSize: `${styling.bodyFontSize}px`,
          lineHeight: styling.lineHeight.toString(),
          entrySpacing: `${styling.itemSpacing}px`
        }
      },
      {
        id: "snippet_education",
        category: "Education",
        style: {
          titleFontSize: `${styling.sectionTitleFontSize}px`,
          fontSize: `${styling.bodyFontSize}px`,
          lineHeight: styling.lineHeight.toString(),
          entrySpacing: `${styling.itemSpacing}px`
        }
      },
      {
        id: "snippet_skills",
        category: "Skills",
        style: {
          titleFontSize: `${styling.sectionTitleFontSize}px`,
          fontSize: `${styling.bodyFontSize}px`,
          lineHeight: styling.lineHeight.toString()
        }
      }
    ]
  });
  const [history, setHistory] = useState<any[]>([defaultCVData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [useTemplateRenderer, setUseTemplateRenderer] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load CV data if cvId is provided
  useEffect(() => {
    if (cvId && userId) {
      loadCVData();
    }
  }, [cvId, userId]);

  // Update template data when styling changes
  useEffect(() => {
    setTemplateData(prev => ({
      ...prev,
      display: {
        ...prev.display,
        fontFamily: styling.fontFamily,
        padding: `${styling.margins}px`,
        sectionSpacing: `${styling.sectionGap}px`
      },
      snippetStyles: prev.snippetStyles.map(snippet => ({
        ...snippet,
        style: {
          ...snippet.style,
          fontSize: snippet.id.includes('header') ? `${styling.nameFontSize}px` : `${styling.bodyFontSize}px`,
          titleFontSize: `${styling.sectionTitleFontSize}px`,
          lineHeight: styling.lineHeight.toString(),
          marginBottom: snippet.id.includes('header') ? '12px' : `${styling.sectionGap}px`,
          entrySpacing: `${styling.itemSpacing}px`,
          bodyFontSize: `${styling.bodyFontSize}px`, // Add body font size for contact details and summary
          bulletSpacing: `${styling.bulletSpacing}px` // Add bullet spacing
        }
      }))
    }));
  }, [styling]);

  const loadCVData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cvs/${cvId}/save?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        if (result.data.cvData) {
          setCVData(result.data.cvData);
        }
        if (result.data.templateData) {
          setTemplateData(result.data.templateData);
        }
      }
    } catch (error) {
      console.error('Error loading CV data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCVData = async (data?: any, template?: any) => {
    if (!cvId || !userId) return;
    
    try {
      setSaveStatus('saving');
      const response = await fetch(`/api/cvs/${cvId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          cvData: data || cvData,
          templateData: template || templateData,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving CV data:', error);
      setSaveStatus('error');
    }
  };

  const handleDataUpdate = useCallback((section: string, data: any) => {
    const newData = {
      ...cvData,
      [section]: data
    };
    setCVData(newData);
    
    // Add to history for undo/redo functionality
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    onDataChange();
    
    // Auto-save after data changes
    if (cvId && userId) {
      saveCVData(newData);
    }
  }, [cvData, history, historyIndex, onDataChange, cvId, userId]);

  const handleTemplateDataChange = useCallback((sectionId: string, data: any) => {
    const newData = {
      ...cvData,
      [sectionId]: data
    };
    setCVData(newData);
    onDataChange();
    
    // Auto-save after data changes
    if (cvId && userId) {
      saveCVData(newData);
    }
  }, [cvData, onDataChange, cvId, userId]);

  // Use template renderer for ATS Finance CV
  if (useTemplateRenderer && templateData) {
    return (
      <div className="relative">
        {/* Save Status Indicator */}
        {saveStatus !== 'idle' && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
            saveStatus === 'saving' ? 'bg-blue-500 text-white' :
            saveStatus === 'saved' ? 'bg-green-500 text-white' :
            'bg-red-500 text-white'
          }`}>
            {saveStatus === 'saving' && '💾 Saving...'}
            {saveStatus === 'saved' && '✅ Saved!'}
            {saveStatus === 'error' && '❌ Save failed'}
          </div>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading CV data...</p>
            </div>
          </div>
        )}
        
        <CVTemplateRenderer
          template={templateData}
          cvData={cvData}
          zoom={zoom}
          isPreviewMode={isPreviewMode}
          currentPage={currentPage}
          totalPages={totalPages}
          onDataChange={handleTemplateDataChange}
        />
      </div>
    );
  }

  // Legacy renderer fallback
  return (
    <div className="h-full overflow-auto bg-gray-100">
      <div className="min-h-full flex justify-center p-8">
        <div className="space-y-8">
          {/* Render multiple pages */}
          {Array.from({ length: totalPages }, (_, pageIndex) => (
            <motion.div
              key={pageIndex}
              className="bg-white shadow-2xl rounded-lg overflow-hidden"
              style={{
                width: '794px', // A4 width in pixels (210mm)
                height: '1123px', // A4 height in pixels (297mm)
                transform: `scale(${zoom})`,
                transformOrigin: 'top center'
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* CV Content */}
              <div className="p-12 font-['Inter'] text-gray-800">
                {/* Legacy renderer content would go here */}
                <div className="text-center text-gray-500">
                  <p>Legacy CV Editor</p>
                  <button 
                    onClick={() => setUseTemplateRenderer(true)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Use Template Renderer
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CVStudioEditor; 