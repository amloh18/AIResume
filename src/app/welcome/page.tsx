// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { 
  FileText, 
  Briefcase, 
  Target, 
  Zap, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle,
  Upload, 
  Linkedin, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  ArrowRight,
  Shield,
  Search,
  MapPin,
  DollarSign,
  Building,
  Check,
  Mail,
  Lock,
  Info,
  User as UserIcon,
  Eye,
  EyeOff,
  Palette,
  FileJson,
  Copy,
  X,
  LayoutGrid,
  Trophy,
  TrendingUp,
  Lightbulb,
  History,
  MessageSquare,
  Bot,
  Kanban,
  ExternalLink,
  Sliders,
  Compass,
  Layers,
  Send,
  Award,
  PenTool,
  FilePlus,
  Activity,
  CheckCheck,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/Logo';
import CodeVerificationScreen from '@/components/auth/CodeVerificationScreen';
import { toast } from '@/lib/hot-toast';
import { getStrengthDescription, getWeaknessDescription } from '@/lib/cv-descriptions';
import guestCVService from '@/lib/services/guestCVService';

export type OnboardingStage = 
  | 'INTENT'              // Step 1: What are you here to achieve?
  | 'PROFILE_SEED'        // Step 2: Build Profile (Upload / Paste / LinkedIn / Scratch)
  | 'AI_ANALYSIS'         // Step 3: AI Discovery & Analysis ("Improve & Design My CV")
  | 'CV_READY_FORK'       // Step 4: Profile Ready (Fork: "Just My CV" vs "Find My Next Job")
  | 'JOB_TARGET_ROLES'    // Step 5: What roles are you targeting?
  | 'JOB_WORKPLACE'       // Step 6: Workplace type + locations
  | 'JOB_SALARY'          // Step 7: Salary expectations
  | 'JOB_EXPERIENCE'      // Step 8: Experience level + availability
  | 'JOB_SEARCH_INTENSITY' // Step 9: How actively are you looking?
  | 'JOB_APPLICATION_VOLUME' // Step 10: Expected monthly application volume
  | 'TRACKER_AUTOPILOT'   // Step 11: Application Autopilot / Pipeline Tracker
  | 'JOB_APPLICATION_MODE'   // Step 12: How much should BuildAIResume handle?
  | 'LAUNCH';             // Step 13: Final Launch & CEO Note

export interface CareerPathway {
  id: string;
  name: string;
  icon: string;
  roles: string[];
}

export const CAREER_PATHWAYS: CareerPathway[] = [
  {
    id: 'engineering',
    name: 'Software & Tech',
    icon: '💻',
    roles: [
      'Full Stack Engineer',
      'AI Systems & LLM Engineer',
      'Frontend Engineer (React / Next.js)',
      'Backend Systems Engineer',
      'DevOps & Cloud Architect',
      'Mobile Engineer (iOS / Android / Flutter)',
      'Platform & Infrastructure Engineer',
      'Site Reliability Engineer (SRE)',
      'Cybersecurity & AppSec Engineer',
      'Embedded & IoT Engineer',
      'QA & Test Automation Engineer',
      'Engineering Manager / Tech Lead'
    ]
  },
  {
    id: 'data_ai',
    name: 'Data & AI',
    icon: '📊',
    roles: [
      'Machine Learning Engineer',
      'GenAI / LLM Research Scientist',
      'Data Scientist',
      'Analytics Engineer (dbt / Snowflake)',
      'Data Platform Engineer',
      'Business Intelligence Lead',
      'Data Analyst',
      'MLOps Engineer',
      'Computer Vision / NLP Specialist',
      'AI Product Analyst'
    ]
  },
  {
    id: 'product',
    name: 'Product & Project',
    icon: '🚀',
    roles: [
      'AI Product Manager',
      'Senior Product Manager',
      'Technical Product Manager (TPM)',
      'Principal Product Lead',
      'Growth Product Manager',
      'Project Manager',
      'Scrum Master & Agile Delivery Lead',
      'Product Operations Manager',
      'Program Director',
      'Solutions & Delivery Manager'
    ]
  },
  {
    id: 'design',
    name: 'Design & Creative',
    icon: '🎨',
    roles: [
      'Product Designer (UI/UX)',
      'AI Interaction & Prompt Designer',
      'UX Researcher',
      'Design Systems Lead',
      'Brand & Creative Director',
      'Motion & 3D Interactive Designer',
      'Visual Designer',
      'Graphic Designer',
      'AR/VR Spatial Designer'
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing & Growth',
    icon: '📈',
    roles: [
      'Growth Marketing Lead',
      'Product Marketing Manager (PMM)',
      'Performance & Paid Acquisition Lead',
      'AI Content & SEO Strategist',
      'Lifecycle & CRM Marketing Manager',
      'Brand & Communications Lead',
      'Social & Community Growth Lead',
      'Marketing Analytics & Attribution Lead',
      'Demand Generation Manager'
    ]
  },
  {
    id: 'sales_cs',
    name: 'Sales & Customer Success',
    icon: '💼',
    roles: [
      'Enterprise Account Executive (AE)',
      'Mid-Market Account Executive',
      'Business Development Rep (BDR / SDR)',
      'Customer Success Manager (CSM)',
      'Pre-Sales Solutions Architect',
      'Revenue Operations (RevOps) Manager',
      'Strategic Account Manager',
      'Head of Sales / Sales Director',
      'Client Onboarding Lead'
    ]
  },
  {
    id: 'operations_finance',
    name: 'Operations & Finance',
    icon: '⚙️',
    roles: [
      'Chief of Staff',
      'Business Operations (BizOps) Manager',
      'FP&A / Strategic Finance Lead',
      'Financial Analyst',
      'Corporate Strategy Consultant',
      'Operations Manager',
      'Controller / Senior Accountant',
      'Supply Chain & Procurement Lead',
      'Risk & Compliance Analyst'
    ]
  },
  {
    id: 'hr_people',
    name: 'HR & Recruiting',
    icon: '🤝',
    roles: [
      'Technical Recruiter',
      'Talent Acquisition Lead',
      'People Operations Manager',
      'HR Business Partner (HRBP)',
      'Compensation & Total Rewards Lead',
      'Employee Experience & Culture Partner',
      'Global Mobility & Talent Specialist',
      'Executive Search Lead'
    ]
  }
];

const STAGE_TO_STEP: Record<OnboardingStage | string, number> = {
  'INTENT': 1,
  'PROFILE_SEED': 2,
  'AI_ANALYSIS': 3,
  'CV_READY_FORK': 4,
  'JOB_TARGET_ROLES': 5,
  'JOB_WORKPLACE': 6,
  'JOB_SALARY': 7,
  'JOB_EXPERIENCE': 8,
  'JOB_SEARCH_INTENSITY': 9,
  'JOB_APPLICATION_VOLUME': 10,
  'TRACKER_AUTOPILOT': 11,
  'JOB_APPLICATION_MODE': 12,
  'LAUNCH': 13,
  // Backward-compatible mappings for old stage names
  'JOB_TARGETS': 5,
  'JOB_INTENSITY': 9,
  'JOB_VOLUME': 10,
  'AUTO_APPLY': 12,
  'CAREER_ADVANTAGE': 12,
};

export const WELCOME_SALARY_CONFIG: Record<
  string,
  {
    label: string;
    symbol: string;
    unit: string;
    presets: { label: string; value: number }[];
    defaultVal: number;
  }
> = {
  INR_LPA: {
    label: 'INR (₹)',
    symbol: '₹',
    unit: 'LPA',
    presets: [
      { label: '₹8 LPA', value: 8 },
      { label: '₹12 LPA', value: 12 },
      { label: '₹18 LPA', value: 18 },
      { label: '₹25 LPA', value: 25 },
      { label: '₹35 LPA', value: 35 },
      { label: '₹50 LPA', value: 50 },
    ],
    defaultVal: 18,
  },
  GBP: {
    label: 'GBP (£)',
    symbol: '£',
    unit: '/year',
    presets: [
      { label: '£45,000 /yr', value: 45000 },
      { label: '£65,000 /yr', value: 65000 },
      { label: '£85,000 /yr', value: 85000 },
      { label: '£110,000 /yr', value: 110000 },
      { label: '£140,000 /yr', value: 140000 },
    ],
    defaultVal: 65000,
  },
  USD: {
    label: 'USD ($)',
    symbol: '$',
    unit: '/year',
    presets: [
      { label: '$60,000 /yr', value: 60000 },
      { label: '$90,000 /yr', value: 90000 },
      { label: '$120,000 /yr', value: 120000 },
      { label: '$150,000 /yr', value: 150000 },
      { label: '$200,000 /yr', value: 200000 },
    ],
    defaultVal: 90000,
  },
  EUR: {
    label: 'EUR (€)',
    symbol: '€',
    unit: '/year',
    presets: [
      { label: '€50,000 /yr', value: 50000 },
      { label: '€70,000 /yr', value: 70000 },
      { label: '€90,000 /yr', value: 90000 },
      { label: '€120,000 /yr', value: 120000 },
    ],
    defaultVal: 70000,
  },
};

const STEP_TO_STAGE: Record<number, OnboardingStage> = {
  1: 'INTENT',
  2: 'PROFILE_SEED',
  3: 'AI_ANALYSIS',
  4: 'CV_READY_FORK',
  5: 'JOB_TARGET_ROLES',
  6: 'JOB_WORKPLACE',
  7: 'JOB_SALARY',
  8: 'JOB_EXPERIENCE',
  9: 'JOB_SEARCH_INTENSITY',
  10: 'JOB_APPLICATION_VOLUME',
  11: 'TRACKER_AUTOPILOT',
  12: 'JOB_APPLICATION_MODE',
  13: 'LAUNCH'
};

function WelcomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  // Onboarding Stage and Step State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [lifecycleState, setLifecycleState] = useState<string>('NEW');
  const [primaryCvId, setPrimaryCvId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<any>(null);
  const [trackerAnimStage, setTrackerAnimStage] = useState(0);
  const [editorCompleted, setEditorCompleted] = useState(false);
  const [initialScore, setInitialScore] = useState<number>(0);
  const [transformedScore, setTransformedScore] = useState<number>(0);
  
  // Selections
  const [intent, setIntent] = useState<string>('job_search'); // Default to full ecosystem or 'cv'
  const [seedingMethod, setSeedingMethod] = useState<string>('');
  const [cvScore, setCVScore] = useState<number>(0);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [monthlyVolume, setMonthlyVolume] = useState<string>('');
  const [trackerInterest, setTrackerInterest] = useState<string>('');
  const [autoapplyInterest, setAutoapplyInterest] = useState<string>('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<string>('');
  const [salary, setSalary] = useState<string>('');
  const [visaRequired, setVisaRequired] = useState<boolean | null>(null);

  // Canonical job-search preferences (persisted to autoApplyPreferences)
  const [workplaceTypes, setWorkplaceTypes] = useState<string[]>(['remote']);
  const [salaryMin, setSalaryMin] = useState<number>(18);
  const [salaryCurrency, setSalaryCurrency] = useState<string>('INR_LPA');
  const [experienceYears, setExperienceYears] = useState<number>(2);
  const [maxNoticePeriodDays, setMaxNoticePeriodDays] = useState<number>(30);
  const [searchIntensity, setSearchIntensity] = useState<string>('');
  const [expectedApplicationsPerMonth, setExpectedApplicationsPerMonth] = useState<number>(50);
  const [applicationMode, setApplicationMode] = useState<string>('');

  const handleSalaryCurrencyChange = (newCur: string) => {
    setSalaryCurrency(newCur);
    const cfg = WELCOME_SALARY_CONFIG[newCur];
    if (cfg) {
      setSalaryMin(cfg.defaultVal);
    }
  };

  // Parser Simulator State
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStep, setParseStep] = useState(0);
  const [droppedFile, setDroppedFile] = useState<string>('');
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [parsedCVData, setParsedCVData] = useState<any>(null);
  const [parseError, setParseError] = useState<string>('');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const [selectedPathway, setSelectedPathway] = useState<string>('engineering');
  const [customRoleInput, setCustomRoleInput] = useState<string>('');
  const [loadedProfileName, setLoadedProfileName] = useState<string>('');
  const [loadedProfileRole, setLoadedProfileRole] = useState<string>('');

  const currentPathway = useMemo(() => {
    return CAREER_PATHWAYS.find(p => p.id === selectedPathway) || CAREER_PATHWAYS[0];
  }, [selectedPathway]);

  // Extract personalized details from parsed CV or Master CV profile
  const candidateName = useMemo(() => {
    if (parsedCVData?.basics?.name) {
      return parsedCVData.basics.name.trim().split(' ')[0];
    }
    if (parsedCVData?.personalInfo?.fullName) {
      return parsedCVData.personalInfo.fullName.trim().split(' ')[0];
    }
    if (loadedProfileName) {
      return loadedProfileName.trim().split(' ')[0];
    }
    if (session?.user?.name) {
      return session.user.name.trim().split(' ')[0];
    }
    return '';
  }, [parsedCVData, loadedProfileName, session]);

  // Step 12 CEO Letter Typewriter Effect
  const letterParagraphs = useMemo(() => [
    `Dear ${candidateName || 'candidate'},`,
    `Welcome to AIResume. We built this platform to take the tedious manual labor out of your job search so you can focus on landing roles you truly love.`,
    `Your Profile is set up and will power your automated application tracking, tailored cover letters, and interview coaching.`
  ], [candidateName]);

  const fullLetterText = useMemo(() => letterParagraphs.join('\n\n'), [letterParagraphs]);
  const [typedLetterLength, setTypedLetterLength] = useState<number>(0);
  const [isTypingLetter, setIsTypingLetter] = useState<boolean>(true);

  useEffect(() => {
    if (currentStep === 13) {
      setTypedLetterLength(0);
      setIsTypingLetter(true);
      let currentLen = 0;
      const targetLen = fullLetterText.length;

      const timer = setInterval(() => {
        currentLen += 2;
        if (currentLen >= targetLen) {
          setTypedLetterLength(targetLen);
          setIsTypingLetter(false);
          clearInterval(timer);
        } else {
          setTypedLetterLength(currentLen);
        }
      }, 15);

      return () => clearInterval(timer);
    }
  }, [currentStep, fullLetterText]);

  const candidateRole = useMemo(() => {
    if (parsedCVData?.basics?.label) return parsedCVData.basics.label;
    if (parsedCVData?.personalInfo?.jobTitle) return parsedCVData.personalInfo.jobTitle;
    if (parsedCVData?.work?.[0]?.position) return parsedCVData.work[0].position;
    if (loadedProfileRole) return loadedProfileRole;
    return '';
  }, [parsedCVData, loadedProfileRole]);

  // Pre-fill target roles and infer pathway if detected from CV
  useEffect(() => {
    if (candidateRole) {
      const r = candidateRole.toLowerCase();
      let matchedPathway = 'engineering';
      if (r.includes('data') || r.includes('ai') || r.includes('machine learning') || r.includes('analyst') || r.includes('intelligence') || r.includes('bi')) {
        matchedPathway = 'data_ai';
      } else if (r.includes('design') || r.includes('ux') || r.includes('ui') || r.includes('creative') || r.includes('graphic') || r.includes('art')) {
        matchedPathway = 'design';
      } else if (r.includes('product') || r.includes('scrum') || r.includes('project') || r.includes('program') || r.includes('agile')) {
        matchedPathway = 'product';
      } else if (r.includes('market') || r.includes('growth') || r.includes('seo') || r.includes('content') || r.includes('social')) {
        matchedPathway = 'marketing';
      } else if (r.includes('sales') || r.includes('account') || r.includes('success') || r.includes('bdr') || r.includes('sdr') || r.includes('business dev')) {
        matchedPathway = 'sales_cs';
      } else if (r.includes('operat') || r.includes('financ') || r.includes('accounting') || r.includes('supply') || r.includes('consultant')) {
        matchedPathway = 'operations_finance';
      } else if (r.includes('hr') || r.includes('recruit') || r.includes('talent') || r.includes('people')) {
        matchedPathway = 'hr_people';
      }
      setSelectedPathway(matchedPathway);
      if (targetRoles.length === 0) {
        setTargetRoles([candidateRole]);
      }
    }
  }, [candidateRole]);

  // Step 3 Collapsible Panels state
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    keywords: true,
    strengths: true,
    gaps: true,
    actions: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const defaultSnapshot = useMemo(() => ({
    healthIndex: cvScore || 0,
    breakdown: {
      structure: 14,
      readability: 13,
      contentStrength: 12,
      skillsKeywords: 11,
      impactAchievements: 10,
    },
    stats: {
      pagesDetected: 1,
      totalWords: 350,
      experienceYears: 2,
      skillsFound: 8,
      sectionsDetected: 5
    },
    missingKeywords: ['Agile', 'Leadership', 'Project Management', 'Data Analysis', 'Stakeholder Management'],
    strengths: ['Clear experience timeline', 'Strong contact layout', 'Essential skills listing'],
    weaknesses: ['Add metrics/quantified results', 'Add industry standard keywords', 'Include professional summary'],
    potentialBoost: 24,
    topPriority: 'Add quantified achievements to work history'
  }), [cvScore]);

  const activeSnapshot = useMemo(() => {
    if (!analysisSnapshot) return defaultSnapshot;
    return {
      healthIndex: analysisSnapshot.healthIndex ?? cvScore ?? defaultSnapshot.healthIndex,
      breakdown: {
        structure: analysisSnapshot.breakdown?.structure ?? defaultSnapshot.breakdown.structure,
        readability: analysisSnapshot.breakdown?.readability ?? defaultSnapshot.breakdown.readability,
        contentStrength: analysisSnapshot.breakdown?.contentStrength ?? defaultSnapshot.breakdown.contentStrength,
        skillsKeywords: analysisSnapshot.breakdown?.skillsKeywords ?? defaultSnapshot.breakdown.skillsKeywords,
        impactAchievements: analysisSnapshot.breakdown?.impactAchievements ?? defaultSnapshot.breakdown.impactAchievements,
      },
      stats: {
        pagesDetected: analysisSnapshot.stats?.pagesDetected ?? defaultSnapshot.stats.pagesDetected,
        totalWords: analysisSnapshot.stats?.totalWords ?? defaultSnapshot.stats.totalWords,
        experienceYears: analysisSnapshot.stats?.experienceYears ?? defaultSnapshot.stats.experienceYears,
        skillsFound: analysisSnapshot.stats?.skillsFound ?? defaultSnapshot.stats.skillsFound,
        sectionsDetected: analysisSnapshot.stats?.sectionsDetected ?? defaultSnapshot.stats.sectionsDetected,
      },
      missingKeywords: analysisSnapshot.missingKeywords ?? defaultSnapshot.missingKeywords,
      strengths: analysisSnapshot.strengths?.length ? analysisSnapshot.strengths : defaultSnapshot.strengths,
      weaknesses: analysisSnapshot.weaknesses?.length ? analysisSnapshot.weaknesses : defaultSnapshot.weaknesses,
      potentialBoost: analysisSnapshot.potentialBoost ?? defaultSnapshot.potentialBoost,
      topPriority: analysisSnapshot.topPriority ?? defaultSnapshot.topPriority,
    };
  }, [analysisSnapshot, defaultSnapshot, cvScore]);

  // Validation logic: check if required fields are filled for current step
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!intent;
      case 2:
        return seedingMethod === 'scratch' || !!parsedCVData;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        // Target roles are required
        return targetRoles.length > 0;
      case 6:
        // Workplace types are required
        return workplaceTypes.length > 0;
      case 7:
        // Salary step is always valid (optional)
        return true;
      case 8:
        // Experience step is always valid (optional)
        return true;
      case 9:
        // Search intensity is required
        return !!searchIntensity;
      case 10:
        // Application volume is required
        return expectedApplicationsPerMonth > 0;
      case 11:
        // Tracker Autopilot (optional / default yes)
        return true;
      case 12:
        // Application mode is required
        return !!applicationMode;
      case 13:
        return true;
      default:
        return true;
    }
  }, [currentStep, intent, seedingMethod, parsedCVData, targetRoles, workplaceTypes, searchIntensity, expectedApplicationsPerMonth, applicationMode]);

  // Save Onboarding Session to API (Full User Account Persistence)
  const saveSession = async (updates: any = {}) => {
    try {
      // Skip API call for anonymous/guest users — persist to localStorage only
      if (status !== 'authenticated') {
        return;
      }

      const payload = {
        primary_goal: intent,
        confidence_score: cvScore,
        initial_score: initialScore,
        transformed_score: transformedScore,
        career_pathway: selectedPathway,
        target_roles: targetRoles,
        locations: locations,
        experience_level: experienceLevel,
        salary_range: salary,
        visa_required: visaRequired,
        search_status: searchStatus,
        monthly_volume: monthlyVolume,
        tracker_interest: trackerInterest,
        autoapply_interest: autoapplyInterest,
        candidate_name: candidateName,
        candidate_role: candidateRole,
        primary_cv_id: primaryCvId,
        // Canonical job-search preferences
        workplace_types: workplaceTypes,
        salary_min: salaryMin,
        salary_currency: salaryCurrency,
        experience_years: experienceYears,
        max_notice_period_days: maxNoticePeriodDays,
        search_intensity: searchIntensity,
        expected_applications_per_month: expectedApplicationsPerMonth,
        application_mode: applicationMode,
        ...updates
      };

      await fetch('/api/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Persist to canonical JobSearchProfile for job-search steps
      if (currentStep >= 5 && currentStep <= 13 && status === 'authenticated') {
        const profileUpdates: Record<string, any> = {};
        if (currentStep === 5) profileUpdates.targetRoles = targetRoles;
        if (currentStep === 6) {
          profileUpdates.workplaceTypes = workplaceTypes;
          profileUpdates.locations = locations;
        }
        if (currentStep === 7) {
          profileUpdates.minSalary = salaryMin;
          profileUpdates.salaryCurrency = salaryCurrency;
        }
        if (currentStep === 8) {
          profileUpdates.experienceYears = experienceYears;
          profileUpdates.maxNoticePeriodDays = maxNoticePeriodDays;
        }
        if (currentStep === 9) profileUpdates.searchIntensity = searchIntensity;
        if (currentStep === 10) profileUpdates.expectedApplicationsPerMonth = expectedApplicationsPerMonth;
        if (currentStep === 12) profileUpdates.applicationMode = applicationMode;

        if (Object.keys(profileUpdates).length > 0) {
          await fetch('/api/job-search-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileData: profileUpdates })
          });
        }
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const savePrimaryCV = async (cvData: any, title: string, score: number) => {
    try {
      if (status === 'authenticated') {
        const response = await fetch('/api/cvs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'Primary Profile',
            cvData: cvData,
            cvType: 'master',
            isMaster: true,
            currentStep: 2,
            metadata: {
              isMaster: true,
              isUserMaster: true,
              createdVia: 'onboarding',
              atsScore: score
            }
          })
        });
        
        const result = await response.json();
        const masterCvId = result.cv?.id || result.cv?._id || result.data?.cv?.id || result.existingMasterCVId;
        
        if (masterCvId) {
          setPrimaryCvId(masterCvId);
          
          const analysisRes = await fetch('/api/cv/analysis-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvId: masterCvId })
          });
          const analysisData = await analysisRes.json();
          if (analysisData.success) {
            setAnalysisSnapshot(analysisData.data);
            setCVScore(analysisData.data.healthIndex);
            setInitialScore(analysisData.data.healthIndex || 0);
            setTransformedScore(Math.min(96, Math.max(analysisData.data.healthIndex || 0, (analysisData.data.healthIndex || 0) + 24)));
          }

          await saveSession({
            primary_cv_id: masterCvId,
            userLifecycleState: 'PRIMARY_CV_CREATED'
          });
          setLifecycleState('PRIMARY_CV_CREATED');
          
          return masterCvId;
        }
      } else {
        // Guest user - save to guest draft!
        const draftResult = await guestCVService.saveGuestDraft({
          cvData: cvData,
          currentStep: 2,
          completedSteps: [],
          cvTitle: title || 'Primary Profile',
        });
        
        if (draftResult.success) {
          setPrimaryCvId('guest-draft');
          
          const analysisRes = await fetch('/api/cv/analysis-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvData: cvData })
          });
          const analysisData = await analysisRes.json();
          if (analysisData.success) {
            setAnalysisSnapshot(analysisData.data);
            setCVScore(analysisData.data.healthIndex);
            setInitialScore(analysisData.data.healthIndex || 0);
            setTransformedScore(Math.min(96, Math.max(analysisData.data.healthIndex || 0, (analysisData.data.healthIndex || 0) + 24)));

            const scoreReport = {
              overall_score: analysisData.data.healthIndex || 0,
              category_scores: [
                { name: 'Structure & Formatting', score: Math.round((analysisData.data.breakdown?.structure || 0) * 5) },
                { name: 'ATS Readability', score: Math.round((analysisData.data.breakdown?.readability || 0) * 5) },
                { name: 'Content Strength', score: Math.round((analysisData.data.breakdown?.contentStrength || 0) * 5) },
                { name: 'Skills & Keywords', score: Math.round((analysisData.data.breakdown?.skillsKeywords || 0) * 5) },
                { name: 'Impact & Achievements', score: Math.round((analysisData.data.breakdown?.impactAchievements || 0) * 5) }
              ],
              jd_keyword_match: {
                keywords_hit: analysisData.data.stats?.skillsFound || 0,
                keywords_missed: analysisData.data.missingKeywords?.length || 0,
                keywords_partial: 0,
                keywords: [
                  ...(analysisData.data.missingKeywords || []).map((k: string) => ({ label: k, status: 'miss' }))
                ]
              },
              strengths: (analysisData.data.strengths || []).map((s: string) => ({ title: s, detail: 'Identified as a core strength in onboarding analysis.' })),
              gaps: (analysisData.data.weaknesses || []).map((w: string) => ({ title: w, detail: 'Improvement suggested during onboarding scan.' })),
              actions: (analysisData.data.weaknesses || []).map((w: string, i: number) => ({ step: i + 1, title: w, detail: 'Add related achievements or correct formatting.' })),
              verdict: 'Onboarding Analysis Completed',
              verdict_sub: analysisData.data.healthIndex >= 80 ? 'Competitive CV' : 'Optimization Recommended'
            };

            await guestCVService.saveGuestDraft({
              cvData: cvData,
              currentStep: 2,
              completedSteps: [],
              cvTitle: title || 'Primary Profile',
              aiAnalysis: {
                score: analysisData.data.healthIndex || 0,
                scoreReport: scoreReport
              }
            });
          }

          await saveSession({
            primary_cv_id: 'guest-draft',
            userLifecycleState: 'PRIMARY_CV_CREATED'
          });
          setLifecycleState('PRIMARY_CV_CREATED');
          
          return 'guest-draft';
        }
      }
    } catch (err) {
      console.error('Failed to save primary CV:', err);
    }
    return null;
  };

  const triggerNotification = (message: string) => {
    toast.success(message, {
      duration: 4000,
      position: 'bottom-right',
    });
  };

  // Pricing Plans (fetched from API)
  const [plans, setPlans] = useState<any[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const hasInitializedRef = useRef(false);

  // Load Onboarding Session & URL query params (Runs ONCE on mount)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initSession = async () => {
      setIsLoadingSession(true);
      try {
        await fetch('/api/auth/anonymous-session');
        
        const sessionRes = await fetch('/api/user/onboarding');
        const sessionData = await sessionRes.json();
        
        const stageParam = searchParams.get('stage');
        const stepParam = searchParams.get('step');

        if (stageParam === 'cv_ready' || stepParam === '4') {
          setCurrentStep(4);
          setEditorCompleted(true);
          setTransformedScore(prev => Math.min(96, Math.max(88, prev || 88)));
          triggerNotification('Profile saved! Check out your score boost.');
        } else if (stepParam && parseInt(stepParam) >= 1 && parseInt(stepParam) <= 12) {
          setCurrentStep(parseInt(stepParam));
        } else if (sessionData.success && sessionData.data) {
          const { onboarding, userLifecycleState, profileName, profileRole, masterCVData, masterCVId } = sessionData.data;
          
          setLifecycleState(userLifecycleState || 'NEW');
          if (profileName) setLoadedProfileName(profileName);
          if (profileRole) setLoadedProfileRole(profileRole);
          if (masterCVData) setParsedCVData(masterCVData);
          if (masterCVId) setPrimaryCvId(masterCVId);
          
          if (onboarding) {
            if (onboarding.primary_goal) setIntent(onboarding.primary_goal);
            if (onboarding.confidence_score) {
              setCVScore(onboarding.confidence_score);
              setInitialScore(onboarding.initial_score || onboarding.confidence_score);
              setTransformedScore(onboarding.transformed_score || Math.min(96, Math.max(88, onboarding.confidence_score + 24)));
            }
            if (onboarding.primary_cv_id) setPrimaryCvId(onboarding.primary_cv_id);
            if (onboarding.career_pathway) setSelectedPathway(onboarding.career_pathway);
            if (onboarding.target_roles?.length) setTargetRoles(onboarding.target_roles);
            if (onboarding.locations?.length) setLocations(onboarding.locations);
            if (onboarding.experience_level) setExperienceLevel(onboarding.experience_level);
            if (onboarding.salary_range) setSalary(onboarding.salary_range);
            if (onboarding.visa_required !== undefined) setVisaRequired(onboarding.visa_required);
            if (onboarding.search_status) setSearchStatus(onboarding.search_status);
            if (onboarding.monthly_volume) setMonthlyVolume(onboarding.monthly_volume);
            if (onboarding.tracker_interest) setTrackerInterest(onboarding.tracker_interest);
            if (onboarding.autoapply_interest) setAutoapplyInterest(onboarding.autoapply_interest);
            
            // Restore canonical job-search preferences
            if (onboarding.workplace_types?.length) setWorkplaceTypes(onboarding.workplace_types);
            if (onboarding.salary_min !== undefined) setSalaryMin(onboarding.salary_min);
            if (onboarding.salary_currency) setSalaryCurrency(onboarding.salary_currency);
            if (onboarding.experience_years !== undefined) setExperienceYears(onboarding.experience_years);
            if (onboarding.max_notice_period_days !== undefined) setMaxNoticePeriodDays(onboarding.max_notice_period_days);
            if (onboarding.search_intensity) setSearchIntensity(onboarding.search_intensity);
            if (onboarding.expected_applications_per_month !== undefined) setExpectedApplicationsPerMonth(onboarding.expected_applications_per_month);
            if (onboarding.application_mode) setApplicationMode(onboarding.application_mode);
            
            if (onboarding.current_stage && userLifecycleState !== 'ONBOARDING_COMPLETE') {
              const stageKey = onboarding.current_stage as OnboardingStage;
              const mappedStep = STAGE_TO_STEP[stageKey];
              if (mappedStep && mappedStep > 1) {
                setCurrentStep(mappedStep);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize onboarding session:', err);
      } finally {
        setIsLoadingSession(false);
      }
    };

    initSession();
  }, [status, searchParams]);

  // Auto-save logic
  useEffect(() => {
    if (!isLoadingSession && currentStep > 1) {
      const stageName = STEP_TO_STAGE[currentStep] || 'INTENT';
      saveSession({
        current_stage: stageName,
        completed_stages: Object.values(STEP_TO_STAGE).slice(0, currentStep - 1)
      });

      // Save to localStorage as secondary backup
      localStorage.setItem('buildairesume_onboarding_state', JSON.stringify({
        intent,
        stage: stageName,
        step: currentStep,
        seedingMethod,
        cvScore,
        initialScore,
        transformedScore,
        primaryCvId,
        editorCompleted,
        searchStatus,
        monthlyVolume,
        trackerInterest,
        autoapplyInterest,
        targetRoles,
        locations,
        experienceLevel,
        salary,
        visaRequired,
        workplaceTypes,
        salaryMin,
        salaryCurrency,
        experienceYears,
        maxNoticePeriodDays,
        searchIntensity,
        expectedApplicationsPerMonth,
        applicationMode
      }));
    }
  }, [currentStep, isLoadingSession, intent, cvScore, primaryCvId, editorCompleted, initialScore, transformedScore, selectedPathway, targetRoles, locations, experienceLevel, salary, visaRequired, searchStatus, monthlyVolume, trackerInterest, autoapplyInterest, workplaceTypes, salaryMin, salaryCurrency, experienceYears, maxNoticePeriodDays, searchIntensity, expectedApplicationsPerMonth, applicationMode]);

  // Load plans
  useEffect(() => {
    fetch('/api/pricing-plans?public=true')
      .then(res => res.json())
      .then(data => {
        if (data.plans) {
          setPlans(data.plans);
          if (data.plans.length > 0) {
            setCurrencySymbol(data.plans[0].currencySymbol || '$');
          }
        }
      })
      .catch(err => console.error('Failed to fetch pricing plans:', err));
  }, []);

  // Prefetch editor route early to make transition instantaneous
  useEffect(() => {
    if (currentStep >= 2) {
      router.prefetch('/editor');
    }
  }, [currentStep, router]);

  // Handlers for Transitions
  const handleOpenEditorFromStep3 = () => {
    // 1. Persist state for return
    sessionStorage.setItem('fromOnboarding', 'true');
    sessionStorage.setItem('onboardingReturnUrl', '/welcome?stage=cv_ready');
    sessionStorage.setItem('onboardingReturnStep', '4');

    // 2. Authoritative database update
    saveSession({
      current_stage: 'CV_READY_FORK',
      primary_goal: intent,
      confidence_score: cvScore
    });

    // 3. LocalStorage persistence
    localStorage.setItem('buildairesume_onboarding_state', JSON.stringify({
      intent,
      stage: 'CV_READY_FORK',
      step: 4,
      seedingMethod,
      cvScore,
      initialScore: cvScore || 64,
      primaryCvId,
      editorCompleted: false
    }));

    // 4. Navigate directly to Editor starting at Template Selector (Step 2 in editor)
    const isAuth = status === 'authenticated';
    const targetEditorUrl = primaryCvId && primaryCvId !== 'guest-draft'
      ? `/editor?cvId=${primaryCvId}&mode=edit-master&improve=true&step=2&fromOnboarding=true`
      : isAuth
        ? '/editor?doc=master-cv&mode=improve&step=2&fromOnboarding=true'
        : '/editor?cvId=guest-draft&mode=create&step=2&restoreDraft=true&fromOnboarding=true';

    router.push(targetEditorUrl);
  };

  const handleNext = (overrideSeedingMethod?: string) => {
    const activeSeedingMethod = overrideSeedingMethod || seedingMethod;

    if (currentStep === 2 && activeSeedingMethod === 'scratch') {
      handleOpenEditorFromStep3();
      return;
    }

    if (currentStep === 3) {
      handleOpenEditorFromStep3();
      return;
    }

    if (currentStep < 13) {
      setCurrentStep(currentStep + 1);
    } else {
      const rec = getRecommendedTier();
      completeOnboarding(rec.redirectUrl);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Helper to check and transfer guest draft if authenticated
  async function checkAndTransferGuestDraft(forceAuth = false) {
    if (status === 'authenticated' || forceAuth) {
      try {
        const sessionId = guestCVService.getSessionId();
        if (sessionId) {
          const hasDraft = await guestCVService.hasDraft(sessionId);
          if (hasDraft) {
            const transferRes = await guestCVService.transferDraftToUser(sessionId, session?.user?.id);
            if (transferRes.success && transferRes.cvId) {
              setPrimaryCvId(transferRes.cvId);
              return transferRes.cvId;
            }
          }
        }
      } catch (err) {
        console.error('Failed to transfer guest draft in onboarding:', err);
      }
    }
    return null;
  }

  // Complete Onboarding Endpoint
  const completeOnboarding = async (redirectUrl: string, overrideState?: any, forceAuth = false) => {
    const s_cvScore = overrideState?.cvScore ?? cvScore;

    try {
      let activeCvId = primaryCvId;
      const isUserAuth = status === 'authenticated' || forceAuth;
      if (isUserAuth) {
        const transferredCvId = await checkAndTransferGuestDraft(forceAuth);
        if (transferredCvId) {
          activeCvId = transferredCvId;
        }
      }

      const rec = getRecommendedTier(overrideState);
      let primary_goal: 'cv' | 'tracker' | 'auto_apply' = intent === 'cv' ? 'cv' : 'tracker';
      let recommended_plan = intent === 'cv' ? 'starter_monthly' : 'focused_monthly';

      const dashboard_layout_type: 'cv' | 'tracker' | 'auto_apply' =
        intent === 'cv' ? 'cv' : 'tracker';

      const targetRoute =
        redirectUrl === '/dashboard'
          ? redirectUrl
          : intent === 'cv'
            ? activeCvId && activeCvId !== 'guest-draft'
              ? `/editor?cvId=${activeCvId}&mode=edit-master`
              : '/dashboard'
            : '/dashboard/jobs?tab=discover';

      await saveSession({
        primary_goal,
        confidence_score: s_cvScore,
        recommended_plan,
        activation_status: 'completed',
        userLifecycleState: 'ONBOARDING_COMPLETE',
        dashboard_layout_type
      });

      sessionStorage.removeItem('fromOnboarding');
      sessionStorage.removeItem('onboardingReturnUrl');
      sessionStorage.removeItem('onboardingReturnStep');

      // For non-authenticated users, redirect to sign-in with callback
      if (status !== 'authenticated' && !forceAuth) {
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(targetRoute)}`);
        return;
      }

      router.push(targetRoute);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      router.push(redirectUrl);
    }
  };

  const getRecommendedTier = (overrideState?: any) => {
    const s_intent = overrideState?.intent ?? intent;
    if (s_intent === 'cv') {
      return {
        tier: 'Starter',
        description: 'Create, edit, and export professional templates with ATS feedback.',
        price: 'Free',
        redirectUrl: '/editor?doc=master-cv',
        type: 1
      };
    } else {
      const plan = plans.find(p => p.key === 'focused_monthly') || plans.find(p => p.key === 'focused_yearly');
      const priceText = plan?.regionalPricing?.price 
        ? `${currencySymbol}${plan.regionalPricing.price}`
        : `${currencySymbol}9.99`;
      return {
        tier: 'Focused',
        description: 'Complete job search suite with unlimited CV edits, AI Cover Letters, Mock Interviews, and Application Tracker.',
        price: `${priceText}/month`,
        redirectUrl: '/dashboard/jobs?tab=discover',
        type: 2
      };
    }
  };

  const processParseResponse = async (response: Response, fileName: string) => {
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errMsg = 'Failed to parse CV';
      if (contentType && contentType.includes('application/json')) {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } else {
        errMsg = `Failed to parse CV: HTTP ${response.status}`;
      }
      throw new Error(errMsg);
    }

    const result = await response.json();
    setParseProgress(100);

    if (result._parsed || result.basics || result.work) {
      setParsedCVData(result);
      const score = result.analysis?.score || result._score || 64;
      setCVScore(score);
      setInitialScore(score);
      setTransformedScore(Math.min(96, Math.max(88, score + 24)));
      await savePrimaryCV(result, fileName, score);
      
      triggerNotification("Profile created successfully!");
      setTimeout(() => {
        setIsParsing(false);
        setCurrentStep(3);
      }, 800);
    } else {
      throw new Error(result.error || "Parsing failed");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setActualFile(file);
      setDroppedFile(file.name);
      setIsParsing(true);
      setParseProgress(0);
      setParseStep(0);
      setParseError('');

      const formData = new FormData();
      formData.append('file', file);

      let progressInterval: ReturnType<typeof setInterval> | null = null;

      try {
        progressInterval = setInterval(() => {
          setParseProgress(prev => {
            if (prev >= 95) return 95;
            if (prev === 20) setParseStep(1);
            if (prev === 45) setParseStep(2);
            if (prev === 70) setParseStep(3);
            if (prev === 90) setParseStep(4);
            return prev + 5;
          });
        }, 250);

        const response = await fetch('/api/cv/parse', {
          method: 'POST',
          body: formData,
        });

        if (progressInterval) clearInterval(progressInterval);
        await processParseResponse(response, file.name);
      } catch (err: any) {
        if (progressInterval) clearInterval(progressInterval);
        console.error("Parsing error:", err);
        const errMsg = err?.message || "Failed to parse CV. Please try again or Start Fresh.";
        setParseError(errMsg);
        setIsParsing(false);
      }
    }
  };

  const handleJsonSubmit = async () => {
    if (!jsonInput.trim()) return;
    setJsonError('');

    try {
      const trimmedInput = jsonInput.trim();
      if (trimmedInput.startsWith('{') || trimmedInput.startsWith('[')) {
        try {
          const result = JSON.parse(trimmedInput);
          setParsedCVData(result);
          const score = result.analysis?.score || result._score || 68;
          setCVScore(score);
          setInitialScore(score);
          setTransformedScore(Math.min(96, Math.max(88, score + 24)));
          await savePrimaryCV(result, 'Imported JSON', score);

          triggerNotification("JSON Data imported!");
          setShowJsonModal(false);
          setCurrentStep(3);
          return;
        } catch (e) {
          console.warn("Input looked like JSON but failed to parse. Falling back to text parsing...");
        }
      }

      setDroppedFile('Pasted Content');
      setIsParsing(true);
      setParseProgress(0);
      setParseStep(0);
      setShowJsonModal(false);

      const formData = new FormData();
      const file = new File([jsonInput], 'pasted-cv.txt', { type: 'text/plain' });
      formData.append('file', file);

      const progressInterval = setInterval(() => {
        setParseProgress(prev => {
          if (prev >= 95) return 95;
          if (prev === 20) setParseStep(1);
          if (prev === 45) setParseStep(2);
          if (prev === 70) setParseStep(3);
          if (prev === 90) setParseStep(4);
          return prev + 5;
        });
      }, 250);

      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      await processParseResponse(response, 'Pasted CV');
    } catch (err: any) {
      console.error("Import error:", err);
      setJsonError(err?.message || "Failed to process data. Please check and try again.");
      setIsParsing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeIn' } }
  };

  // Animation loops for Tracker and Auto-apply
  const [autoApplyStep, setAutoApplyStep] = useState(0);
  useEffect(() => {
    if (currentStep !== 9) return;
    const interval = setInterval(() => {
      setAutoApplyStep(prev => (prev + 1) % 5);
    }, 2200);
    return () => clearInterval(interval);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 11) return;
    const interval = setInterval(() => {
      setTrackerAnimStage(prev => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(interval);
  }, [currentStep]);

  return (
    <div className="h-screen font-sans antialiased flex flex-col selection:bg-lime-200 transition-colors duration-300 overflow-hidden bg-[#f3f2ee] text-[#1A1A1A] welcome-page">
      
      {/* Top Header */}
      <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b transition-colors duration-300 border-gray-100">
        <Logo size="sm" />
        
        {/* Dynamic Progress Indicator */}
        {!isLoadingSession && (
          <div className="flex items-center gap-6 text-xs font-semibold text-gray-400">
            {currentStep !== 13 && (
              <div className="flex items-center gap-3 w-48 sm:w-60">
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-black transition-all duration-500"
                    style={{ 
                      width: `${Math.max(8, Math.round((currentStep / 13) * 100))}%` 
                    }}
                  />
                </div>
                <span className="whitespace-nowrap font-bold text-gray-600">
                  {currentStep <= 4 ? `Phase 1: Profile` : `Phase 2: Job Agent (${currentStep}/13)`}
                </span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className={`flex flex-col justify-center ${currentStep === 3 ? 'max-w-6xl' : 'max-w-4xl'} mx-auto w-full px-6 py-3 sm:py-4 flex-1 overflow-y-auto transition-all duration-300`}>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full transition-all duration-300 max-h-full flex flex-col overflow-hidden bg-white border border-gray-200 rounded-[2rem] p-6 md:p-8 shadow-sm"
          >
            <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
          
          {/* STEP 1: What are you here to achieve? */}
          {currentStep === 1 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Goal Alignment</span>
                  <h1 className="onboarding-title">
                    What are you trying to accomplish?
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    Select your primary objective today. We'll configure our tools and layout to match your journey.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5 pt-4 max-w-3xl mx-auto">
                  {/* Path A: Create a Great CV */}
                  <button
                    onClick={() => {
                      setIntent('cv');
                    }}
                    className={`text-left p-6 sm:p-7 border-2 rounded-3xl transition-all relative flex flex-col justify-between ${
                      intent === 'cv'
                        ? 'border-black bg-slate-50 shadow-md ring-2 ring-black/5' 
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3.5 rounded-2xl shrink-0 ${intent === 'cv' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                        <FileText className="h-7 w-7" />
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            CV Studio
                          </span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            intent === 'cv' ? 'bg-black text-white shadow-sm' : 'border-2 border-gray-300'
                          }`}>
                            {intent === 'cv' && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                        <h3 className="font-extrabold text-xl text-gray-900">Create a Great CV</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Audit, polish, and design a high-impact, ATS-optimized Profile. Export clean PDF &amp; Word files.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Path B: Find My Next Job */}
                  <button
                    onClick={() => {
                      setIntent('job_search');
                    }}
                    className={`text-left p-6 sm:p-7 border-2 rounded-3xl transition-all relative flex flex-col justify-between ${
                      intent === 'job_search'
                        ? 'border-black bg-slate-50 shadow-md ring-2 ring-black/5' 
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3.5 rounded-2xl shrink-0 ${intent === 'job_search' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}>
                        <Zap className="h-7 w-7" />
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Full Ecosystem
                          </span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            intent === 'job_search' ? 'bg-black text-white shadow-sm' : 'border-2 border-gray-300'
                          }`}>
                            {intent === 'job_search' && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                        <h3 className="font-extrabold text-xl text-gray-900">Find My Next Job</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Build your Profile, auto-track job applications, auto-apply to open roles, and practice AI interviews.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Let's build your career profile (Profile Seeding) */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Career Profile</span>
                  <h1 className="onboarding-title">
                    {candidateName ? `${candidateName}, let's build your profile` : `Let's build your career profile`}
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    We'll build your <strong>Profile</strong> — the central source of truth from which all tailored applications and interview prep will be generated.
                  </p>
                </div>

                {parseError ? (
                  <div className="max-w-xl mx-auto py-6">
                    <div className="bg-white rounded-[2rem] border border-red-100 shadow-xl p-8 space-y-6">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                          <AlertTriangle className="h-7 w-7 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xl text-gray-900">Unable to Read File</h3>
                          <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">{droppedFile}</p>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800 space-y-1">
                        {parseError.split('\n').filter(Boolean).map((line, i) => (
                          <p key={i} className={i === 0 ? 'font-semibold' : 'text-xs text-amber-700'}>{line}</p>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setParseError('');
                            setSeedingMethod('upload');
                          }}
                          className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Try a Different File
                        </button>
                        <button
                          onClick={() => {
                            setParseError('');
                            setSeedingMethod('');
                          }}
                          className="w-full py-3 border border-gray-200 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm text-gray-600"
                        >
                          Choose a Different Method
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !isParsing ? (
                  <div className="space-y-6">
                    {!seedingMethod && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                        {[
                          { id: 'upload', title: 'Upload CV', desc: 'PDF, Word, TXT', icon: Upload },
                          { id: 'json', title: 'Paste Content', desc: 'JSON or Plain Text', icon: FileJson },
                          { id: 'linkedin', title: 'LinkedIn Sync', desc: 'Profile Import', icon: Linkedin, soon: true },
                          { id: 'scratch', title: 'Start Fresh', desc: 'Interactive Canvas', icon: PenTool }
                        ].map(method => {
                          const Icon = method.icon;
                          const isSelected = seedingMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              onClick={() => {
                                setSeedingMethod(method.id);
                                if (method.id === 'scratch') {
                                  setParsedCVData(null); 
                                  setCVScore(0);
                                  handleOpenEditorFromStep3();
                                } else if (method.id === 'json') {
                                  setShowJsonModal(true);
                                } else if (method.id === 'linkedin') {
                                  setShowLinkedInModal(true);
                                }
                              }}
                              className={`w-full h-full p-6 border-2 rounded-2xl text-center flex flex-col items-center justify-center gap-3 transition-all relative ${
                                isSelected ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              {method.soon && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm z-10">
                                  Coming Soon
                                </div>
                              )}
                              <div className={`p-3 rounded-xl ${isSelected ? 'bg-black text-white' : 'bg-gray-150'}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm">{method.title}</h3>
                                <p className="text-[10px] text-gray-500 mt-1">{method.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {seedingMethod === 'upload' && (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-gray-500 hover:bg-gray-50 transition-all relative cursor-pointer group">
                          <input 
                            type="file" 
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="p-4 bg-gray-100 rounded-2xl group-hover:bg-gray-200 transition-colors">
                              <Upload className="h-10 w-10 text-gray-500 group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                              <h4 className="font-bold text-base">Drag &amp; drop your CV here</h4>
                              <p className="text-sm text-gray-500 mt-1">or click to browse files</p>
                            </div>
                            <p className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1">PDF, DOCX, TXT · up to 10MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSeedingMethod('')}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 py-2 transition-colors"
                        >
                          <ChevronLeft className="h-3 w-3" />
                          Choose a different import method
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto py-6">
                    <div className="bg-white rounded-[2rem] border border-gray-150 shadow-xl p-8 space-y-8 relative overflow-hidden">
                      <div className="text-center space-y-2">
                        <h3 className="font-extrabold text-xl text-gray-900">Building Profile</h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto truncate">File: {droppedFile}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-600 px-1">
                          <span>Progress</span>
                          <span>{parseProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                          <div 
                            className="bg-gradient-to-r from-[#013f2e] to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(1, 63, 46,0.5)]" 
                            style={{ width: `${parseProgress}%` }} 
                          />
                        </div>
                      </div>

                      <div className="space-y-3 bg-gray-50/50 border border-gray-150 rounded-2xl p-5 text-sm">
                        {[
                          'Reading document layers',
                          'Extracting career history & STAR metrics',
                          'Formatting Profile layout',
                          'Indexing industry keywords',
                          'Finalizing Profile'
                        ].map((label, stepIdx) => {
                          const isCompleted = parseStep > stepIdx;
                          const isActive = parseStep === stepIdx;
                          return (
                            <div key={stepIdx} className={`flex items-center gap-3 ${isCompleted ? 'text-gray-900 font-bold' : isActive ? 'text-gray-900 font-extrabold' : 'text-gray-400'}`}>
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <div className="w-5 h-5 rounded-full bg-[#013f2e] flex items-center justify-center text-white shadow-sm">
                                    <Check size={11} strokeWidth={4} />
                                  </div>
                                ) : isActive ? (
                                  <div className="w-5 h-5 rounded-full border-2 border-[#013f2e] flex items-center justify-center bg-[#013f2e]/10">
                                    <div className="w-2 h-2 rounded-full bg-black" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                                )}
                              </div>
                              <span className="flex-1">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* JSON / Plain Text Modal */}
                <AnimatePresence>
                  {showJsonModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-black rounded-lg text-[#013f2e]">
                              <FileJson size={24} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-black">Paste CV Content</h2>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">JSON or Plain Text</p>
                            </div>
                          </div>
                          <button onClick={() => { setShowJsonModal(false); setSeedingMethod(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <textarea 
                            value={jsonInput}
                            onChange={(e) => {
                              setJsonInput(e.target.value);
                              setJsonError('');
                            }}
                            placeholder="Paste your CV text or JSON here..."
                            className="w-full h-44 p-5 bg-slate-50 border border-gray-200 rounded-[24px] font-mono text-xs outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                          />
                          {jsonError && <p className="text-xs text-red-500 font-bold">{jsonError}</p>}
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={() => { setShowJsonModal(false); setSeedingMethod(''); }} variant="ghost" className="flex-1 rounded-2xl font-bold py-6">Cancel</Button>
                          <Button 
                            onClick={handleJsonSubmit}
                            disabled={!jsonInput.trim()}
                            className="flex-[2] bg-black text-white hover:bg-slate-900 rounded-2xl font-bold py-6 shadow-xl"
                          >
                            Import Profile
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* STEP 3: What we discovered about you (AI Analysis & Insights) */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-3xl mx-auto text-gray-900">
                <div className="space-y-2 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Analysis &amp; Insights</span>
                  <h1 className="onboarding-title">
                    {candidateName ? `What AIResume discovered about your career, ${candidateName}` : 'What AIResume discovered about your background'}
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-2xl mx-auto">
                    We've scanned your experience and identified key strengths, keyword gaps, and readiness metrics.
                  </p>
                </div>

                {/* Main Score Header */}
                <div className="bg-white border border-gray-200 rounded-[24px] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={activeSnapshot.healthIndex >= 80 ? '#013f2e' : '#F59E0B'}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - (activeSnapshot.healthIndex || 0) / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-gray-900 leading-none">
                        {activeSnapshot.healthIndex || 0}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">/100</span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-grow text-center md:text-left space-y-2">
                    <h4 className="text-xl font-black text-gray-900 leading-snug">
                      Profile Health Score
                    </h4>
                    <p className="text-sm text-gray-500 font-semibold leading-relaxed">
                      {activeSnapshot.healthIndex >= 80 ? 'Competitive profile' : 'Optimization suggested'} · Potential score boost of +{activeSnapshot.potentialBoost || 24}% in the editor.
                    </p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                        {activeSnapshot.stats.skillsFound} skills indexed
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                        {activeSnapshot.missingKeywords.length} gap keywords
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-200 border border-blue-200 text-blue-700">
                        {activeSnapshot.stats.experienceYears} Years Exp
                      </span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Breakdown Panels */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-[24px] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleSection('categories')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-black uppercase tracking-wider text-gray-700">Category Breakdown</span>
                      </div>
                      {expandedSections.categories ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>

                    {expandedSections.categories && (
                      <div className="p-6 space-y-4">
                        {[
                          { label: 'Structure & Formatting', score: activeSnapshot.breakdown.structure * 5 },
                          { label: 'ATS Readability', score: activeSnapshot.breakdown.readability * 5 },
                          { label: 'Content Strength', score: activeSnapshot.breakdown.contentStrength * 5 },
                          { label: 'Skills & Keywords', score: activeSnapshot.breakdown.skillsKeywords * 5 },
                          { label: 'Impact & Achievements', score: activeSnapshot.breakdown.impactAchievements * 5 },
                        ].map((c, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                              <span>{c.label}</span>
                              <span>{c.score}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                className={`h-full rounded-full ${c.score >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                initial={{ width: 0 }}
                                animate={{ width: `${c.score}%` }}
                                transition={{ duration: 0.8, delay: 0.1 * i }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* STEP 4: Profile Ready Celebration & Real Stats ("Your Profile is ready. Now what?") */}
            {currentStep === 4 && (
              <div className="space-y-6 max-w-2xl mx-auto py-2 text-center">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Profile Ready
                  </div>
                  <h1 className="onboarding-title">
                    {candidateName ? `${candidateName}, your Profile is ready! 🎉` : 'Your Profile is ready! 🎉'}
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-md mx-auto">
                    Your Profile is finalized and ready to power your career. Select how you'd like to proceed:
                  </p>
                </div>

                {/* Real Stats Card - Transformation Report */}
                <div className="bg-gradient-to-br from-emerald-50 via-lime-50/40 to-white border border-emerald-200/80 rounded-3xl p-5 sm:p-6 shadow-sm text-left space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        <CheckCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-emerald-950">Profile Transformation Completed</h4>
                        <p className="text-[11px] text-emerald-700 font-medium">Your edits have significantly boosted your ATS compatibility</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                      +{initialScore > 0 ? Math.max(15, transformedScore - initialScore) : 24} pts boost
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white/90 p-3 rounded-2xl border border-emerald-100 text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Initial Score</span>
                      <span className="text-xl font-black text-amber-600">{initialScore > 0 ? initialScore : '—'}/100</span>
                    </div>
                    <div className="bg-white/90 p-3 rounded-2xl border border-emerald-200 text-center ring-2 ring-emerald-500/20">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Updated Score</span>
                      <span className="text-xl font-black text-emerald-600">{transformedScore > 0 ? transformedScore : '—'}/100</span>
                    </div>
                    <div className="bg-white/90 p-3 rounded-2xl border border-emerald-100 text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Template</span>
                      <span className="text-xs font-extrabold text-gray-900 truncate block mt-1">Modern ATS Pro</span>
                    </div>
                    <div className="bg-white/90 p-3 rounded-2xl border border-emerald-100 text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Readiness</span>
                      <span className="text-xs font-extrabold text-emerald-600 truncate block mt-1">Application Ready</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">✓ High-Impact STAR Bullets</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">✓ ATS Keyword Density</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">✓ Verified Layout &amp; Margins</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5 pt-1 text-left">
                  {/* Card A: Just My CV */}
                  <div className="border-2 border-gray-200 hover:border-gray-400 bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all group shadow-sm hover:shadow-md">
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-100 rounded-2xl w-fit text-gray-800 group-hover:bg-black group-hover:text-white transition-colors">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h3 className="font-extrabold text-xl text-gray-900">Just My CV</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        I just needed a professional resume. Download PDF, share your CV link, or continue editing in your workspace.
                      </p>
                    </div>

                    <Button 
                      onClick={() => completeOnboarding('/dashboard')}
                      variant="outline"
                      className="w-full mt-6 py-5 rounded-xl font-extrabold text-xs uppercase tracking-wider border-2 hover:bg-black hover:text-white transition-all"
                    >
                      Finish &amp; Open Workspace
                    </Button>
                  </div>

                  {/* Card B: Find My Next Job */}
                  <div className="border-2 border-black bg-slate-50/70 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative shadow-md ring-2 ring-black/5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-3 bg-black text-white rounded-2xl w-fit">
                          <Zap className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white">
                          Recommended
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xl text-gray-900">Find My Next Job</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Let AI find matching roles, organize your application pipeline, automate submissions, and prepare for interviews.
                      </p>
                    </div>

                    <Button 
                      onClick={() => setCurrentStep(5)}
                      className="w-full mt-6 py-5 bg-black text-white hover:bg-slate-900 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md"
                    >
                      Accelerate Job Search <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Target Roles */}
            {currentStep === 5 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Target Roles</span>
                  <h1 className="onboarding-title">
                    {candidateName ? `${candidateName}, what roles are you targeting?` : 'What roles are you targeting?'}
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    Select the roles you want to be matched with. Our AI will find positions that fit your profile.
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-4 text-left">
                  {/* Career Pathway Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-black" /> Career Pathway <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-gray-400 font-normal">Choose primary field</span>
                    </label>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CAREER_PATHWAYS.map(p => {
                        const isSelected = selectedPathway === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPathway(p.id);
                              setTargetRoles(prev => prev.filter(r => p.roles.includes(r)));
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              isSelected 
                                ? 'bg-black text-white border-black shadow-sm ring-2 ring-black/5' 
                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            <span className="text-base">{p.icon}</span>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold block truncate">{p.name}</span>
                            </div>
                            {isSelected && <Check className="h-3 w-3 text-[#013f2e] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Roles within Chosen Pathway */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5 text-black" /> Target Roles in {currentPathway?.name} <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-gray-400 font-normal">Select one or more</span>
                    </label>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-gray-200 space-y-2.5">
                      <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {currentPathway?.roles.map(role => {
                          const isSel = targetRoles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                if (isSel) setTargetRoles(prev => prev.filter(r => r !== role));
                                else setTargetRoles(prev => [...prev, role]);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                isSel 
                                  ? 'bg-black text-white border-black shadow-sm' 
                                  : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                              }`}
                            >
                              {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                              {role}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Role Input */}
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                        <input
                          type="text"
                          value={customRoleInput}
                          onChange={e => setCustomRoleInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customRoleInput.trim()) {
                              e.preventDefault();
                              const trimmed = customRoleInput.trim();
                              if (!targetRoles.includes(trimmed)) {
                                setTargetRoles(prev => [...prev, trimmed]);
                              }
                              setCustomRoleInput('');
                            }
                          }}
                          placeholder="+ Add custom role title..."
                          className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex-1 outline-none focus:border-black font-medium"
                        />
                        {customRoleInput.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = customRoleInput.trim();
                              if (!targetRoles.includes(trimmed)) {
                                setTargetRoles(prev => [...prev, trimmed]);
                              }
                              setCustomRoleInput('');
                            }}
                            className="px-3 py-1.5 bg-black text-white rounded-xl text-xs font-bold"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Workplace + Location */}
            {currentStep === 6 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Workplace + Location</span>
                  <h1 className="onboarding-title">
                    {candidateName ? `${candidateName}, where do you want to work?` : 'Where do you want to work?'}
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    Choose your preferred workplace arrangement and target locations.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-6 text-left">
                  {/* Workplace Types */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" /> Workplace Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'remote', label: 'Remote', icon: '🌍' },
                        { id: 'hybrid', label: 'Hybrid', icon: '🏠' },
                        { id: 'onsite', label: 'Onsite', icon: '🏢' }
                      ].map(type => {
                        const isSel = workplaceTypes.includes(type.id);
                        return (
                          <button
                            key={type.id}
                            onClick={() => {
                              if (isSel) setWorkplaceTypes(prev => prev.filter(t => t !== type.id));
                              else setWorkplaceTypes(prev => [...prev, type.id]);
                            }}
                            className={`p-4 border-2 rounded-2xl text-center transition-all ${
                              isSel ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <span className="text-xl">{type.icon}</span>
                            <p className="text-xs font-bold mt-1">{type.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Target Locations <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. London, New York, Bangalore"
                      value={locations.join(', ')}
                      onChange={e => setLocations(e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-black"
                    />
                    <p className="text-[10px] text-gray-400">Separate multiple locations with commas</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: Salary */}
            {currentStep === 7 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Salary Expectations</span>
                  <h1 className="onboarding-title">
                    What&apos;s your target salary?
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    This helps us match you with roles in your compensation range.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-6 text-left">
                  {/* 1. Currency Selection FIRST */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> Currency
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(WELCOME_SALARY_CONFIG).map(([key, cfg]) => {
                        const isCurSel = salaryCurrency === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSalaryCurrencyChange(key)}
                            className={`py-3 px-2 border-2 rounded-2xl text-center transition-all ${
                              isCurSel
                                ? 'border-black bg-slate-50 font-bold text-gray-900 shadow-xs'
                                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'
                            }`}
                          >
                            <span className="text-xs font-bold block">{cfg.symbol} {key.split('_')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Range-based Minimum Salary Presets */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Minimum Target Salary
                      </label>
                      <span className="text-xs font-bold text-lime-800 bg-lime-100 px-2.5 py-0.5 rounded-full">
                        {salaryMin === 0
                          ? 'Flexible / Any'
                          : `${WELCOME_SALARY_CONFIG[salaryCurrency]?.symbol || ''}${salaryMin.toLocaleString()} ${WELCOME_SALARY_CONFIG[salaryCurrency]?.unit || ''}+`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {(WELCOME_SALARY_CONFIG[salaryCurrency] || WELCOME_SALARY_CONFIG.INR_LPA).presets.map((preset) => {
                        const isSelected = salaryMin === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setSalaryMin(preset.value)}
                            className={`py-3.5 px-3 border-2 rounded-2xl text-center transition-all ${
                              isSelected
                                ? 'border-black bg-slate-50 font-extrabold text-gray-900 shadow-xs'
                                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium'
                            }`}
                          >
                            <span className="text-xs font-bold">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Flexible option */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSalaryMin(0)}
                        className={`w-full py-2.5 px-4 border-2 rounded-2xl text-xs font-bold transition-all text-center ${
                          salaryMin === 0
                            ? 'border-black bg-slate-50 text-gray-900 shadow-xs'
                            : 'border-dashed border-gray-300 hover:border-gray-400 bg-gray-50/50 text-gray-500'
                        }`}
                      >
                        Flexible / Open to offers
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center">
                    We&apos;ll prioritize roles meeting or exceeding your target threshold
                  </p>
                </div>
              </div>
            )}

            {/* STEP 8: Experience + Availability */}
            {currentStep === 8 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Experience + Availability</span>
                  <h1 className="onboarding-title">
                    Tell us about your experience
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    This helps us find roles at the right level and understand your availability.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-6 text-left">
                  {/* Years of Experience */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Years of Experience
                      </label>
                      <span className="text-xs font-bold text-lime-800 bg-lime-100 px-2.5 py-0.5 rounded-full">
                        {experienceYears === 0 ? '0 years (Fresher)' : `${experienceYears} ${experienceYears === 1 ? 'year' : 'years'}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '0–2 yrs', value: 1 },
                        { label: '3–5 yrs', value: 3 },
                        { label: '5–8 yrs', value: 5 },
                        { label: '8+ yrs', value: 8 },
                      ].map((tier) => {
                        const isSel = experienceYears === tier.value;
                        return (
                          <button
                            key={tier.label}
                            type="button"
                            onClick={() => setExperienceYears(tier.value)}
                            className={`py-3 px-2 border-2 rounded-2xl text-center transition-all ${
                              isSel
                                ? 'border-black bg-slate-50 font-extrabold text-gray-900 shadow-xs'
                                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium'
                            }`}
                          >
                            <span className="text-xs font-bold block">{tier.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Max Notice Period (Days) - Step 7 Style */}
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Availability / Max Notice Period
                      </label>
                      <span className="text-xs font-bold text-lime-800 bg-lime-100 px-2.5 py-0.5 rounded-full">
                        {maxNoticePeriodDays === 0 ? 'Immediately' : `${maxNoticePeriodDays} days`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { label: 'Immediately', value: 0 },
                        { label: '15 days', value: 15 },
                        { label: '30 days', value: 30 },
                        { label: '60 days', value: 60 },
                      ].map((preset) => {
                        const isSelected = maxNoticePeriodDays === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setMaxNoticePeriodDays(preset.value)}
                            className={`py-3.5 px-2 border-2 rounded-2xl text-center transition-all ${
                              isSelected
                                ? 'border-black bg-slate-50 font-extrabold text-gray-900 shadow-xs'
                                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium'
                            }`}
                          >
                            <span className="text-xs font-bold block">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      {[
                        { label: '90 days (3 months)', value: 90 },
                        { label: '90+ days / Flexible', value: 120 },
                      ].map((preset) => {
                        const isSelected = maxNoticePeriodDays === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setMaxNoticePeriodDays(preset.value)}
                            className={`py-3 px-3 border-2 rounded-2xl text-center transition-all ${
                              isSelected
                                ? 'border-black bg-slate-50 font-extrabold text-gray-900 shadow-xs'
                                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium'
                            }`}
                          >
                            <span className="text-xs font-bold block">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center">
                    We&apos;ll prioritize employers whose hiring timelines align with your availability
                  </p>
                </div>
              </div>
            )}

            {/* STEP 9: Search Intensity */}
            {currentStep === 9 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Search Intensity</span>
                  <h1 className="onboarding-title">
                    {candidateName ? `${candidateName}, how actively are you searching?` : 'How actively are you looking?'}
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    This determines how fast we scout new openings and calibrate your alerts.
                  </p>
                </div>

                <div className="grid gap-3 max-w-md mx-auto">
                  {[
                    { id: 'browsing', label: 'Just browsing', desc: 'No active rush. Updating profile for potential future opportunities.' },
                    { id: 'exploring', label: 'Exploring opportunities', desc: 'Open to the right role if it fits. Checking boards occasionally.' },
                    { id: 'active', label: 'Actively applying weekly', desc: 'Submitting tailored applications weekly. Seeking interviews soon.' },
                    { id: 'aggressive', label: 'Aggressively hunting', desc: 'Full-time search. Daily submissions and seeking rapid hire.' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSearchIntensity(option.id)}
                      className={`text-left p-5 border-2 rounded-2xl transition-all relative flex items-center justify-between ${
                        searchIntensity === option.id ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{option.label}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-3 transition-all ${
                        searchIntensity === option.id ? 'bg-black text-white shadow-sm' : 'border-2 border-gray-300'
                      }`}>
                        {searchIntensity === option.id && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 10: Application Volume */}
            {currentStep === 10 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Application Volume</span>
                  <h1 className="onboarding-title">
                    How many applications per month?
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    Set your target volume and we'll help you reach it.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 5, label: '5', desc: 'Targeted' },
                      { value: 20, label: '20', desc: 'Focused' },
                      { value: 50, label: '50', desc: 'Active' },
                      { value: 100, label: '100+', desc: 'Aggressive' }
                    ].map(vol => (
                      <button
                        key={vol.value}
                        onClick={() => setExpectedApplicationsPerMonth(vol.value)}
                        className={`p-6 border-2 rounded-2xl text-center transition-all ${
                          expectedApplicationsPerMonth === vol.value ? 'border-black bg-slate-50 ring-2 ring-black/5' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl font-black">{vol.label}</span>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{vol.desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Or enter custom amount</label>
                    <input
                      type="number"
                      value={expectedApplicationsPerMonth}
                      onChange={e => setExpectedApplicationsPerMonth(Number(e.target.value))}
                      min="1"
                      max="500"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-black text-center text-lg font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 11: Pipeline Autopilot (Kanban Board Graphic) */}
            {currentStep === 11 && (
              <div className="space-y-6 max-w-2xl mx-auto py-2">
                <div className="space-y-2 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">
                    Pipeline Autopilot
                  </span>
                  <h1 className="onboarding-title">
                    Keep your search organized automatically
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-lg mx-auto text-xs sm:text-sm">
                    Track every stage from auto-scouting to verified offer letters in one real-time visual pipeline.
                  </p>
                </div>

                {/* High-Fidelity Kanban Board Mockup */}
                <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50 border border-gray-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
                  {/* Board Header Bar */}
                  <div className="flex items-center justify-between text-xs pb-2.5 border-b border-gray-150">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-gray-800 text-xs sm:text-sm">Live Search Pipeline</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {trackerAnimStage === 0 && '1. Auto-Scouting'}
                        {trackerAnimStage === 1 && '2. Submitted'}
                        {trackerAnimStage === 2 && '3. Interview Ready'}
                        {trackerAnimStage === 3 && '4. Offer Received'}
                      </span>
                    </div>
                  </div>

                  {/* 4 Kanban Columns */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
                    {/* Column 1: Scout */}
                    <div className={`flex flex-col rounded-xl p-2 sm:p-2.5 transition-all ${
                      trackerAnimStage === 0 
                        ? 'bg-indigo-50/70 border-2 border-indigo-400/80 ring-2 ring-indigo-400/20' 
                        : 'bg-slate-50/80 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">Scout</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800">12</span>
                      </div>
                      <div className="space-y-1.5 flex-1 min-h-[90px]">
                        {trackerAnimStage === 0 ? (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white border-2 border-indigo-500 rounded-lg p-2 shadow-sm space-y-1"
                          >
                            <p className="text-[11px] font-black text-gray-900 leading-tight">Lead AI Engineer</p>
                            <p className="text-[9px] font-semibold text-gray-500">OpenAI · Remote</p>
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase">
                              <Sparkles className="w-2.5 h-2.5" /> 98% Match
                            </div>
                          </motion.div>
                        ) : (
                          <div className="bg-white border border-gray-150 rounded-lg p-2 space-y-0.5 opacity-75">
                            <p className="text-[10px] font-bold text-gray-800 truncate">Staff Architect</p>
                            <p className="text-[8px] text-gray-400">Anthropic · Hybrid</p>
                            <span className="text-[8px] text-indigo-600 font-semibold">95% Match</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Applied */}
                    <div className={`flex flex-col rounded-xl p-2 sm:p-2.5 transition-all ${
                      trackerAnimStage === 1 
                        ? 'bg-amber-50/70 border-2 border-amber-400/80 ring-2 ring-amber-400/20' 
                        : 'bg-slate-50/80 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Applied</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-800">5</span>
                      </div>
                      <div className="space-y-1.5 flex-1 min-h-[90px]">
                        {trackerAnimStage === 1 ? (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white border-2 border-amber-500 rounded-lg p-2 shadow-sm space-y-1"
                          >
                            <p className="text-[11px] font-black text-gray-900 leading-tight">Lead AI Engineer</p>
                            <p className="text-[9px] font-semibold text-gray-500">OpenAI · Remote</p>
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-black uppercase">
                              <Check className="w-2.5 h-2.5" /> Tailored CV Sent
                            </div>
                          </motion.div>
                        ) : (
                          <div className="bg-white border border-gray-150 rounded-lg p-2 space-y-0.5 opacity-75">
                            <p className="text-[10px] font-bold text-gray-800 truncate">Senior Full Stack</p>
                            <p className="text-[8px] text-gray-400">Stripe · London</p>
                            <span className="text-[8px] text-amber-600 font-semibold">Submitted</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Interviews */}
                    <div className={`flex flex-col rounded-xl p-2 sm:p-2.5 transition-all ${
                      trackerAnimStage === 2 
                        ? 'bg-blue-50/70 border-2 border-blue-400/80 ring-2 ring-blue-400/20' 
                        : 'bg-slate-50/80 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Interview</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-100/80 text-blue-800">2</span>
                      </div>
                      <div className="space-y-1.5 flex-1 min-h-[90px]">
                        {trackerAnimStage === 2 ? (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white border-2 border-blue-500 rounded-lg p-2 shadow-sm space-y-1"
                          >
                            <p className="text-[11px] font-black text-gray-900 leading-tight">Lead AI Engineer</p>
                            <p className="text-[9px] font-semibold text-gray-500">OpenAI · Remote</p>
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-black uppercase">
                              <Target className="w-2.5 h-2.5" /> Round 2 Scheduled
                            </div>
                          </motion.div>
                        ) : (
                          <div className="bg-white border border-gray-150 rounded-lg p-2 space-y-0.5 opacity-75">
                            <p className="text-[10px] font-bold text-gray-800 truncate">Product Engineer</p>
                            <p className="text-[8px] text-gray-400">Linear · Remote</p>
                            <span className="text-[8px] text-blue-600 font-semibold">Prep Ready</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 4: Offers */}
                    <div className={`flex flex-col rounded-xl p-2 sm:p-2.5 transition-all ${
                      trackerAnimStage === 3 
                        ? 'bg-emerald-50/70 border-2 border-emerald-400/80 ring-2 ring-emerald-400/20' 
                        : 'bg-slate-50/80 border border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Offers</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">1</span>
                      </div>
                      <div className="space-y-1.5 flex-1 min-h-[90px]">
                        {trackerAnimStage === 3 ? (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white border-2 border-emerald-500 rounded-lg p-2 shadow-sm space-y-1"
                          >
                            <p className="text-[11px] font-black text-gray-900 leading-tight">Lead AI Engineer</p>
                            <p className="text-[9px] font-semibold text-gray-500">OpenAI · Remote</p>
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase">
                              🎉 $175,000 /yr
                            </div>
                          </motion.div>
                        ) : (
                          <div className="bg-white border border-gray-150 rounded-lg p-2 space-y-0.5 opacity-75">
                            <p className="text-[10px] font-bold text-gray-800 truncate">Platform Lead</p>
                            <p className="text-[8px] text-gray-400">Vercel · Remote</p>
                            <span className="text-[8px] text-emerald-600 font-semibold">🎉 $165k Offer</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Feature Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { title: '1. Auto-Scouting Match', desc: 'Finds verified openings matching your Target Roles & Salary.', stage: 0 },
                    { title: '2. Smart Submission Log', desc: 'Tracks tailored CV versions and cover letter submissions.', stage: 1 },
                    { title: '3. Calendar Auto-Sync', desc: 'Syncs interview prep cards, schedules, and recruiter links.', stage: 2 },
                    { title: '4. Offer & Negotiation', desc: 'Compares total compensation, equity, and market benchmarks.', stage: 3 }
                  ].map((feat) => {
                    const isActive = trackerAnimStage === feat.stage;
                    return (
                      <div
                        key={feat.title}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isActive 
                            ? 'bg-white border-black ring-2 ring-black/5 shadow-sm' 
                            : 'bg-slate-50/70 border-gray-200 text-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${isActive ? 'text-black' : 'text-gray-700'}`}>{feat.title}</h4>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{feat.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Question & Interactive Choice Buttons (Non-overlapping) */}
                <div className="pt-3 border-t border-gray-200/80 space-y-3 text-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-800">
                      Want AIResume to keep your search organized?
                    </p>
                    <p className="text-[11px] text-gray-500">
                      You can modify or disable automated tracking at any time in settings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto">
                    <button
                      onClick={() => setTrackerInterest('yes')}
                      className={`p-3 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        trackerInterest === 'yes' || !trackerInterest
                          ? 'border-black bg-black text-white shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Yes, keep it organized</span>
                    </button>
                    <button
                      onClick={() => setTrackerInterest('no')}
                      className={`p-3 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        trackerInterest === 'no'
                          ? 'border-black bg-slate-100 text-black shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span>No, manual tracking</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 12: Application Mode */}
            {currentStep === 12 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="onboarding-step-label text-white bg-[#013f2e] px-3 py-1 rounded-full font-bold">Application Mode</span>
                  <h1 className="onboarding-title">
                    How much should AIResume handle?
                  </h1>
                  <p className="onboarding-copy text-gray-500 max-w-xl mx-auto">
                    Choose your level of automation. You can change this anytime.
                  </p>
                </div>

                <div className="grid gap-4 max-w-lg mx-auto">
                  {[
                    { id: 'find_only', label: 'Find Only', desc: 'Get personalized job matches. You review and apply yourself.', icon: '🔍', color: 'border-indigo-200 hover:border-indigo-400' },
                    { id: 'manual_review', label: 'Review Before Submit', desc: 'AIResume prepares applications. You review and approve before submission.', icon: '👀', color: 'border-amber-200 hover:border-amber-400' },
                    { id: 'automatic', label: 'Fully Automatic', desc: 'AIResume finds, tailors, and submits applications automatically.', icon: '⚡', color: 'border-emerald-200 hover:border-emerald-400' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setApplicationMode(mode.id)}
                      className={`text-left p-6 border-2 rounded-2xl transition-all relative ${
                        applicationMode === mode.id 
                          ? 'border-black bg-slate-50 ring-2 ring-black/5 shadow-sm' 
                          : `${mode.color} bg-white`
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl">{mode.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-gray-900">{mode.label}</h4>
                          <p className="text-xs text-gray-500 mt-1">{mode.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          applicationMode === mode.id ? 'bg-black text-white shadow-sm' : 'border-2 border-gray-300'
                        }`}>
                          {applicationMode === mode.id && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 13: Final Launch & CEO Note */}
            {currentStep === 13 && (
              <div className="space-y-8 max-w-2xl mx-auto py-4 relative">
                <div className="space-y-3 text-center relative z-10">
                  <span className="onboarding-step-label px-3 py-1 rounded-full bg-slate-100 text-black font-bold">
                    Setup Completed! 🎉
                  </span>
                  <h1 className="onboarding-title text-gray-900 leading-tight">
                    Congratulations on activating your AI Career Agent!
                  </h1>
                </div>

                <div 
                  onClick={() => {
                    setTypedLetterLength(fullLetterText.length);
                    setIsTypingLetter(false);
                  }}
                  className="relative bg-[#faf7f2] border border-amber-100 rounded-3xl p-6 md:p-8 shadow-[0_15px_30px_rgba(0,0,0,0.03)] text-left max-w-lg mx-auto z-10 overflow-hidden transform rotate-[-0.5deg] cursor-pointer select-text"
                >
                  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap" rel="stylesheet" />
                  
                  <div className="absolute top-3 right-4 text-[10px] text-amber-800/40 uppercase tracking-widest font-sans font-black select-none">
                    CEO&apos;s Office
                  </div>

                  <div className="space-y-4 text-amber-950/90 text-xl leading-relaxed" style={{ fontFamily: "'Caveat', cursive" }}>
                    {fullLetterText.slice(0, typedLetterLength).split('\n\n').map((para, idx) => (
                      <p key={idx} className={idx === 0 ? "text-2xl font-bold" : ""}>
                        {para}
                        {isTypingLetter && idx === fullLetterText.slice(0, typedLetterLength).split('\n\n').length - 1 && (
                          <span className="inline-block w-0.5 h-5 bg-amber-800 ml-1 animate-pulse" />
                        )}
                      </p>
                    ))}

                    <div className={`pt-3 flex justify-between items-end transition-opacity duration-500 ${typedLetterLength >= fullLetterText.length * 0.8 ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="space-y-0.5" style={{ fontFamily: "'Caveat', cursive" }}>
                        <p className="font-bold text-2xl text-black">Amar Lohia</p>
                        <p className="text-lg font-bold text-amber-900/80">CEO and Founder, AIResume</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-lg mx-auto pt-2 z-10 relative">
                  <Button
                    onClick={() => completeOnboarding('/dashboard')}
                    className="w-full py-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all bg-black text-white hover:bg-slate-900 shadow-md"
                  >
                    Launch My Workspace <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                  </Button>
                </div>
              </div>
            )}

              </div>
            </motion.div>
        </AnimatePresence>

      </main>

      {/* Footer Navigation Bar - The ONLY primary CTA to move forward */}
      <footer className="px-6 py-4 border-t transition-colors duration-300 text-xs text-gray-400 border-gray-150 bg-[#f3f2ee]">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          {currentStep !== 13 ? (
            <Button
              onClick={handleBack}
              disabled={currentStep === 1}
              variant="ghost"
              className="font-bold flex items-center gap-1.5 rounded-xl hover:bg-slate-200/50 px-4 py-2 text-gray-500 disabled:opacity-30"
            >
              <ChevronLeft className="h-4.5 w-4.5" /> Back
            </Button>
          ) : (
            <div className="w-[80px]" />
          )}

          <div className="text-center font-medium">
            &copy; {new Date().getFullYear()} AIResume. All features secured.
          </div>

          {currentStep !== 13 ? (
            <Button
              onClick={() => handleNext()}
              disabled={!isStepValid}
              className={`${
                currentStep === 3 
                  ? 'bg-[#013f2e] hover:bg-[#02523c] text-white font-extrabold shadow-md' 
                  : 'bg-black text-white hover:bg-slate-900 font-bold'
              } flex items-center gap-1.5 rounded-xl px-5 py-2.5 shadow-sm disabled:opacity-35 transition-all`}
            >
              {currentStep === 3 ? (
                <>
                  Improve &amp; Design My CV <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-4.5 w-4.5" />
                </>
              )}
            </Button>
          ) : (
            <div className="w-[80px]" />
          )}
        </div>
      </footer>

    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#f3f2ee] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    }>
      <WelcomePageContent />
    </Suspense>
  );
}
