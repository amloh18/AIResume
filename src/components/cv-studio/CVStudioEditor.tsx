'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutEngine } from '../layout/LayoutEngine';

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
  selectedTemplate?: any;
  // New props for AI Assistant integration
  onContentSelect?: (content: string, section: string, elementType: string) => void;
  selectedContent?: string;
  selectedSection?: string;
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

// Mock CV data structure - converted to new format
const defaultCVData = {
  sections: {
    profile: {
      name: "LE HOANG NHI",
      contact0: "(44) 77 026 9598",
      contact1: "nhilhto@gmail.com",
      contact2: "www.linkedin.com/in/hoangnhile141000/",
      summary: "Ambitious MSc Finance graduate from the University of Edinburgh, with previous internships in financial services, fluent in English, French & Vietnamese. Strong skills in leveraging data analytics, performing statistical analysis and using AI to perform deep-dive research. Demonstrated excellent written, verbal skills through passion projects outside of academic & corporate experience. Seeking an entry-level opportunity in Finance."
    },
    education: {
      entries: [
        {
          degree: "Master of Science in Finance (Merit)",
          institution: "The University of Edinburgh",
          duration: "Sep 2022 – Nov 2023",
          details: [
            "Dissertation (Grade: Distinction): \"Unpacking ESG-Financial Performance Relationship: A Banking-Sector Study\".",
            "Relevant Modules: Financial Markets and Investment, Corporate Finance, Sustainable Finance, Blockchain Governance and Policy, Financial Statement Analysis."
          ]
        },
        {
          degree: "BSc in Law, Economics and Management (2.1)",
          institution: "University of Lyon",
          duration: "Sep 2018 – June 2022",
          details: [
            "Relevant Modules: Macroeconomics, Mathematics for Quantitative Economics, Financial Analysis, Probability and Statistics.",
            "Extra-curricular activities: Student Representative of the Faculty of Economics and Management."
          ]
        },
        {
          degree: "Bachelor of Business (International Business)",
          institution: "RMIT University",
          duration: "Oct 2020 – Apr 2022",
          details: [
            "Relevant Modules: International Trade, Commercial Law, Business Statistics, Political Economy for International Business."
          ]
        }
      ]
    },
    experience: {
      entries: [
        {
          title: "Global Trade and Customs Consultant Intern",
          company: "Ernst & Young",
          duration: "May 2024 – Aug 2024",
          details: [
            "Provided strategic advisory services such as customs valuation optimisation, classification analysis for imported/exported goods, risk assessment and mitigation, to over 10 multinational clients.",
            "Enhanced client response accuracy by conducting in-depth research on customs laws, regulations, and precedent cases.",
            "Contributed to successful engagements for clients like Samsung Electronics and Louis Vuitton."
          ]
        },
        {
          title: "Insight Days",
          company: "Bank of America",
          duration: "May 2023",
          details: [
            "Attended a 3-day summit hosted by BoA, presenting on the state of AI and ESG in the Banking & Finance industry.",
            "Received good feedback from BoA senior management."
          ]
        },
        {
          title: "Transfer Pricing Intern",
          company: "Ernst & Young",
          duration: "May 2020 – Aug 2020",
          details: [
            "Compiled financial reports and devised key metrics like profitability and solvency ratios.",
            "Benchmarked pricing analysis for ~15 companies, calculating arm's length prices."
          ]
        }
      ]
    },
    leadership: {
      entries: [
        {
          title: "Social Media Manager",
          company: "Account with 210K followers (210K on TikTok, 12.5K on Instagram)",
          duration: "May 2020 – Present",
          details: [
            "Achieved 30M+ total views by creating content targeting students in UK, France & Scotland.",
            "Used Advanced Analytics to review metrics and adapt strategy.",
            "Conducted research across industries: fashion, beauty, F&B, education, directed videos, and achieved 100% deliverable success."
          ]
        },
        {
          title: "Executive Secretary",
          company: "Association of Vietnamese Students in Lyon",
          duration: "Oct 2019 – Oct 2020",
          details: [
            "Organised major cultural and academic workshops.",
            "Delivered 15%+ cost savings managing ~€5000 in budget."
          ]
        }
      ]
    },
    projects: {
      entries: [
        {
          title: "Kellogg's Company Analysis using top-down approach / Equity Valuation",
          duration: "Feb 2023 – Apr 2023",
          details: [
            "Conducted a comprehensive equity valuation using DCF and P/E ratios.",
            "Used Refinitiv & Damodaran data to forecast cash flows, WACC, and terminal value."
          ]
        }
      ]
    },
    skills: {
      entries: [
        {
          title: "Languages",
          details: ["Fluent in English, French, Vietnamese; proficient in Mandarin Chinese."]
        },
        {
          title: "IT",
          details: ["Microsoft Office Suite (Excel, Word, PowerPoint, Visio), Statistical analysis software (STATA17)."]
        },
        {
          title: "Certificates",
          details: ["Finance Accelerator Simulator Experience (AmplifyME), Stock Valuation with Comparable Company Analysis (Coursera), Analysing Company Performance using Ratios (Coursera)."]
        }
      ]
    }
  },
  sectionSnippets: {
    profile: 'profileCentered',
    experience: 'experienceBulletDash',
    education: 'educationSimple',
    skills: 'skillsCategorized',
    leadership: 'experienceBulletDash',
    projects: 'projectsList'
  }
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
  onContentChange,
  userId,
  cvId,
  selectedTemplate,
  onContentSelect,
  selectedContent,
  selectedSection,
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
  const [cvData, setCvData] = useState(defaultCVData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('modernProfessional');

  // Load CV data when selectedCV changes
  useEffect(() => {
    if (selectedCV && userId) {
      loadCVData();
    }
  }, [selectedCV, userId]);

  // Update template ID when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate?.id) {
      setTemplateId(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  const loadCVData = async () => {
    if (!selectedCV || !userId) {
      console.log('No CV ID or user ID provided, using default data');
      setCvData(defaultCVData);
      return;
    }

    try {
      console.log('Loading CV data for ID:', selectedCV);
      const response = await fetch(`/api/cvs/${selectedCV}?userId=${userId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('CV data loaded successfully:', result.data);
          setCvData(result.data);
          // Pass CV data to parent component
          if (onContentChange) {
            onContentChange(JSON.stringify(result.data), 'cv-data');
          }
        } else {
          console.error('Failed to load CV data:', result);
          setCvData(defaultCVData);
        }
      } else {
        console.error('Failed to load CV data:', response.status);
        setCvData(defaultCVData);
      }
    } catch (error) {
      console.error('Error loading CV data:', error);
      setCvData(defaultCVData);
    }
  };

  const getDefaultSnippetId = (section: string): string => {
    const defaults: Record<string, string> = {
      profile: 'profileCentered',
      experience: 'experienceBulletDash',
      education: 'educationSimple',
      skills: 'skillsCategorized',
      leadership: 'experienceBulletDash',
      projects: 'projectsList'
    };
    return defaults[section] || 'experienceBulletDash';
  };

  const saveCVData = async (data?: any, template?: any) => {
    if (!selectedCV || !userId) return;
    
    try {
      const saveData = data || cvData;
      const saveTemplate = template || selectedTemplate;
      
      const response = await fetch(`/api/cvs/${selectedCV}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          cvData: saveData,
          template: saveTemplate
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to save CV:', result.error);
      }
    } catch (err) {
      console.error('Error saving CV:', err);
    }
  };

  const handleDataChange = useCallback((sectionId: string, newData: any) => {
    setCvData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: newData
      }
    }));
    
    // Trigger save after a delay
    setTimeout(() => {
      saveCVData();
      onDataChange();
    }, 1000);
  }, [cvData, onDataChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold mb-2">Error Loading CV</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-100">
      <div className="flex flex-col items-center p-8 space-y-4">
        <LayoutEngine
          cvData={cvData}
          templateId={templateId}
          zoom={zoom}
          isPreviewMode={isPreviewMode}
          onDataChange={handleDataChange}
          onContentSelect={onContentSelect}
          selectedContent={selectedContent}
          selectedSection={selectedSection}
        />
      </div>
    </div>
  );
};

export default CVStudioEditor; 