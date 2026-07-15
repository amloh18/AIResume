'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, FileText, Loader2, CheckCircle, AlertCircle, ScanLine, 
  Crown, Check, Upload, LayoutDashboard, Briefcase, Building2, MapPin, 
  DollarSign, GraduationCap, Shield, HelpCircle, Link, ChevronDown, 
  Zap, Clipboard, RefreshCw, Lock, Info, Pencil, Plus, Trash2, BarChart2, Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useMembership } from '@/lib/hooks/useMembership';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

interface ParsedJobData {
  jobTitle: string;
  company: string;
  location?: string;
  jobUrl?: string;
  jobDescription?: string;
  jobDescriptionRaw?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  deadline?: Date;
  source?: string;
  sourceUrl?: string;
  tags?: string[];
  notes?: string;
  experienceLevel?: string;
  sponsorship?: string;
  benefits?: string[];
  extractedJd?: any;
}

interface JobParserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onParseComplete: (data: ParsedJobData) => void;
  customDescription?: string;
  showSaveAndTrack?: boolean;
  onSaveAndTrack?: (data: ParsedJobData) => void;
  initialData?: {
    jobDescription?: string;
  };
  matchScore?: number;
}

const parseJobDescriptionClientSide = (text: string): ParsedJobData => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  let jobTitle = '';
  let company = '';
  let location = '';
  let salaryMin: number | undefined;
  let salaryMax: number | undefined;
  let salaryCurrency = 'USD';
  let salaryPeriod: 'hourly' | 'monthly' | 'yearly' = 'yearly';
  let experienceLevel = 'Mid Level';
  let employmentType = 'Full-time';
  let sponsorship: 'yes' | 'no' | 'unknown' = 'unknown';
  const tags: string[] = [];
  const responsibilities: string[] = [];
  const requirements: string[] = [];
  const benefits: string[] = [];
  const atsKeywords: string[] = [];

  // 1. Try to guess Job Title and Company from the first few lines
  if (lines.length > 0) {
    const firstLine = lines[0];
    const atMatch = firstLine.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
    if (atMatch) {
      jobTitle = atMatch[1].trim();
      company = atMatch[2].trim();
    } else {
      jobTitle = firstLine;
      if (lines.length > 1) {
        if (lines[1].toLowerCase().includes('location') || lines[1].toLowerCase().includes('remote')) {
          location = lines[1];
        } else {
          company = lines[1];
        }
      }
    }
  }

  // If we still don't have company/title, look for patterns
  for (const line of lines.slice(0, 10)) {
    const titleMatch = line.match(/(?:title|position|role):\s*(.+)/i);
    if (titleMatch && !jobTitle) {
      jobTitle = titleMatch[1].trim();
    }
    const companyMatch = line.match(/(?:company|employer|firm):\s*(.+)/i);
    if (companyMatch && !company) {
      company = companyMatch[1].trim();
    }
  }

  // Set defaults if not found
  if (!jobTitle || jobTitle.length > 80) jobTitle = 'Job Opportunity';
  if (!company || company.length > 80) company = 'Company';

  // 2. Parse Location
  const remoteKeywords = ['remote', 'telecommute', 'wfh', 'work from home'];
  const hasRemote = remoteKeywords.some(kw => text.toLowerCase().includes(kw));
  const hybridKeywords = ['hybrid'];
  const hasHybrid = hybridKeywords.some(kw => text.toLowerCase().includes(kw));

  if (hasRemote) {
    location = 'Remote';
  } else if (hasHybrid) {
    location = 'Hybrid';
  } else {
    for (const line of lines) {
      const locMatch = line.match(/(?:location|loc|city|office):\s*(.+)/i);
      if (locMatch) {
        location = locMatch[1].trim();
        break;
      }
    }
    if (!location) {
      const cityStateMatch = text.match(/([A-Z][a-zA-Z\s.]+),\s*([A-Z]{2}|[A-Z][a-zA-Z\s]+)/);
      if (cityStateMatch) {
        location = cityStateMatch[0];
      } else {
        location = 'On-site';
      }
    }
  }

  // 3. Parse Salary
  const salaryRegex = /(?:salary|compensation|pay|rate)?\s*([$£€]|\bUSD\b)\s*(\d{1,3}(?:[.,]\d{3})*(?:\s*k)?)\s*[-–—to]+\s*([$£€]|\bUSD\b)?\s*(\d{1,3}(?:[.,]\d{3})*(?:\s*k)?)/gi;
  let match;
  let salaryMatched = false;
  while ((match = salaryRegex.exec(text)) !== null) {
    const currencySym = match[1] || match[3] || '$';
    salaryCurrency = currencySym === '£' || currencySym === 'GBP' ? 'GBP' : currencySym === '€' ? 'EUR' : 'USD';
    
    const parseNum = (str: string): number => {
      let cleaned = str.toLowerCase().replace(/[\s,]/g, '');
      if (cleaned.endsWith('k')) {
        return parseFloat(cleaned) * 1000;
      }
      return parseFloat(cleaned);
    };

    salaryMin = parseNum(match[2]);
    salaryMax = parseNum(match[4]);
    salaryMatched = true;
    break;
  }

  if (!salaryMatched) {
    const singleSalaryRegex = /(?:salary|compensation|pay|rate):\s*([$£€]|\bUSD\b)?\s*(\d{1,3}(?:[.,]\d{3})*(?:\s*k)?)/gi;
    const singleMatch = singleSalaryRegex.exec(text);
    if (singleMatch) {
      const currencySym = singleMatch[1] || '$';
      salaryCurrency = currencySym === '£' || currencySym === 'GBP' ? 'GBP' : currencySym === '€' ? 'EUR' : 'USD';
      salaryMin = parseFloat(singleMatch[2].toLowerCase().replace(/[\s,]/g, '')) * (singleMatch[2].toLowerCase().endsWith('k') ? 1000 : 1);
    }
  }

  if (text.toLowerCase().includes('/hr') || text.toLowerCase().includes('per hour') || text.toLowerCase().includes('hourly')) {
    salaryPeriod = 'hourly';
  } else if (text.toLowerCase().includes('/mo') || text.toLowerCase().includes('per month') || text.toLowerCase().includes('monthly')) {
    salaryPeriod = 'monthly';
  } else {
    salaryPeriod = 'yearly';
  }

  // 4. Experience Level
  if (text.toLowerCase().includes('senior') || text.toLowerCase().includes('sr.')) {
    experienceLevel = 'Senior Level';
  } else if (text.toLowerCase().includes('lead') || text.toLowerCase().includes('manager') || text.toLowerCase().includes('director')) {
    experienceLevel = 'Lead / Manager';
  } else if (text.toLowerCase().includes('junior') || text.toLowerCase().includes('jr.') || text.toLowerCase().includes('entry') || text.toLowerCase().includes('intern')) {
    experienceLevel = 'Entry Level';
  } else {
    experienceLevel = 'Mid Level';
  }

  // 5. Employment Type
  if (text.toLowerCase().includes('contract') || text.toLowerCase().includes('contractor')) {
    employmentType = 'Contract';
  } else if (text.toLowerCase().includes('intern') || text.toLowerCase().includes('internship')) {
    employmentType = 'Internship';
  } else if (text.toLowerCase().includes('part-time') || text.toLowerCase().includes('part time')) {
    employmentType = 'Part-time';
  } else if (text.toLowerCase().includes('freelance')) {
    employmentType = 'Freelance';
  } else {
    employmentType = 'Full-time';
  }

  // 6. Sponsorship
  const visaKeywords = ['sponsorship', 'visa', 'h1b', 'work authorization'];
  const hasVisaMention = visaKeywords.some(kw => text.toLowerCase().includes(kw));
  if (hasVisaMention) {
    if (text.toLowerCase().includes('cannot offer') || text.toLowerCase().includes('no sponsorship') || text.toLowerCase().includes('not offer sponsorship')) {
      sponsorship = 'no';
    } else if (text.toLowerCase().includes('offer sponsorship') || text.toLowerCase().includes('will sponsor') || text.toLowerCase().includes('sponsorship available')) {
      sponsorship = 'yes';
    }
  }

  // 7. Key Skills / Tags / ATS Keywords
  const commonKeywords = [
    'react', 'angular', 'vue', 'next.js', 'typescript', 'javascript', 'python', 'java', 'c++', 'go', 'rust',
    'sql', 'postgresql', 'mongodb', 'redis', 'aws', 'docker', 'kubernetes', 'ci/cd', 'git', 'node.js',
    'html', 'css', 'tailwind', 'sass', 'graphql', 'rest api', 'product management', 'scrum', 'agile',
    'project management', 'sales', 'marketing', 'seo', 'figma', 'ui/ux', 'machine learning', 'data science',
    'data analytics', 'analytics', 'communication', 'leadership', 'collaboration'
  ];

  for (const kw of commonKeywords) {
    try {
      let regex: RegExp;
      if (kw === 'c++') {
        regex = /c\+\+/i;
      } else if (kw === 'next.js') {
        regex = /next\.js/i;
      } else if (kw === 'ci/cd') {
        regex = /ci\/cd/i;
      } else if (kw === 'ui/ux') {
        regex = /ui\/ux/i;
      } else if (kw === 'node.js') {
        regex = /node\.js/i;
      } else {
        regex = new RegExp(`\\b${kw}\\b`, 'i');
      }

      if (regex.test(text)) {
        const capKw = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        tags.push(capKw);
        atsKeywords.push(capKw);
      }
    } catch (e) {
      console.warn('Regex error for keyword:', kw, e);
    }
  }

  // 8. Responsibilities and Requirements Section parsing
  let currentSection: 'none' | 'responsibilities' | 'requirements' | 'benefits' = 'none';
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('responsibilit') || lowerLine.includes('what you will do') || lowerLine.includes('key roles') || lowerLine.includes('duties')) {
      currentSection = 'responsibilities';
      continue;
    } else if (lowerLine.includes('requirement') || lowerLine.includes('qualification') || lowerLine.includes('skills required') || lowerLine.includes('what you need') || lowerLine.includes('about you')) {
      currentSection = 'requirements';
      continue;
    } else if (lowerLine.includes('benefit') || lowerLine.includes('perk') || lowerLine.includes('what we offer')) {
      currentSection = 'benefits';
      continue;
    } else if (line.match(/^[A-Z][A-Za-z\s]{3,20}:$/)) {
      currentSection = 'none';
      continue;
    }

    if (line.match(/^[-•*+–]\s*(.+)/) || (currentSection !== 'none' && line.length > 20 && !line.includes('.') && line.charAt(0) === line.charAt(0).toUpperCase())) {
      const bulletText = line.replace(/^[-•*+–]\s*/, '').trim();
      if (bulletText.length > 5) {
        if (currentSection === 'responsibilities') {
          responsibilities.push(bulletText);
        } else if (currentSection === 'requirements') {
          requirements.push(bulletText);
        } else if (currentSection === 'benefits') {
          benefits.push(bulletText);
        }
      }
    }
  }

  if (responsibilities.length === 0) {
    const actionVerbs = ['manage', 'build', 'create', 'develop', 'design', 'lead', 'coordinate', 'support', 'collaborate', 'implement', 'maintain'];
    for (const line of lines) {
      if (actionVerbs.some(verb => line.toLowerCase().includes(verb)) && line.length > 25 && line.length < 150) {
        responsibilities.push(line);
        if (responsibilities.length >= 5) break;
      }
    }
  }

  if (requirements.length === 0) {
    const reqVerbs = ['experience', 'degree', 'knowledge', 'proficiency', 'ability to', 'skills in', 'fluent'];
    for (const line of lines) {
      if (reqVerbs.some(verb => line.toLowerCase().includes(verb)) && line.length > 25 && line.length < 150) {
        requirements.push(line);
        if (requirements.length >= 5) break;
      }
    }
  }

  return {
    jobTitle,
    company,
    location,
    jobDescription: text,
    jobDescriptionRaw: text,
    salary: (salaryMin || salaryMax) ? {
      min: salaryMin,
      max: salaryMax,
      currency: salaryCurrency,
      period: salaryPeriod
    } : undefined,
    experienceLevel,
    sponsorship,
    tags: tags.slice(0, 8),
    benefits: benefits.slice(0, 5),
    extractedJd: {
      role: {
        job_title: { value: jobTitle },
        seniority_level: { value: experienceLevel }
      },
      company: {
        company_name: { value: company }
      },
      location: {
        location_raw: location
      },
      compensation: {
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency,
        salary_period: salaryPeriod === 'yearly' ? 'annual' : salaryPeriod === 'monthly' ? 'monthly' : salaryPeriod === 'hourly' ? 'hourly' : 'annual',
        benefits: benefits.map(b => ({ detail: b }))
      },
      role_content: {
        responsibilities: responsibilities.map(r => ({ text: r })),
        requirements_must_have: requirements.map(r => ({ text: r }))
      },
      skills: {
        skills_technical: atsKeywords.map(k => ({ skill: k }))
      },
      jd_quality: {
        jd_quality_score: 75,
        jd_quality_grade: 'Local Parse'
      }
    }
  };
};

const JobParserSidebar: React.FC<JobParserSidebarProps> = ({
  isOpen,
  onClose,
  onParseComplete,
  showSaveAndTrack = false,
  onSaveAndTrack,
  initialData,
  matchScore = 82
}) => {
  const { user } = useUnifiedAuth();
  const { membership, loading: membershipLoading, canAccess } = useMembership();
  
  // Navigation & step control states
  const [activeStepper, setActiveStepper] = useState<'add_job' | 'preview'>('add_job');
  const [activeTab, setActiveTab] = useState<'text_or_url' | 'upload'>('text_or_url');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedJobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  // Form input states
  const [inputText, setInputText] = useState(initialData?.jobDescription || '');
  
  // Editable fields states
  const [editedJobTitle, setEditedJobTitle] = useState('');
  const [editedCompany, setEditedCompany] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid Level');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [sponsorship, setSponsorship] = useState<'yes' | 'no' | 'unknown'>('unknown');
  
  const [editedSalary, setEditedSalary] = useState<{ min?: number; max?: number; currency?: string; period?: 'hourly' | 'monthly' | 'yearly' }>({
    min: undefined,
    max: undefined,
    currency: 'USD',
    period: 'yearly'
  });
  
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedBenefits, setEditedBenefits] = useState<string[]>([]);
  const [editedResponsibilities, setEditedResponsibilities] = useState<string[]>([]);
  const [editedRequirements, setEditedRequirements] = useState<string[]>([]);
  const [editedAtsKeywords, setEditedAtsKeywords] = useState<string[]>([]);

  // Inline edit state flags for cards
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingResponsibilities, setIsEditingResponsibilities] = useState(false);
  const [isEditingRequirements, setIsEditingRequirements] = useState(false);
  const [isEditingAtsKeywords, setIsEditingAtsKeywords] = useState(false);

  // Reset all states when sidebar opens/closes
  useEffect(() => {
    if (!isOpen) {
      setInputText('');
      setParsedData(null);
      setError(null);
      setIsParsing(false);
      setIsSaving(false);
      setActiveStepper('add_job');
      setActiveTab('text_or_url');
      setIsAccordionOpen(false);
      
      // Reset edit mode triggers
      setIsEditingOverview(false);
      setIsEditingSalary(false);
      setIsEditingSkills(false);
      setIsEditingResponsibilities(false);
      setIsEditingRequirements(false);
      setIsEditingAtsKeywords(false);
      
      // Reset values
      setEditedJobTitle('');
      setEditedCompany('');
      setEditedLocation('');
      setExperienceLevel('Mid Level');
      setEmploymentType('Full-time');
      setSponsorship('unknown');
      setEditedSalary({ min: undefined, max: undefined, currency: 'USD', period: 'yearly' });
      setEditedTags([]);
      setEditedBenefits([]);
      setEditedResponsibilities([]);
      setEditedRequirements([]);
      setEditedAtsKeywords([]);
    } else {
      if (initialData?.jobDescription) {
        setInputText(initialData.jobDescription);
      }
    }
  }, [isOpen, initialData]);

  // Read from clipboard utility
  const handleClipboardPaste = async (source: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        toast.success(`Pasted job description from ${source}!`);
      } else {
        toast.error('Clipboard is empty. Please copy a job description first.');
      }
    } catch (err) {
      toast.error('Could not access clipboard. Please paste manually into the text area.');
    }
  };

  // AI-powered cleaning of raw job description text
  const handleCleanTextWithAI = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput) return;

    setIsCleaning(true);
    try {
      const response = await fetch('/api/jobs/clean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: trimmedInput })
      });

      if (!response.ok) {
        throw new Error('Failed to clean job description');
      }

      const data = await response.json();
      if (data.success && data.cleanedText) {
        setInputText(data.cleanedText);
        toast.success('Job description cleaned with AI!');
      } else {
        throw new Error('Could not parse clean text');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to clean text');
    } finally {
      setIsCleaning(false);
    }
  };

  // Perform parsing using API
  const handleParse = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput) {
      setError('Please enter job description text or a job listing URL');
      return;
    }

    setIsParsing(true);
    setError(null);
    setParsedData(null);

    // Helper to fall back to client-side parsing
    const runClientSideFallback = () => {
      try {
        const localParsed = parseJobDescriptionClientSide(trimmedInput);
        setParsedData(localParsed);
        
        // Initialize basic fields
        setEditedJobTitle(localParsed.jobTitle || '');
        setEditedCompany(localParsed.company || '');
        setEditedLocation(localParsed.location || '');
        
        if (localParsed.salary) {
          setEditedSalary({
            min: localParsed.salary.min,
            max: localParsed.salary.max,
            currency: localParsed.salary.currency || 'USD',
            period: localParsed.salary.period || 'yearly'
          });
        }
        
        setEditedTags(localParsed.tags || []);
        setExperienceLevel(localParsed.experienceLevel || 'Mid Level');
        setSponsorship((localParsed.sponsorship as 'yes' | 'no' | 'unknown') || 'unknown');
        
        const richData = localParsed.extractedJd;
        
        // Responsibilities
        const respList = richData?.role_content?.responsibilities?.map((r: any) => r.text) || [];
        setEditedResponsibilities(respList.filter(Boolean));

        // Requirements
        const reqList = richData?.role_content?.requirements_must_have?.map((r: any) => r.text) || [];
        setEditedRequirements(reqList.filter(Boolean));

        // ATS Keywords
        const keywordsList = richData?.skills?.skills_technical?.map((k: any) => k.skill) || [];
        setEditedAtsKeywords(keywordsList.filter(Boolean));

        // Benefits
        setEditedBenefits(localParsed.benefits || []);
        
        setEmploymentType('Full-time'); // Default

        // Move to Preview tab automatically
        setActiveStepper('preview');
        toast.success('Job details extracted locally!');
      } catch (err: any) {
        setError('Failed to extract job details locally.');
        toast.error('Local extraction failed.');
      } finally {
        setIsParsing(false);
      }
    };

    // If guest or free tier, run client side parser fallback
    if (!user?.id || !canAccess('jobParsing')) {
      setTimeout(() => {
        runClientSideFallback();
      }, 600);
      return;
    }

    // Detect if input is a URL
    const isUrl = /^https?:\/\/[^\s]+$/.test(trimmedInput);

    try {
      const response = await fetch('/api/jobs/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isUrl
            ? { url: trimmedInput }
            : { text: trimmedInput }
        ),
      });

      if (!response.ok) {
        console.warn('API parsing failed, falling back to local extraction');
        runClientSideFallback();
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setParsedData(result.data);
        
        // Initialize basic fields
        setEditedJobTitle(result.data.jobTitle || '');
        setEditedCompany(result.data.company || '');
        setEditedLocation(result.data.location || '');
        
        if (result.data.salary) {
          setEditedSalary({
            min: result.data.salary.min,
            max: result.data.salary.max,
            currency: result.data.salary.currency || 'USD',
            period: result.data.salary.period || 'yearly'
          });
        }
        
        if (result.data.tags) {
          setEditedTags(result.data.tags);
        }

        if (result.data.experienceLevel) {
          setExperienceLevel(result.data.experienceLevel);
        }

        // Handle Sponsorship
        if (result.data.sponsorship) {
          setSponsorship(result.data.sponsorship);
        } else {
          setSponsorship('unknown');
        }

        // Initialize lists from rich extraction structure
        const richData = result.data.extractedJd || result.extracted?.richData || result.data.richData;
        
        // 1. Responsibilities
        let respList: string[] = [];
        if (richData?.role_content?.responsibilities) {
          respList = richData.role_content.responsibilities.map((r: any) => typeof r === 'string' ? r : (r.text || r.detail || ''));
        } else if (result.extracted?.requirements) {
          respList = result.extracted.requirements;
        }
        setEditedResponsibilities(respList.filter(Boolean));

        // 2. Education & Requirements
        let reqList: string[] = [];
        if (richData?.role_content?.requirements_must_have) {
          reqList = richData.role_content.requirements_must_have.map((r: any) => typeof r === 'string' ? r : (r.text || r.detail || ''));
        } else if (richData?.role_content?.requirements_nice_to_have) {
          reqList = richData.role_content.requirements_nice_to_have.map((r: any) => typeof r === 'string' ? r : (r.text || r.detail || ''));
        }
        setEditedRequirements(reqList.filter(Boolean));

        // 3. ATS Keywords
        let keywordsList: string[] = [];
        if (richData?.skills?.skills_technical) {
          keywordsList = richData.skills.skills_technical.map((s: any) => typeof s === 'string' ? s : (s.skill || s.name || ''));
        } else if (result.extracted?.skills) {
          keywordsList = result.extracted.skills;
        }
        setEditedAtsKeywords(keywordsList.filter(Boolean));

        // 4. Employment Type
        if (richData?.employment_terms?.employment_type?.value) {
          setEmploymentType(richData.employment_terms.employment_type.value);
        } else {
          setEmploymentType('Full-time');
        }

        // 5. Benefits
        let benefitsList: string[] = [];
        if (richData?.compensation?.benefits) {
          benefitsList = richData.compensation.benefits.map((b: any) => typeof b === 'string' ? b : (b.detail || b.text || ''));
        } else if (result.data.benefits) {
          benefitsList = result.data.benefits;
        } else if (result.extracted?.benefits) {
          benefitsList = result.extracted.benefits;
        }
        setEditedBenefits(benefitsList.filter(Boolean));

        // Move to Preview tab automatically
        setActiveStepper('preview');
        toast.success('Job description parsed successfully!');
      } else {
        console.warn('API parsing success check failed, using local extraction');
        runClientSideFallback();
      }
    } catch (err: any) {
      console.warn('API parsing exception caught, using local extraction:', err);
      runClientSideFallback();
    }
  };

  // Save the job to the database or send it back via callback
  const handleSave = async () => {
    if (!parsedData) return;

    const isUrlInput = /^https?:\/\/[^\s]+$/.test(inputText.trim());

    // Build finalized job data mapped to database schema
    const updatedData: any = {
      jobTitle: editedJobTitle || parsedData.jobTitle,
      company: editedCompany || parsedData.company,
      location: editedLocation || parsedData.location,
      jobUrl: parsedData.jobUrl || (isUrlInput ? inputText.trim() : ''),
      jobDescription: parsedData.jobDescription || (isUrlInput ? '' : inputText),
      jobDescriptionRaw: parsedData.jobDescriptionRaw || inputText,
      salary: editedSalary,
      sponsorship: sponsorship,
      tags: editedTags,
      status: 'created',
      priority: 'medium',
      source: parsedData.source || (isUrlInput ? 'linkedin' : 'manual'),
      sourceUrl: parsedData.sourceUrl || (isUrlInput ? inputText.trim() : ''),
      extractedJd: {
        ...parsedData.extractedJd,
        role: {
          ...parsedData.extractedJd?.role,
          job_title: { value: editedJobTitle || parsedData.jobTitle },
          seniority_level: { value: experienceLevel }
        },
        company: {
          ...parsedData.extractedJd?.company,
          company_name: { value: editedCompany || parsedData.company }
        },
        location: {
          ...parsedData.extractedJd?.location,
          location_raw: editedLocation || parsedData.location
        },
        compensation: {
          ...parsedData.extractedJd?.compensation,
          salary_min: editedSalary?.min,
          salary_max: editedSalary?.max,
          salary_currency: editedSalary?.currency,
          salary_period: editedSalary?.period === 'yearly' ? 'annual' : editedSalary?.period === 'monthly' ? 'monthly' : editedSalary?.period === 'hourly' ? 'hourly' : 'annual',
          benefits: editedBenefits.map(b => ({ detail: b }))
        },
        role_content: {
          ...parsedData.extractedJd?.role_content,
          responsibilities: editedResponsibilities.map(r => ({ text: r })),
          requirements_must_have: editedRequirements.map(req => ({ text: req }))
        },
        skills: {
          ...parsedData.extractedJd?.skills,
          skills_technical: editedAtsKeywords.map(k => ({ skill: k }))
        }
      }
    };

    if (user?.id) {
      setIsSaving(true);
      try {
        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
          const errText = await response.text();
          let errMessage = 'Failed to save job';
          try {
            const errObj = JSON.parse(errText);
            errMessage = errObj.error || errMessage;
          } catch (_) {}
          throw new Error(errMessage);
        }

        const savedResult = await response.json();
        if (savedResult.success && savedResult.data) {
          toast.success('Job successfully saved and tracked!');
          onParseComplete(savedResult.data);
          handleClose();
        } else {
          throw new Error('Failed to save job');
        }
      } catch (err: any) {
        console.error('Error saving job application:', err);
        toast.error(err.message || 'Failed to save job');
      } finally {
        setIsSaving(false);
      }
    } else {
      // In guest mode, bypass DB call and hand off to parent callback
      onParseComplete(updatedData);
      handleClose();
    }
  };

  const handleClose = () => {
    if (isOpen) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {/* Sidebar Backdrop Overlay */}
      {isOpen && (
        <motion.div
          key="job-parser-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm z-[9998] transition-opacity duration-300"
        />
      )}

      {/* Sidebar Main Panel */}
      {isOpen && (
        <motion.div
          key="job-parser-sidebar-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="fixed inset-y-0 right-0 w-full max-w-[580px] bg-white dark:bg-[#090b07] text-gray-900 dark:text-[#ebebeb] shadow-2xl border-l border-gray-200 dark:border-white/5 flex flex-col z-[9999] overflow-hidden"
        >
          {/* Upper Header Section */}
          <div className="p-6 border-b border-gray-200 dark:border-white/5 flex flex-col relative shrink-0">
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-lime-100 dark:bg-lime-950/40 border border-lime-200 dark:border-lime-500/20 flex items-center justify-center text-lime-600 dark:text-lime-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                Smart Job Tracker
                <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-lime-700 dark:text-lime-400 bg-lime-105 dark:bg-lime-950/50 border border-lime-200 dark:border-lime-500/30 rounded-md">
                  BETA
                </span>
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
              AI extracts. You decide. We remember.
            </p>
          </div>

          {/* Stepper Steps (Tab Controllers) */}
          <div className="px-6 pt-4 shrink-0">
            <div className="flex bg-gray-100 dark:bg-[#0f120a] border border-gray-200 dark:border-white/5 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setActiveStepper('add_job')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                  activeStepper === 'add_job'
                    ? 'bg-white border-gray-200 text-gray-900 dark:bg-[#1b2216] dark:border-white/10 dark:text-white shadow-sm font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current text-[10px]">1</span>
                Add Job
              </button>
              <button
                onClick={() => parsedData && setActiveStepper('preview')}
                disabled={!parsedData}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                  activeStepper === 'preview'
                    ? 'bg-white border-gray-200 text-gray-900 dark:bg-[#1b2216] dark:border-white/10 dark:text-white shadow-sm font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-30 disabled:hover:text-gray-500'
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current text-[10px]">2</span>
                Preview
              </button>
            </div>
          </div>

          {/* Main Scrollable View Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-rose-950/20 border border-rose-500/20 rounded-2xl text-xs">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-rose-300 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {activeStepper === 'add_job' ? (
              /* STEP 1: ADD JOB DETAILS PANELS */
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Add job details</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed font-medium">
                    Paste the job description and let AI do the heavy lifting.
                  </p>
                </div>

                {/* Horizontal Segmented Tabs: Paste Text/URL or Upload File */}
                <div className="flex bg-gray-100 dark:bg-[#0e120a] border border-gray-200 dark:border-white/5 rounded-xl p-1 gap-1 shrink-0">
                  <button
                    onClick={() => setActiveTab('text_or_url')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                      activeTab === 'text_or_url'
                        ? 'bg-white border-gray-205 text-lime-600 dark:bg-[#1a2015] dark:border-white/5 dark:text-lime-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <Clipboard className="w-4 h-4" />
                    Paste Text or URL
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                      activeTab === 'upload'
                        ? 'bg-white border-gray-205 text-lime-600 dark:bg-[#1a2015] dark:border-white/5 dark:text-lime-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                </div>

                {activeTab === 'text_or_url' ? (
                  <div className="space-y-4">
                    {/* Paste Description / URL Box */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Paste job description or URL</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCleanTextWithAI}
                            disabled={isCleaning || !inputText.trim()}
                            className="text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300 font-bold flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCleaning ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-lime-600 dark:text-lime-400" />
                                Cleaning...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
                                Clean with AI
                              </>
                            )}
                          </button>
                          <a href="#" className="text-gray-550 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400 animate-pulse" />
                            Tips for better results
                          </a>
                        </div>
                      </div>
                      
                      <div className="relative border border-gray-200 dark:border-white/10 rounded-2xl p-4 bg-gray-50/50 dark:bg-[#0a0d08] focus-within:border-lime-500 focus-within:dark:border-lime-500/40 focus-within:ring-1 focus-within:ring-lime-500/20 transition-all">
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Paste the full job description or enter a job listing URL here..."
                          className="w-full h-44 bg-transparent text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none resize-none text-xs leading-relaxed"
                          disabled={isParsing}
                        />
                        
                        {/* Inside Tags Hint */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/5 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-gray-550 dark:text-gray-500 font-medium">Include details about:</span>
                          {['Responsibilities', 'Requirements', 'Skills', 'Qualifications', 'Nice to have'].map((badge) => (
                            <span
                              key={badge}
                              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-[#131710] border border-gray-200 dark:border-white/5 text-[9.5px] text-gray-500 dark:text-gray-400 font-medium"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                        
                        <div className="absolute bottom-4 right-4 text-[9.5px] text-gray-400 dark:text-gray-500 font-mono">
                          {inputText.length.toLocaleString()} / 20,000
                        </div>
                      </div>
                    </div>

                    {/* Social Integrations Quick Paste */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleClipboardPaste('LinkedIn')}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-50 dark:bg-[#0d120a] hover:bg-gray-100 dark:hover:bg-[#13180e] text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 rounded-xl text-xs font-semibold transition-all"
                      >
                        <span className="font-extrabold text-[11px] bg-blue-600 text-white rounded px-1.5 py-0.5">in</span>
                        From LinkedIn
                      </button>
                      <button
                        onClick={() => handleClipboardPaste('Indeed')}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-50 dark:bg-[#0d120a] hover:bg-gray-100 dark:hover:bg-[#13180e] text-teal-600 dark:text-teal-400 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 rounded-xl text-xs font-semibold transition-all"
                      >
                        <span className="font-extrabold text-[11px] bg-teal-600 text-white rounded px-1.5 py-0.5">i</span>
                        From Indeed
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl py-12 px-6 bg-gray-50/30 dark:bg-[#0a0d08] text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">Upload job description file</p>
                    <p className="text-[10px] text-gray-500 mb-4">PDF, DOCX, or TXT up to 5MB</p>
                    <input
                      type="file"
                      id="jd-file-upload"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setInputText(event.target.result as string);
                            setActiveTab('text_or_url');
                            toast.success(`Successfully read text from ${file.name}!`);
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="tablet"
                      className="rounded-xl border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-xs text-gray-700 dark:text-white bg-white dark:bg-transparent"
                      onClick={() => document.getElementById('jd-file-upload')?.click()}
                    >
                      Select File
                    </Button>
                  </div>
                )}

                {/* Accordion for Additional optional info */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] overflow-hidden">
                  <button
                    onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                    className="w-full flex items-center justify-between p-4 text-xs font-bold text-gray-705 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <span>Additional details (optional)</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isAccordionOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isAccordionOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-gray-200 dark:border-white/5 p-4 space-y-4 bg-white dark:bg-[#0d120a]"
                      >
                        {/* Experience level */}
                        <div className="space-y-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Experience level</span>
                          <div className="grid grid-cols-4 gap-2">
                            {['Entry Level', 'Mid Level', 'Senior Level', 'Lead / Manager'].map((level) => {
                              const isActive = experienceLevel === level;
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => setExperienceLevel(level)}
                                  className={`py-2 px-1 text-[10px] font-bold border rounded-xl transition-all ${
                                    isActive
                                      ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-[#1b2216] dark:text-white shadow-sm'
                                      : 'border-gray-200 bg-white text-gray-500 hover:text-gray-900 dark:border-white/5 dark:bg-[#0a0d08] dark:text-gray-450 dark:hover:text-white'
                                  }`}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Employment type */}
                        <div className="space-y-2">
                          <span className="text-xs text-gray-505 dark:text-gray-400 font-medium">Employment type</span>
                          <select
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value)}
                            className="w-full py-2.5 px-3 bg-white dark:bg-[#0a0d08] border border-gray-200 dark:border-white/5 rounded-xl text-xs text-gray-900 dark:text-gray-200 focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                            <option value="Freelance">Freelance</option>
                          </select>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                          <span className="text-xs text-gray-505 dark:text-gray-400 font-medium">Location</span>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={editedLocation}
                              onChange={(e) => setEditedLocation(e.target.value)}
                              placeholder="Enter location (e.g. London, United Kingdom)"
                              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#0a0d08] border border-gray-200 dark:border-white/5 rounded-xl text-xs text-gray-900 dark:text-gray-200 focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* AI Extraction Features Grid */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0b0e08] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                    <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300">AI Extraction</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed font-medium">
                    Our AI will analyze the job description and extract structured information
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1 text-xs text-gray-450 dark:text-gray-400">
                    {[
                      'Job role & seniority',
                      'Salary insights (if available)',
                      'Key skills & keywords',
                      'Education & requirements',
                      'Responsibilities',
                      'And more...'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-400">
                        <div className="w-4 h-4 rounded-full bg-lime-100 dark:bg-lime-950/60 border border-lime-200 dark:border-lime-500/20 text-lime-700 dark:text-lime-400 flex items-center justify-center shrink-0 text-[9px] font-bold">
                          ✓
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action trigger button */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleParse}
                    disabled={isParsing || !inputText}
                    className="w-full py-3.5 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-150 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                        Analyzing & Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white dark:text-black" />
                        Analyze & Preview Job
                      </>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-550 dark:text-gray-500 font-medium">
                    <Zap className="w-3.5 h-3.5 text-lime-600 dark:text-lime-500" />
                    <span>~8 sec</span>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: PREVIEW & DETAILS PANELS */
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Preview & Extracted Details</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed font-medium">
                    Review the information extracted by AI. You can edit before saving.
                  </p>
                </div>

                {/* 1. AI Confidence Score */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] p-4 flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400 animate-pulse" />
                      <span>AI Confidence Score</span>
                      <HelpCircle className="w-3.5 h-3.5 text-gray-450 dark:text-gray-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-gray-950 dark:text-white">
                        {parsedData?.extractedJd?.jd_quality?.jd_quality_score || 92}%
                      </span>
                      <span className="text-[11px] text-lime-700 bg-lime-100 border border-lime-205 dark:text-lime-400 dark:bg-lime-950/50 dark:border-lime-500/20 px-2 py-0.5 rounded-lg font-bold">
                        {parsedData?.extractedJd?.jd_quality?.jd_quality_grade || 'High Confidence'}
                      </span>
                    </div>
                    {/* Bar indicator */}
                    <div className="w-full h-1 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-500"
                        style={{ width: `${parsedData?.extractedJd?.jd_quality?.jd_quality_score || 92}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 ml-4">
                    <Lock className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>

                {/* 2. Job Overview Card */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <LayoutDashboard className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span>Job Overview</span>
                    </div>
                    <button
                      onClick={() => setIsEditingOverview(!isEditingOverview)}
                      className="text-[10px] font-bold text-gray-550 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingOverview ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  {isEditingOverview ? (
                    <div className="space-y-3.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Job Title</label>
                        <input
                          type="text"
                          value={editedJobTitle}
                          onChange={(e) => setEditedJobTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Company</label>
                        <input
                          type="text"
                          value={editedCompany}
                          onChange={(e) => setEditedCompany(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Experience Level</label>
                          <select
                            value={experienceLevel}
                            onChange={(e) => setExperienceLevel(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                          >
                            <option value="Entry Level">Entry Level</option>
                            <option value="Mid Level">Mid Level</option>
                            <option value="Senior Level">Senior Level</option>
                            <option value="Lead / Manager">Lead / Manager</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Location</label>
                          <input
                            type="text"
                            value={editedLocation}
                            onChange={(e) => setEditedLocation(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Employment Type</label>
                          <select
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                            <option value="Freelance">Freelance</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Sponsorship</label>
                          <select
                            value={sponsorship}
                            onChange={(e) => setSponsorship(e.target.value as any)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-white/20"
                          >
                            <option value="yes">Yes (Sponsored)</option>
                            <option value="no">No</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 pt-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-105 to-gray-50 border border-gray-200 dark:from-[#1c2217] dark:to-[#12160f] dark:border-white/5 flex items-center justify-center font-black text-lg text-gray-705 dark:text-lime-400 shrink-0">
                        {editedCompany ? editedCompany.charAt(0).toUpperCase() : 'J'}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-extrabold text-gray-950 dark:text-white text-base truncate">{editedJobTitle || 'Job Title'}</h4>
                        <p className="text-xs text-gray-550 dark:text-gray-400 font-bold tracking-tight">{editedCompany || 'Company'}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {experienceLevel && (
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 text-[10px] text-gray-650 dark:text-gray-300 font-semibold">
                              {experienceLevel}
                            </span>
                          )}
                          {employmentType && (
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 text-[10px] text-gray-655 dark:text-gray-300 font-semibold">
                              {employmentType}
                            </span>
                          )}
                          {editedLocation && (
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 text-[10px] text-gray-655 dark:text-gray-300 font-semibold truncate max-w-[150px]">
                              {editedLocation}
                            </span>
                          )}
                          {sponsorship !== 'unknown' && (
                            <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${
                              sponsorship === 'yes'
                                ? 'bg-lime-50 dark:bg-lime-950/20 border-lime-200 dark:border-lime-500/30 text-lime-700 dark:text-lime-400'
                                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-450'
                            }`}>
                              {sponsorship === 'yes' ? 'Sponsorship' : 'No Sponsorship'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Salary Insights Card */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <DollarSign className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span>Salary Insights</span>
                    </div>
                    <button
                      onClick={() => setIsEditingSalary(!isEditingSalary)}
                      className="text-[10px] font-bold text-gray-550 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingSalary ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  {isEditingSalary ? (
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Min Salary</label>
                        <input
                          type="number"
                          value={editedSalary?.min || ''}
                          onChange={(e) => setEditedSalary({ ...editedSalary, min: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none"
                          placeholder="e.g. 45000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Max Salary</label>
                        <input
                          type="number"
                          value={editedSalary?.max || ''}
                          onChange={(e) => setEditedSalary({ ...editedSalary, max: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none"
                          placeholder="e.g. 65000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Period</label>
                        <select
                          value={editedSalary?.period || 'yearly'}
                          onChange={(e) => setEditedSalary({ ...editedSalary, period: e.target.value as any })}
                          className="w-full px-3 py-2.5 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none"
                        >
                          <option value="hourly">Hourly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-gray-950 dark:text-white text-lg leading-tight">
                          {editedSalary?.min || editedSalary?.max ? (
                            <>
                              {editedSalary.currency === 'GBP' || editedSalary.currency === '£' ? '£' : '$'}
                              {editedSalary.min?.toLocaleString() || '0'} - {editedSalary.currency === 'GBP' || editedSalary.currency === '£' ? '£' : '$'}
                              {editedSalary.max?.toLocaleString() || '0'}
                            </>
                          ) : (
                            'Undisclosed Salary'
                          )}
                        </h4>
                        <p className="text-[10px] text-gray-450 dark:text-gray-500 font-bold uppercase tracking-wider">
                          Estimated Salary Range • {editedSalary?.period || 'yearly'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-105 border border-gray-200 dark:bg-[#12160f] dark:border-white/5 px-3 py-2 rounded-xl text-[10.5px] text-gray-500 dark:text-gray-400 font-semibold">
                        <BarChart2 className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400 shrink-0" />
                        <span>Market Average</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Key Skills Card */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span>Key Skills</span>
                    </div>
                    <button
                      onClick={() => setIsEditingSkills(!isEditingSkills)}
                      className="text-[10px] font-bold text-gray-550 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingSkills ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  <div className="pt-1">
                    {isEditingSkills ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {editedTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-750 dark:bg-[#131710] dark:text-gray-300 border border-gray-200 dark:border-white/5 rounded-lg text-[10px] font-semibold"
                            >
                              {tag}
                              <button
                                onClick={() => setEditedTags(editedTags.filter((t) => t !== tag))}
                                className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Add skill & press Enter..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              e.preventDefault();
                              const newTag = e.currentTarget.value.trim();
                              if (!editedTags.includes(newTag)) {
                                setEditedTags([...editedTags, newTag]);
                              }
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-650"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {editedTags.length > 0 ? (
                          editedTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 dark:bg-[#131710] dark:border-white/5 text-[10px] text-gray-700 dark:text-gray-300 font-semibold"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">No key skills identified</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Key Responsibilities Card */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <CheckCircle className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span>Key Responsibilities</span>
                    </div>
                    <button
                      onClick={() => setIsEditingResponsibilities(!isEditingResponsibilities)}
                      className="text-[10px] font-bold text-gray-555 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingResponsibilities ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  <div className="pt-1">
                    {isEditingResponsibilities ? (
                      <div className="space-y-3">
                        {editedResponsibilities.map((resp, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <textarea
                              value={resp}
                              rows={2}
                              onChange={(e) => {
                                const updated = [...editedResponsibilities];
                                updated[idx] = e.target.value;
                                setEditedResponsibilities(updated);
                              }}
                              className="flex-1 px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none resize-y"
                            />
                            <button
                              onClick={() => setEditedResponsibilities(editedResponsibilities.filter((_, i) => i !== idx))}
                              className="p-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/5 rounded-lg text-gray-500 dark:text-gray-450 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setEditedResponsibilities([...editedResponsibilities, ''])}
                          className="w-full py-2 bg-gray-100 border border-dashed border-gray-300 hover:border-gray-400 dark:bg-[#12160f] dark:border-dashed dark:border-white/10 dark:hover:border-white/20 text-gray-500 dark:text-gray-455 hover:text-gray-850 dark:hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Responsibility
                        </button>
                      </div>
                    ) : (
                      <ul className="space-y-2 list-disc pl-4 text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                        {editedResponsibilities.length > 0 ? (
                          editedResponsibilities.map((resp, idx) => (
                            <li key={idx} className="marker:text-lime-600 dark:marker:text-lime-500">{resp}</li>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">No responsibilities extracted</span>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {/* 6. Education & Requirements Card */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <GraduationCap className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span>Education & Requirements</span>
                    </div>
                    <button
                      onClick={() => setIsEditingRequirements(!isEditingRequirements)}
                      className="text-[10px] font-bold text-gray-555 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingRequirements ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  <div className="pt-1">
                    {isEditingRequirements ? (
                      <div className="space-y-3">
                        {editedRequirements.map((req, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <textarea
                              value={req}
                              rows={2}
                              onChange={(e) => {
                                const updated = [...editedRequirements];
                                updated[idx] = e.target.value;
                                setEditedRequirements(updated);
                              }}
                              className="flex-1 px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none resize-y"
                            />
                            <button
                              onClick={() => setEditedRequirements(editedRequirements.filter((_, i) => i !== idx))}
                              className="p-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/5 rounded-lg text-gray-500 dark:text-gray-450 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setEditedRequirements([...editedRequirements, ''])}
                          className="w-full py-2 bg-gray-100 border border-dashed border-gray-300 hover:border-gray-400 dark:bg-[#12160f] dark:border-dashed dark:border-white/10 dark:hover:border-white/20 text-gray-500 dark:text-gray-455 hover:text-gray-850 dark:hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Requirement
                        </button>
                      </div>
                    ) : (
                      <ul className="space-y-2 list-disc pl-4 text-xs text-gray-705 dark:text-gray-300 font-medium leading-relaxed">
                        {editedRequirements.length > 0 ? (
                          editedRequirements.map((req, idx) => (
                            <li key={idx} className="marker:text-lime-600 dark:marker:text-lime-500">{req}</li>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">No education/experience requirements extracted</span>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {/* 7. ATS Keywords Card */}
                <div className="border border-gray-200 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-[#0d120a] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <ScanLine className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      <span>ATS Keywords</span>
                    </div>
                    <button
                      onClick={() => setIsEditingAtsKeywords(!isEditingAtsKeywords)}
                      className="text-[10px] font-bold text-gray-555 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/5 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      {isEditingAtsKeywords ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  <div className="pt-1">
                    {isEditingAtsKeywords ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {editedAtsKeywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 dark:bg-[#131710] dark:text-gray-300 border border-gray-200 dark:border-white/5 rounded-lg text-[10px] font-semibold"
                            >
                              {kw}
                              <button
                                onClick={() => setEditedAtsKeywords(editedAtsKeywords.filter((k) => k !== kw))}
                                className="text-gray-400 hover:text-rose-605 dark:hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Add keyword & press Enter..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              e.preventDefault();
                              const newKw = e.currentTarget.value.trim();
                              if (!editedAtsKeywords.includes(newKw)) {
                                setEditedAtsKeywords([...editedAtsKeywords, newKw]);
                              }
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-[#050704] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-905 dark:text-white focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-650"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {editedAtsKeywords.length > 0 ? (
                          editedAtsKeywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 dark:bg-[#131710] dark:border-white/5 text-[10px] text-gray-700 dark:text-gray-300 font-semibold"
                            >
                              {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">No ATS keywords extracted</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Panels (based on current stepper tab) */}
          {activeStepper === 'preview' && parsedData && (
            <div className="p-6 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0c0f0a] flex flex-col gap-3 shrink-0">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-lime-500 text-black hover:bg-lime-600 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Saving & Tracking Job...
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4.5 h-4.5 text-black" />
                    Save Job
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveStepper('add_job');
                  setParsedData(null);
                }}
                disabled={isSaving}
                className="w-full py-3.5 border border-gray-250 dark:border-white/10 bg-transparent text-gray-650 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Edit & Regenerate
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Upgrade membership gateway dialog */}
      {showUpgradePopup && (
        <UniversalPaymentModal
          isOpen={showUpgradePopup}
          onClose={() => setShowUpgradePopup(false)}
          preselectedPlanKey="focused_yearly"
        />
      )}
    </AnimatePresence>
  );
};

export default JobParserSidebar;
