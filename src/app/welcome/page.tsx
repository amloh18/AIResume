// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { 
  FileText, 
  Briefcase, 
  Target, 
  Sparkles, 
  Zap, 
  CheckCircle, 
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
  Kanban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/Logo';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import CodeVerificationScreen from '@/components/auth/CodeVerificationScreen';
import { toast } from 'react-hot-toast';
import { getStrengthDescription, getWeaknessDescription } from '@/lib/cv-descriptions';
import guestCVService from '@/lib/services/guestCVService';

interface OnboardingState {
  intent: string;
  seedingMethod: string;
  cvScore: number;
  searchStatus: string;
  monthlyVolume: string;
  trackerInterest: string;
  autoapplyInterest: string;
  targetRoles: string[];
  locations: string[];
  experienceLevel: string;
  salary: string;
  visaRequired: boolean | null;
  parsedCVData: any;
  droppedFile: string;
}

const WelcomePage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openPaymentModal } = usePaymentModal();
  
  // Onboarding Steps (1 to 10)
  const [currentStep, setCurrentStep] = useState(1);
  const [lifecycleState, setLifecycleState] = useState<string>('NEW');
  const [primaryCvId, setPrimaryCvId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<any>(null);
  const [trackerAnimStage, setTrackerAnimStage] = useState(0);
  
  // Selections
  const [intent, setIntent] = useState<string>('');
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
    healthIndex: cvScore || 65,
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
    potentialBoost: 15,
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

  // Helper Functions
  const saveSession = async (updates: any) => {
    try {
      await fetch('/api/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const savePrimaryCV = async (cvData: any, title: string, score: number) => {
    try {
      if (status === 'authenticated') {
        // 1. Create/Update Primary CV for Authenticated User
        const response = await fetch('/api/cvs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'Primary CV',
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
          
          // 2. Generate Analysis Snapshot
          const analysisRes = await fetch('/api/cv/analysis-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvId: masterCvId })
          });
          const analysisData = await analysisRes.json();
          if (analysisData.success) {
            setAnalysisSnapshot(analysisData.data);
            setCVScore(analysisData.data.healthIndex);
          }

          // 3. Update onboarding session
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
          currentStep: 2, // Start at Step 2 (Templates) in the editor
          completedSteps: [],
          cvTitle: title || 'Primary CV',
        });
        
        if (draftResult.success) {
          setPrimaryCvId('guest-draft');
          
          // Generate analysis snapshot directly from cvData
          const analysisRes = await fetch('/api/cv/analysis-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cvData: cvData })
          });
          const analysisData = await analysisRes.json();
          if (analysisData.success) {
            setAnalysisSnapshot(analysisData.data);
            setCVScore(analysisData.data.healthIndex);

            // Re-save guest draft with the AI analysis snapshot converted to standard score report format!
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
              currentStep: 2, // Start at Step 2 (Templates) in the editor
              completedSteps: [],
              cvTitle: title || 'Primary CV',
              aiAnalysis: {
                score: analysisData.data.healthIndex || 0,
                scoreReport: scoreReport
              }
            });
          }

          // Also save onboarding session if an anonymous user exists
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

  const jsonSample = {
    basics: {
      name: "Your Name",
      email: "email@example.com",
      phone: "+1 234 567 890",
      website: "https://yourportfolio.com",
      location: { address: "City, Country" },
      profiles: [{ network: "LinkedIn", url: "https://linkedin.com/in/username" }]
    },
    work: [{
      company: "Company Name",
      position: "Job Title",
      startDate: "2020-01-01",
      endDate: "2023-01-01",
      summary: "Description of your role and impact."
    }],
    education: [{
      institution: "University Name",
      area: "Field of Study",
      studyType: "Degree",
      startDate: "2016-01-01",
      endDate: "2020-01-01"
    }],
    skills: [{ name: "Skill Name", level: "Expert" }]
  };

  const copyJsonSample = () => {
    const aiPrompt = `Act as an expert career coach and senior resume writer.
I will provide you with my current resume or background details.
Your task is to:
1. Analyze my background and the standard for high-impact CVs.
2. Convert my data into a perfectly structured JSON format following the "JSON Resume" standard.
3. Ensure every bullet point is quantified, uses strong action verbs, and follows the STAR method.
4. Output ONLY the JSON object, starting with { and ending with }.

Use this schema as a foundation:
${JSON.stringify(jsonSample, null, 2)}

Please find the CV data attached.`;

    navigator.clipboard.writeText(aiPrompt);
    // Brief toast logic could go here
  };

  const handleJsonSubmit = async () => {
    if (!jsonInput.trim()) return;
    setJsonError('');

    try {
      // 1. Try to parse as JSON first
      const trimmedInput = jsonInput.trim();
      if (trimmedInput.startsWith('{') || trimmedInput.startsWith('[')) {
        try {
          const result = JSON.parse(trimmedInput);
          setParsedCVData(result);
          const score = result.analysis?.score || result._score || 72;
          setCVScore(score);
          await savePrimaryCV(result, 'Imported JSON', score);

          triggerNotification("JSON Data imported!");
          setShowJsonModal(false);
          handleNext();
          return;
        } catch (e) {
          console.warn("Input looked like JSON but failed to parse. Falling back to text parsing...");
        }
      }

      // 2. Fallback to Text Parsing (AI Analysis)
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
          if (prev >= 95) {
            return 95;
          }
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

  const handleLinkedInSubmit = async () => {
    if (!linkedinUrl.trim()) return;
    triggerNotification("LinkedIn sync starting soon!");
    setShowLinkedInModal(false);
    // Future: trigger actual sync
  };
  // Inline Auth Form State
  const [authTab, setAuthTab] = useState<'signup' | 'signin'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [fastTrackToEditor, setFastTrackToEditor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Pricing Plans (fetched from API)
  const [plans, setPlans] = useState<any[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Load Onboarding Session & Initial Auth
  useEffect(() => {
    const initSession = async () => {
      setIsLoadingSession(true);
      try {
        // Ensure we have at least an anonymous session
        await fetch('/api/auth/anonymous-session');
        
        // Fetch detailed onboarding session
        const sessionRes = await fetch('/api/user/onboarding');
        const sessionData = await sessionRes.json();
        
        if (sessionData.success && sessionData.data) {
          const { onboarding, userLifecycleState } = sessionData.data;
          
          setLifecycleState(userLifecycleState || 'NEW');
          
          if (onboarding) {
            if (onboarding.primary_goal) setIntent(onboarding.primary_goal);
            if (onboarding.confidence_score) setCVScore(onboarding.confidence_score);
            if (onboarding.primary_cv_id) setPrimaryCvId(onboarding.primary_cv_id);
            
            // If they have progress, prepare for "Welcome Back"
            if (onboarding.current_stage && userLifecycleState !== 'ONBOARDING_COMPLETE') {
              const stepMatch = onboarding.current_stage.match(/STEP_(\d+)/);
              if (stepMatch) {
                let step = Math.max(1, parseInt(stepMatch[1]));
                if (step > 5) {
                  step = step - 1;
                }
                if (step > 1) {
                  setIsResuming(true);
                  setCurrentStep(step);
                }
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
  }, [status]);

  // Auto-save logic
  useEffect(() => {
    if (!isLoadingSession && currentStep > 1) {
      saveSession({
        current_stage: `STEP_${currentStep}`,
        completed_stages: Array.from({ length: currentStep - 1 }, (_, i) => `STEP_${i + 1}`)
      });
    }
  }, [currentStep, isLoadingSession]);

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

  // Save State Helper
  const getOnboardingState = (): OnboardingState => ({
    intent,
    seedingMethod,
    cvScore,
    searchStatus,
    monthlyVolume,
    trackerInterest,
    autoapplyInterest,
    targetRoles,
    locations,
    experienceLevel,
    salary,
    visaRequired,
    parsedCVData,
    droppedFile
  });

  const saveStateToLocalStorage = (nextStepNum: number) => {
    const state = getOnboardingState();
    localStorage.setItem('cvcircle_onboarding_state', JSON.stringify({
      ...state,
      step: nextStepNum,
      fastTrackToEditor
    }));
  };

  // Restore State
  useEffect(() => {
    const saved = localStorage.getItem('cvcircle_onboarding_state');
    if (saved && status === 'authenticated') {
      try {
        const parsed = JSON.parse(saved);
        setIntent(parsed.intent || '');
        setSeedingMethod(parsed.seedingMethod || '');
        setCVScore(parsed.cvScore || 68);
        setSearchStatus(parsed.searchStatus || '');
        setMonthlyVolume(parsed.monthlyVolume || '');
        setTrackerInterest(parsed.trackerInterest || '');
        setAutoapplyInterest(parsed.autoapplyInterest || '');
        setTargetRoles(parsed.targetRoles || []);
        setLocations(parsed.locations || []);
        setExperienceLevel(parsed.experienceLevel || '');
        setSalary(parsed.salary || '');
        setVisaRequired(parsed.visaRequired ?? null);
        setFastTrackToEditor(parsed.fastTrackToEditor || false);
        
        // Restore parsed data
        if (parsed.parsedCVData) setParsedCVData(parsed.parsedCVData);
        if (parsed.droppedFile) setDroppedFile(parsed.droppedFile);
        
        // Clear local storage
        localStorage.removeItem('cvcircle_onboarding_state');
        
        // If they fast-tracked, call completion logic instead of simple redirect
        if (parsed.fastTrackToEditor) {
          completeOnboarding('/editor', parsed);
        } else {
          let restoredStep = parsed.step || 5;
          if (restoredStep > 5) {
            restoredStep = restoredStep - 1;
          }
          setCurrentStep(restoredStep);
        }
      } catch (e) {
        console.error('Error restoring onboarding state:', e);
      }
    }
  }, [status, router]);

  // Handle Next Navigation
  const handleNext = (overrideSeedingMethod?: string) => {
    const activeSeedingMethod = overrideSeedingMethod || seedingMethod;
    // Skip Step 3 (Analysis) for scratch CVs, go directly to Step 4 (LinkedIn Promo)
    if (currentStep === 2 && (intent === 'cv_scratch' || activeSeedingMethod === 'scratch')) {
      setCurrentStep(4);
      return;
    }

    if (currentStep === 3) {
      // Go to Step 4 (LinkedIn Promo)
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4 && (intent === 'cv' || intent === 'cv_scratch')) {
      // Type 1 User Fast-Track check: Route directly to editor after showing LinkedIn Promo
      completeOnboarding('/editor');
      return;
    }

    if (currentStep < 11) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete Onboarding redirection based on scores
      const rec = getRecommendedTier();
      completeOnboarding(rec.redirectUrl);
    }
  };

  const handleBack = () => {
    if (currentStep === 4) {
      if (intent === 'cv_scratch' || seedingMethod === 'scratch') {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Onboarding Completion Endpoint call
  // Helper to check and transfer guest draft if authenticated
  async function checkAndTransferGuestDraft(forceAuth = false) {
    if (status === 'authenticated' || forceAuth) {
      try {
        const sessionId = guestCVService.getSessionId();
        if (sessionId) {
          const hasDraft = await guestCVService.hasDraft(sessionId);
          if (hasDraft) {
            console.log('🔄 Onboarding - Transferring guest draft to authenticated user...');
            const transferRes = await guestCVService.transferDraftToUser(sessionId, session?.user?.id);
            if (transferRes.success && transferRes.cvId) {
              console.log('✅ Onboarding - Draft transferred successfully. CV ID:', transferRes.cvId);
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
  };

  // Onboarding Completion Endpoint call
  const completeOnboarding = async (redirectUrl: string, overrideState?: OnboardingState, forceAuth = false) => {
    const s_cvScore = overrideState?.cvScore ?? cvScore;

    try {
      // Transfer draft first if authenticated
      let activeCvId = primaryCvId;
      const isUserAuth = status === 'authenticated' || forceAuth;
      if (isUserAuth) {
        const transferredCvId = await checkAndTransferGuestDraft(forceAuth);
        if (transferredCvId) {
          activeCvId = transferredCvId;
        }
      }

      const rec = getRecommendedTier(overrideState);
      let primary_goal: 'cv' | 'tracker' | 'auto_apply' = 'cv';
      let recommended_plan = 'starter_monthly';
      const isScratch = seedingMethod === 'scratch';
      
      // All three user types (Starter, Focused, Smart) must go to the editor to complete their primary CV
      let activation_route = isScratch 
        ? '/editor?mode=create&step=2&master=true'
        : (isUserAuth 
            ? '/editor?doc=master-cv&mode=improve&step=2' 
            : '/editor?cvId=guest-draft&mode=create&step=2');
        
      let dashboard_layout_type: 'cv' | 'tracker' | 'auto_apply' = 'cv';

      if (rec.type === 3) {
        primary_goal = 'auto_apply';
        recommended_plan = 'smart_quarterly';
        dashboard_layout_type = 'auto_apply';
      } else if (rec.type === 2) {
        primary_goal = 'tracker';
        recommended_plan = 'focused_monthly';
        dashboard_layout_type = 'tracker';
      }

      // If user has a valid primaryCvId (and not 'guest-draft'), route to it in edit-master mode
      if (activeCvId && activeCvId !== 'guest-draft') {
        activation_route = `/editor?cvId=${activeCvId}&mode=edit-master&improve=true&step=2`;
      }

      let targetRoute = redirectUrl === '/dashboard' ? '/dashboard' : activation_route;

      // Update session status
      await saveSession({
        primary_goal,
        confidence_score: s_cvScore,
        recommended_plan,
        userLifecycleState: 'ONBOARDING_COMPLETE',
        dashboard_layout_type
      });

      if (isUserAuth && activeCvId && activeCvId !== 'guest-draft') {
        openPaymentModal({
          preselectedPlanKey: recommended_plan === 'starter_monthly' ? 'focused_monthly' : recommended_plan,
          triggerContext: 'onboarding-exit',
          onSuccess: () => {
            sessionStorage.setItem('fromOnboarding', 'true');
            router.push(targetRoute);
          },
          onClose: async () => {
            try {
              await fetch('/api/user/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planKey: 'starter_monthly' })
              });
              sessionStorage.setItem('fromOnboarding', 'true');
            } catch (err) {
              console.error('Failed to auto-assign starter plan:', err);
            }
            router.push(targetRoute);
          }
        });
      } else {
        // Guest user OR authenticated user with no master CV yet - redirect to editor or dashboard with restore draft flag
        sessionStorage.setItem('fromOnboarding', 'true');
        const finalUrl = targetRoute.includes('?') 
          ? `${targetRoute}&restoreDraft=true&fromOnboarding=true`
          : `${targetRoute}?restoreDraft=true&fromOnboarding=true`;
        router.push(finalUrl);
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      router.push(redirectUrl);
    }
  };

  // Silent Tier Scoring Calculation
  const getRecommendedTier = (overrideState?: OnboardingState) => {
    const s_intent = overrideState?.intent ?? intent;
    const s_searchStatus = overrideState?.searchStatus ?? searchStatus;
    const s_monthlyVolume = overrideState?.monthlyVolume ?? monthlyVolume;
    const s_trackerInterest = overrideState?.trackerInterest ?? trackerInterest;
    const s_autoapplyInterest = overrideState?.autoapplyInterest ?? autoapplyInterest;

    let score1 = 0; // Free CV Studio
    let score2 = 0; // Job Tracker
    let score3 = 0; // Auto-Apply

    // Intent selection scoring
    if (s_intent === 'cv' || s_intent === 'cv_scratch') {
      score1 += 3;
    } else if (s_intent === 'tracker') {
      score2 += 3;
    } else if (s_intent === 'auto_apply') {
      score3 += 3;
    }

    // Search activity status scoring
    if (s_searchStatus === 'browsing') {
      score1 += 2;
    } else if (s_searchStatus === 'exploring') {
      score1 += 1;
      score2 += 2;
    } else if (s_searchStatus === 'active') {
      score2 += 2;
      score3 += 1;
    } else if (s_searchStatus === 'aggressive') {
      score3 += 3;
      score2 += 1;
    }

    // Monthly Volume scoring
    if (s_monthlyVolume === 'low') {
      score1 += 2;
    } else if (s_monthlyVolume === 'medium') {
      score2 += 3;
    } else if (s_monthlyVolume === 'high') {
      score3 += 3;
    } else if (s_monthlyVolume === 'aggressive') {
      score3 += 4;
    }

    // Tracker interest scoring
    if (s_trackerInterest === 'yes') {
      score2 += 2;
    } else if (s_trackerInterest === 'no') {
      score1 += 1;
    }

    // Auto-Apply interest scoring
    if (s_autoapplyInterest === 'yes') {
      score3 += 3;
    } else if (s_autoapplyInterest === 'no') {
      score2 += 1;
      score1 += 1;
    }

    // Final Recommendation Resolution
    if (score3 >= score2 && score3 >= score1) {
      const plan = plans.find(p => p.key === 'smart_quarterly') || plans.find(p => p.key === 'pro_quarterly');
      const priceText = plan?.regionalPricing?.price 
        ? `${currencySymbol}${plan.regionalPricing.price}`
        : `${currencySymbol}34.99`;
      return {
        tier: 'Smart',
        description: 'Best for scale. AI will search, match, customize, and automatically submit applications for you.',
        price: `${priceText}/quarter`,
        redirectUrl: '/dashboard/jobs?tab=auto-apply&setup=1',
        type: 3
      };
    } else if (score2 >= score1) {
      const plan = plans.find(p => p.key === 'focused_monthly') || plans.find(p => p.key === 'pro_monthly');
      const priceText = plan?.regionalPricing?.price 
        ? `${currencySymbol}${plan.regionalPricing.price}`
        : `${currencySymbol}12.99`;
      return {
        tier: 'Focused',
        description: 'Perfect for active searchers looking to organize, track applications, and optimize CVs.',
        price: `${priceText}/month`,
        redirectUrl: '/dashboard/tracker?newJob=1',
        type: 2
      };
    } else {
      return {
        tier: 'Starter',
        description: 'Create, edit, and export professional templates with basic ATS feedback.',
        price: 'Free',
        redirectUrl: '/editor?doc=master-cv&mode=improve',
        type: 1
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
      const score = result.analysis?.score || result._score || 68;
      setCVScore(score);
      await savePrimaryCV(result, fileName, score);
      
      triggerNotification("CV Parsed successfully!");
      setTimeout(() => {
        setIsParsing(false);
        handleNext();
      }, 800);
    } else {
      throw new Error(result.error || "Parsing failed");
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteInput.trim()) return;
    
    setDroppedFile('Pasted Content');
    setIsParsing(true);
    setParseProgress(0);
    setParseStep(0);
    setPasteError('');
    setShowPasteModal(false);

    const formData = new FormData();
    const file = new File([pasteInput], 'pasted-cv.txt', { type: 'text/plain' });
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setParseProgress(prev => {
          if (prev >= 95) {
            return 95;
          }
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
      console.error("Paste parsing error:", err);
      const errMsg = err?.message || "Failed to parse text. Please try again or Start Fresh.";
      toast.error(errMsg, { duration: 5000, position: 'bottom-right' });
      setIsParsing(false);
    }
  };

  // Actual Parser Implementation
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
        // Start visual progress simulator in parallel
        progressInterval = setInterval(() => {
          setParseProgress(prev => {
            if (prev >= 95) {
              // Stay at 95% until actual processing finishes
              return 95;
            }
            // Update steps based on progress
            if (prev === 20) setParseStep(1);
            if (prev === 45) setParseStep(2);
            if (prev === 70) setParseStep(3);
            if (prev === 90) setParseStep(4); // New "Finalizing" step
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
        // Show error inline in the parsing UI instead of resetting silently
        setParseError(errMsg);
        setIsParsing(false);
      }
    }
  };

  // Auth Wall OAuth triggers
  const handleOAuth = (provider: 'google' | 'linkedin' | 'apple') => {
    // Save state to localstorage first
    saveStateToLocalStorage(currentStep + 1);
    signIn(provider, { callbackUrl: '/welcome' });
  };

  // Auth Wall Credentials Form Submission
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    if (authTab === 'signup') {
      try {
        const res = await fetch('/api/auth/register-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
            firstName: authName.split(' ')[0] || 'User',
            lastName: authName.split(' ').slice(1).join(' ') || 'User'
          })
        });
        const result = await res.json();
        if (result.success) {
          setAuthSuccess('Account created! Verification code sent to your email.');
          setIsVerifying(true);
        } else {
          setAuthError(result.message || 'Registration failed.');
        }
      } catch (err) {
        setAuthError('An error occurred. Please try again.');
      } finally {
        setAuthLoading(false);
      }
    } else {
      // Sign In Flow
      try {
        const verifyRes = await fetch('/api/auth/verify-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword, portal: 'candidate' })
        });
        const verifyResult = await verifyRes.json();
        
        if (!verifyResult.success) {
          if (verifyResult.code === 'EMAIL_NOT_VERIFIED') {
            setAuthSuccess('Account not verified. Verification code sent.');
            setIsVerifying(true);
            return;
          }
          setAuthError(verifyResult.error || 'Invalid credentials.');
          setAuthLoading(false);
          return;
        }

        const result = await signIn('credentials', {
          email: authEmail,
          password: authPassword,
          redirect: false
        });

        if (result?.ok) {
          setAuthSuccess('Signed in successfully! Continuing...');
          setTimeout(() => {
            if (fastTrackToEditor) {
              completeOnboarding('/editor', undefined, true);
            } else {
              setCurrentStep(5);
            }
          }, 800);
        } else {
          setAuthError(result?.error || 'Authentication failed.');
        }
      } catch (err) {
        setAuthError('Sign in failed.');
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const handleVerifyCodeSubmitDirect = async (codeValue: string) => {
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      const verifyRes = await fetch('/api/auth/verify-and-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          code: codeValue,
          type: 'email-verification'
        })
      });
      const verifyResult = await verifyRes.json();

      if (!verifyResult.success) {
        setAuthError(verifyResult.message || 'Invalid or expired code.');
        setAuthLoading(false);
        return;
      }

      // Automatically sign in with credentials now that they are verified
      const result = await signIn('credentials', {
        email: authEmail,
        password: authPassword,
        redirect: false
      });

      if (result?.ok) {
        setAuthSuccess('Account verified and logged in!');
        setTimeout(() => {
          if (fastTrackToEditor) {
            completeOnboarding('/editor', undefined, true);
          } else {
            setCurrentStep(5);
          }
        }, 800);
      } else {
        setAuthError('Verification succeeded, but failed to establish session. Please sign in.');
        setIsVerifying(false);
      }
    } catch (err) {
      setAuthError('Verification failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendCode = async () => {
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, type: 'email-verification' })
      });
      const result = await res.json();
      if (result.success) {
        setAuthSuccess('Verification code resent!');
      } else {
        setAuthError(result.message || 'Failed to resend code.');
      }
    } catch (err) {
      setAuthError('Failed to resend code.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.3 } }
  };

  // Mini Kanban Animation loop for Step 10
  const [kanbanStage, setKanbanStage] = useState(0);
  useEffect(() => {
    if (currentStep !== 10) return;
    const interval = setInterval(() => {
      setKanbanStage(prev => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, [currentStep]);

  // Mini Auto-Apply animation for Step 9
  const [autoApplyStep, setAutoApplyStep] = useState(0);
  useEffect(() => {
    if (currentStep !== 9) return;
    const interval = setInterval(() => {
      setAutoApplyStep(prev => (prev + 1) % 5);
    }, 2200);
    return () => clearInterval(interval);
  }, [currentStep]);

  // Rich Tracker Animation loop for Step 8
  useEffect(() => {
    if (currentStep !== 8) return;
    const interval = setInterval(() => {
      setTrackerAnimStage(prev => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, [currentStep]);

  return (
    <div className="h-screen font-sans antialiased flex flex-col selection:bg-lime-200 transition-colors duration-300 overflow-hidden bg-[#f3f2ee] text-[#1A1A1A]">
      
      {/* Top Header */}
      <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b transition-colors duration-300 border-gray-100">
        <Logo size="sm" />
        
        {/* Pagination Dots and Step Text */}
        {!isLoadingSession && (
          <div className="flex items-center gap-6 text-xs font-semibold text-gray-400">
            {/* Progress Indicators */}
            {currentStep !== 11 && (
              <div className="flex items-center gap-1.5">
                {[...Array(11)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i + 1 === currentStep 
                        ? 'w-6 bg-black dark:bg-[#80FF00]' 
                        : i + 1 < currentStep 
                        ? 'w-1.5 bg-gray-400 dark:bg-white/40' 
                        : 'w-1.5 bg-gray-200 dark:bg-white/10'
                    }`}
                  />
                ))}
              </div>
            )}
            <span>Step {currentStep} of 11</span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className={`flex flex-col justify-center ${currentStep === 3 ? 'max-w-6xl' : 'max-w-4xl'} mx-auto w-full px-6 py-3 sm:py-4 flex-1 overflow-y-auto transition-all duration-300`}>
        
        <AnimatePresence mode="wait">
          {isResuming ? (
            <motion.div
              key="resume-screen"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full bg-white border border-gray-150 rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] max-w-2xl mx-auto relative overflow-hidden max-h-full flex flex-col"
            >
              {/* Subtle top decoration line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#80FF00] via-emerald-400 to-[#80FF00]" />

              <div className="flex-1 overflow-y-auto pr-2 space-y-8 pb-4">
                <div className="space-y-4 text-center">
                  <div className="relative inline-flex items-center justify-center p-4 rounded-3xl bg-[#80FF00]/10 text-black mb-2 shadow-[0_0_20px_rgba(128,255,0,0.15)]">
                    <div className="absolute inset-0 bg-[#80FF00]/5 rounded-3xl animate-pulse" />
                    <History className="h-8 w-8 text-[#80FF00] relative z-10" />
                  </div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 animate-fade-in">Welcome Back</h1>
                  <p className="text-gray-500 text-base max-w-md mx-auto">
                    We've safely saved your progress. Let's pick up right where you left off.
                  </p>
                </div>

                {/* Progress Card */}
                <div className="bg-slate-50/80 rounded-[2rem] p-6 space-y-6 border border-gray-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Your Progress</span>
                    <span className="text-xs font-black text-black bg-[#80FF00] px-2.5 py-1 rounded-full shadow-sm">
                      Step {currentStep} of 11
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                      <motion.div 
                        className="bg-gradient-to-r from-[#80FF00] to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(128,255,0,0.5)]" 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / 11) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestone list */}
                  <div className="space-y-4 pt-2 border-t border-gray-200/50">
                    <div className="flex items-center gap-3 text-sm font-bold text-green-700">
                      <CheckCircle className="h-5 w-5 text-green-600 fill-green-100" />
                      <span>Primary CV Created</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-green-700">
                      <CheckCircle className="h-5 w-5 text-green-600 fill-green-100" />
                      <span>ATS Analysis Complete</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
                      <span>{11 - currentStep} steps remaining to unlock full dashboard</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                <Button 
                  onClick={() => {
                    setIsResuming(false);
                  }}
                  className="w-full bg-black text-white hover:bg-slate-900 font-extrabold py-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-tight text-sm"
                >
                  Resume Onboarding <ArrowRight className="h-5 w-5" />
                </Button>
                {primaryCvId && (
                  <Button 
                    variant="ghost"
                    onClick={() => router.push(`/editor?cvId=${primaryCvId}`)}
                    className="w-full text-gray-500 font-bold py-4 hover:bg-slate-100 rounded-2xl transition-colors"
                  >
                    Open Primary CV
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full transition-all duration-300 max-h-full flex flex-col overflow-hidden bg-white border border-gray-200 rounded-[2rem] p-6 md:p-8 shadow-sm"
            >
              <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
            
            {/* Step 1: Welcome & Intent */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <span className="text-xs font-black uppercase tracking-widest text-[#80FF00] bg-black px-3 py-1 rounded-full">Personalization</span>
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Tailor your career circle
                  </h1>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    What is your primary focus today? We will adapt our tools and layout to match your goals.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  {[
                    {
                      id: 'cv',
                      title: 'Improve Existing CV',
                      desc: 'Audit and polish your current resume. Fix formatting and target ATS keywords.',
                      icon: FileText,
                      badge: 'Type 1'
                    },
                    {
                      id: 'cv_scratch',
                      title: 'Build From Scratch',
                      desc: 'Create a professional CV using interactive fields and custom styled templates.',
                      icon: Sparkles,
                      badge: 'Type 1'
                    },
                    {
                      id: 'tracker',
                      title: 'Track Applications',
                      desc: 'Organize jobs, monitor pipeline stages, and stay on top of interview dates.',
                      icon: Briefcase,
                      badge: 'Type 2'
                    },
                    {
                      id: 'auto_apply',
                      title: 'Auto-Apply & Automate',
                      desc: 'Automate job search matching, customize bullet points, and auto-submit forms.',
                      icon: Zap,
                      badge: 'Type 3'
                    }
                  ].map(option => {
                    const Icon = option.icon;
                    const isSelected = intent === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setIntent(option.id)}
                        className={`text-left p-6 border-2 rounded-2xl transition-all relative ${
                          isSelected 
                            ? 'border-black bg-slate-50' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${isSelected ? 'bg-black text-white' : 'bg-gray-150'}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-bold text-lg">{option.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{option.desc}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-4 right-4 bg-black text-white p-1 rounded-full">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Seeding Path */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Import your background
                  </h1>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    Seed your profile instantly. Select an import path to feed experience data into CVCircle.
                  </p>
                </div>

                {parseError ? (
                  // Error state: show error card with options to retry or choose differently
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
                    {/* Show method cards only when no seeding method is active */}
                    {!seedingMethod && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                        {[
                          { id: 'upload', title: 'Upload CV', desc: 'PDF, Word, TXT', icon: Upload },
                          { id: 'json', title: 'Paste CV', desc: 'JSON or Text', icon: FileJson },
                          { id: 'linkedin', title: 'LinkedIn', desc: 'Sync Profile', icon: Linkedin, soon: true },
                          { id: 'scratch', title: 'Start Fresh', desc: 'No file - manual', icon: Sparkles }
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
                                  handleNext('scratch');
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
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black text-[#80FF00] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm z-10">
                                  Coming Soon
                                </div>
                              )}
                              <div className={`p-3 rounded-xl ${isSelected ? 'bg-black text-[#80FF00]' : 'bg-gray-150'}`}>
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

                    {/* Upload dropzone - shown fullscreen when upload is selected */}
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
                              <h4 className="font-bold text-base">Drag & drop your CV here</h4>
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

                    {/* LinkedIn dropzone */}
                    {seedingMethod === 'linkedin' && (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-gray-400 transition-colors relative cursor-pointer group">
                          <input 
                            type="file" 
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Upload className="h-10 w-10 text-gray-400 group-hover:scale-110 transition-transform" />
                            <h4 className="font-bold text-sm">Drag & drop your file here</h4>
                            <p className="text-xs text-gray-500">Supports PDF, DOCX, TXT up to 10MB</p>
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
                    <style dangerouslySetInnerHTML={{__html: `
                      @keyframes scanline {
                        0% { top: 0%; opacity: 0.8; }
                        50% { top: 100%; opacity: 0.8; }
                        100% { top: 0%; opacity: 0.8; }
                      }
                      .animate-scanline {
                        animation: scanline 3s ease-in-out infinite;
                      }
                    `}} />
                    
                    <div className="bg-white dark:bg-black/25 rounded-[2rem] border border-gray-150 dark:border-white/5 shadow-xl p-8 space-y-8 relative overflow-hidden">
                      {/* Scanning Document Animation */}
                      <div className="relative w-44 h-56 mx-auto bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl shadow-inner flex flex-col justify-between p-4 overflow-hidden group">
                        {/* Scan Line */}
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#80FF00] to-transparent shadow-[0_0_8px_#80FF00] animate-scanline z-20" />
                        
                        {/* Dummy Document Elements */}
                        <div className="space-y-3">
                          <div className="h-3 bg-gray-300 dark:bg-white/20 rounded w-2/3" />
                          <div className="h-2 bg-gray-200 dark:bg-white/10 rounded w-5/6" />
                          <div className="h-2 bg-gray-200 dark:bg-white/10 rounded w-full" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-200 dark:bg-white/10 rounded w-full" />
                          <div className="h-2 bg-gray-200 dark:bg-white/10 rounded w-4/5" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-300 dark:bg-white/20 rounded w-1/2" />
                          <div className="h-2 bg-gray-200 dark:bg-white/10 rounded w-full" />
                        </div>
                        
                        {/* Glowing Overlay */}
                        <div className="absolute inset-0 bg-[#80FF00]/[0.02] pointer-events-none" />
                      </div>

                      {/* Header */}
                      <div className="text-center space-y-2">
                        <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">Parsing Experience Details</h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto truncate">File: {droppedFile}</p>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400 px-1">
                          <span>Import Progress</span>
                          <span>{parseProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-gray-200/50 dark:border-white/5">
                          <div 
                            className="bg-gradient-to-r from-[#80FF00] to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(128,255,0,0.5)]" 
                            style={{ width: `${parseProgress}%` }} 
                          />
                        </div>
                      </div>

                      {/* Steps Checklist */}
                      <div className="space-y-3 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl p-5 text-sm">
                        {[
                          'Reading document layers',
                          'Extracting work histories',
                          'Formatting section maps',
                          'Indexing skills keywords',
                          'Finalizing & Saving'
                        ].map((label, stepIdx) => {
                          const isCompleted = parseStep > stepIdx;
                          const isActive = parseStep === stepIdx;
                          
                          return (
                            <div 
                              key={stepIdx} 
                              className={`flex items-center gap-3 transition-all duration-300 ${
                                isCompleted ? 'text-gray-900 dark:text-white font-bold' : isActive ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-400'
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <div className="w-5 h-5 rounded-full bg-[#80FF00] flex items-center justify-center text-black shadow-md shadow-lime-500/20">
                                    <Check size={11} strokeWidth={4} />
                                  </div>
                                ) : isActive ? (
                                  <div className="w-5 h-5 rounded-full border-2 border-[#80FF00] flex items-center justify-center bg-[#80FF00]/10 relative">
                                    <div className="w-2 h-2 rounded-full bg-[#80FF00] animate-ping absolute" />
                                    <div className="w-2 h-2 rounded-full bg-[#80FF00]" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-white/10" />
                                )}
                              </div>
                              <span className="flex-1">{label}</span>
                              {isActive && (
                                <span className="text-[10px] uppercase font-black text-[#80FF00] tracking-widest animate-pulse">Analyzing...</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* JSON Import Modal */}
                <AnimatePresence>
                  {showJsonModal && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-black rounded-lg text-[#80FF00]">
                              <FileJson size={24} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-black">Paste CV Data</h2>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">JSON or Plain Text Import</p>
                            </div>
                          </div>
                          <button onClick={() => { setShowJsonModal(false); setSeedingMethod(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="p-5 bg-[#80FF00]/5 rounded-[24px] border border-[#80FF00]/10 space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
                              <Info size={14} className="fill-black text-[#80FF00]" /> How it works
                            </h4>
                            <p className="text-[11px] leading-relaxed text-gray-600">
                              Paste your CV in <strong>JSON</strong> format or simply paste your <strong>Raw Text</strong>. Our AI will automatically detect the format and structure your profile.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Content</label>
                            <textarea 
                              value={jsonInput}
                              onChange={(e) => {
                                setJsonInput(e.target.value);
                                setJsonError('');
                              }}
                              placeholder='Paste your JSON code or full CV text here...'
                              className="w-full h-40 p-5 bg-slate-50 border border-gray-100 rounded-[24px] font-mono text-[11px] outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                            />
                            {jsonError && <p className="text-xs text-red-500 font-bold ml-2">{jsonError}</p>}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={() => { setShowJsonModal(false); setSeedingMethod(''); }} variant="ghost" className="flex-1 rounded-2xl font-bold py-6">Cancel</Button>
                          <Button 
                            onClick={handleJsonSubmit}
                            disabled={!jsonInput.trim()}
                            className="flex-[2] bg-black text-white hover:bg-slate-900 rounded-2xl font-bold py-6 shadow-xl disabled:opacity-30"
                          >
                            Import & Continue
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* LinkedIn Modal */}
                <AnimatePresence>
                  {showLinkedInModal && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#0077B5] rounded-lg text-white">
                              <Linkedin size={24} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-black">Sync LinkedIn</h2>
                              <p className="text-xs text-[#0077B5] font-bold uppercase tracking-wider">Coming Soon</p>
                            </div>
                          </div>
                          <button onClick={() => { setShowLinkedInModal(false); setSeedingMethod(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="p-5 bg-blue-50 rounded-[24px] border border-blue-100 space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-blue-800">Direct Profile Sync</h4>
                            <p className="text-[11px] leading-relaxed text-blue-900/70">
                              We're building a native LinkedIn integration. For now, please enter your profile URL to join the early access queue for automated profile updates.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">LinkedIn URL</label>
                            <input 
                              type="text"
                              value={linkedinUrl}
                              onChange={(e) => setLinkedinUrl(e.target.value)}
                              placeholder="https://linkedin.com/in/yourprofile"
                              className="w-full p-5 bg-slate-50 border border-gray-100 rounded-[24px] text-sm outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={() => { setShowLinkedInModal(false); setSeedingMethod(''); }} variant="ghost" className="flex-1 rounded-2xl font-bold py-6">Cancel</Button>
                          <Button 
                            onClick={handleLinkedInSubmit}
                            disabled={!linkedinUrl.trim()}
                            className="flex-[2] bg-black text-white hover:bg-slate-900 rounded-2xl font-bold py-6 shadow-xl disabled:opacity-30"
                          >
                            Join Waitlist
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Step 3: CV Analysis Dashboard */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn text-gray-900">
                <div className="space-y-2 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Your CV Analysis
                  </h1>
                  <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                    We've analyzed your CV to give you actionable insights and a health score.
                  </p>
                </div>

                {/* ── MAIN SCORE HEADER ── */}
                <div className="bg-white border border-gray-200 rounded-[24px] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                  {/* Radial Score Gauge */}
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke="#F3F4F6"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke={activeSnapshot.healthIndex >= 80 ? '#80FF00' : '#F59E0B'}
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

                  {/* Verdict details */}
                  <div className="min-w-0 flex-grow text-center md:text-left space-y-2">
                    <h4 className="text-xl font-black text-gray-900 leading-snug">
                      CV Health Report
                    </h4>
                    <p className="text-sm text-gray-500 font-semibold leading-relaxed">
                      {activeSnapshot.healthIndex >= 80 ? 'Excellent match' : activeSnapshot.healthIndex >= 60 ? 'Moderate match' : 'Needs Optimization'} · {activeSnapshot.healthIndex >= 80 ? 'strong foundation' : 'foundational setup ready'}
                    </p>
                    
                    {/* Visual Status Pills */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                        {activeSnapshot.stats.skillsFound} skills found
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                        {activeSnapshot.missingKeywords.length} gaps
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        {activeSnapshot.stats.experienceYears} Years Exp
                      </span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Panels */}
                <div className="space-y-4">
                  {/* Category Scores Panel */}
                  <div className="bg-white border border-gray-200 rounded-[24px] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleSection('categories')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📊</span>
                        <span className="text-sm font-black uppercase tracking-wider text-gray-700">Category Scores</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-amber-500/10 text-amber-600">
                          Breakdown
                        </span>
                        {expandedSections.categories ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {expandedSections.categories && (
                      <div className="p-6 space-y-4">
                        {[
                          { label: 'Structure & Formatting', score: activeSnapshot.breakdown.structure * 5 },
                          { label: 'ATS Readability', score: activeSnapshot.breakdown.readability * 5 },
                          { label: 'Content Strength', score: activeSnapshot.breakdown.contentStrength * 5 },
                          { label: 'Skills & Keywords', score: activeSnapshot.breakdown.skillsKeywords * 5 },
                          { label: 'Impact & Achievements', score: activeSnapshot.breakdown.impactAchievements * 5 },
                        ].map((c, i) => {
                          const barColor = c.score >= 70 ? 'bg-emerald-500' : c.score >= 40 ? 'bg-amber-500' : 'bg-rose-500';
                          return (
                            <div key={i} className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                <span>{c.label}</span>
                                <span>{c.score}%</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <motion.div 
                                  className={`h-full rounded-full ${barColor}`} 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${c.score}%` }}
                                  transition={{ duration: 1, delay: 0.1 * i }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Keyword Audit Panel */}
                  <div className="bg-white border border-gray-200 rounded-[24px] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleSection('keywords')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🏷️</span>
                        <span className="text-sm font-black uppercase tracking-wider text-gray-700">Keyword Audit</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600">{activeSnapshot.missingKeywords.length} missing</span>
                        </span>
                        {expandedSections.keywords ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {expandedSections.keywords && (
                      <div className="p-6 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {activeSnapshot.missingKeywords.map((k: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-55/70 text-rose-600 border border-rose-100">
                              {k}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase text-gray-400 border-t border-gray-100 pt-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" /> Missing in CV
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* What's Working For You Panel */}
                  <div className="bg-white border border-gray-200 rounded-[24px] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleSection('strengths')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">👍</span>
                        <span className="text-sm font-black uppercase tracking-wider text-gray-700">What's working for you</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-600">
                          {activeSnapshot.strengths.length} Strengths
                        </span>
                        {expandedSections.strengths ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {expandedSections.strengths && (
                      <div className="p-6 divide-y divide-gray-100">
                        {activeSnapshot.strengths.map((s: string, i: number) => (
                          <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-black text-gray-900 leading-relaxed">
                                {s}
                              </h5>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {getStrengthDescription(s)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Critical Gaps Panel */}
                  <div className="bg-white border border-gray-200 rounded-[24px] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleSection('gaps')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm font-black uppercase tracking-wider text-gray-700">Critical Gaps</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-rose-500/10 text-rose-600">
                          {activeSnapshot.weaknesses.length} Blockers
                        </span>
                        {expandedSections.gaps ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {expandedSections.gaps && (
                      <div className="p-6 divide-y divide-gray-100">
                        {activeSnapshot.weaknesses.map((w: string, i: number) => (
                          <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                              <X className="w-3.5 h-3.5 text-rose-600" />
                            </div>
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-black text-gray-900 leading-relaxed">
                                {w}
                              </h5>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {getWeaknessDescription(w)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Recommendation Banner */}
                <div className="bg-indigo-600 rounded-[24px] p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-xl relative overflow-hidden group gap-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg">
                      <Sparkles size={20} className="fill-white animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black uppercase tracking-wide">Onboarding Recommendation</h4>
                      <p className="text-xs text-indigo-100 max-w-md font-medium leading-relaxed">
                        Improve your CV's score index by modifying it in the editor. We've saved these suggestions directly to your CV profile draft.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 relative z-10 shrink-0">
                    <div className="text-center">
                      <span className="text-3xl font-black">{(activeSnapshot.healthIndex || 0) + (activeSnapshot.potentialBoost || 0)}%</span>
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mt-1">Potential Score</p>
                    </div>
                    
                    <div className="h-10 w-px bg-white/20 hidden md:block" />
                    
                    <div className="text-left hidden md:block">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Top Priority</p>
                      <p className="text-xs font-bold text-white max-w-[200px] leading-tight">
                        {activeSnapshot.topPriority || 'Address gaps in the editor to boost score.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex flex-col items-center gap-4 pt-4 border-t border-gray-100">
                  <Button 
                    onClick={() => {
                      completeOnboarding('/editor');
                    }}
                    className="w-full bg-[#80FF00] hover:bg-[#70e600] text-black font-extrabold py-6 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm uppercase tracking-tight"
                  >
                    Go directly to CV Editor (Fast Track) <ArrowRight className="h-5 w-5" />
                  </Button>
                  <button 
                    onClick={handleNext}
                    className="text-[10px] text-gray-400 hover:text-black font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                  >
                    Continue Personalization Flow <ChevronRight size={12} strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: LinkedIn Profile Optimizer Promotion */}
            {currentStep === 4 && (
              <div className="space-y-6 flex flex-col justify-between h-full animate-fade-in">
                <div className="space-y-3 text-center">
                  <span className="text-xs font-black uppercase tracking-widest text-[#80FF00] bg-black px-3 py-1 rounded-full">Recruiter Magnet</span>
                  <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-gray-900 dark:text-white">
                    LinkedIn Profile Optimizer
                  </h1>
                  <p className="text-gray-500 dark:text-white/60 text-sm max-w-xl mx-auto">
                    Sync your CV improvements directly to your LinkedIn. Transform passive profiles into recruiter magnets with optimized taglines and impactful summaries.
                  </p>
                </div>

                {/* Before/After Showcase */}
                <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] border border-gray-250/60 dark:border-white/5 flex flex-col gap-4 flex-1 justify-center min-h-[220px]">
                  {/* Before */}
                  <div className="flex items-center gap-4 bg-white dark:bg-[#1A1A1A]/40 p-4 rounded-2xl border border-gray-200/40 opacity-70">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center font-bold text-gray-400 shrink-0">JD</div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="h-3 w-28 bg-gray-200 rounded dark:bg-white/10" />
                      <div className="text-[11px] text-gray-450 dark:text-gray-400 font-medium font-mono truncate">"Software Developer at ABC Inc | Looking for new opportunities"</div>
                    </div>
                    <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold dark:bg-red-500/10 shrink-0">Unoptimized</span>
                  </div>

                  {/* Arrow connector with animated Sparkle */}
                  <div className="flex justify-center text-[#80FF00]">
                    <Sparkles className="w-6 h-6 animate-pulse text-[#80FF00]" />
                  </div>

                  {/* After */}
                  <motion.div 
                    className="flex items-center gap-4 bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl border border-lime-300 dark:border-lime-500/30 shadow-[0_10px_30px_rgba(128,255,0,0.06)]"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#80FF00] to-emerald-400 flex items-center justify-center font-bold text-black shadow-sm shrink-0">JD</div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-32 bg-gray-300 rounded dark:bg-white/20" />
                        <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.2 rounded font-bold shrink-0">5x Index Boost</span>
                      </div>
                      <div className="text-[11px] text-gray-800 dark:text-gray-200 font-extrabold font-mono truncate">
                        "Lead Full-Stack Architect | Building scalable Cloud Infra to support 12M+ active sessions"
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-500 px-2.5 py-0.5 rounded-full font-black dark:bg-emerald-500/10 shrink-0">Attracts DMs</span>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Step 999: Unused Placeholder */}
            {currentStep === 999 && (
              <div className="space-y-6 flex flex-col justify-between h-full">
                <div className="space-y-3 text-center animate-fade-in">
                  <span className="text-xs font-black uppercase tracking-widest text-[#80FF00] bg-black px-3 py-1 rounded-full">Recruiter Magnet</span>
                  <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-gray-900 dark:text-white">
                    LinkedIn Profile Optimizer
                  </h1>
                  <p className="text-gray-500 dark:text-white/60 text-sm max-w-xl mx-auto">
                    Sync your CV improvements directly to your LinkedIn. Transform passive profiles into recruiter magnets with optimized taglines and impactful summaries.
                  </p>
                </div>

                {/* Before/After Showcase */}
                <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] border border-gray-250/60 dark:border-white/5 flex flex-col gap-4 flex-1 justify-center min-h-[220px]">
                  {/* Before */}
                  <div className="flex items-center gap-4 bg-white dark:bg-[#1A1A1A]/40 p-4 rounded-2xl border border-gray-200/40 opacity-70">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center font-bold text-gray-400 shrink-0">JD</div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="h-3 w-28 bg-gray-200 rounded dark:bg-white/10" />
                      <div className="text-[11px] text-gray-450 dark:text-gray-400 font-medium font-mono truncate">"Software Developer at ABC Inc | Looking for new opportunities"</div>
                    </div>
                    <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold dark:bg-red-500/10 shrink-0">Unoptimized</span>
                  </div>

                  {/* Arrow connector with animated Sparkle */}
                  <div className="flex justify-center text-[#80FF00]">
                    <Sparkles className="w-6 h-6 animate-pulse text-[#80FF00]" />
                  </div>

                  {/* After */}
                  <motion.div 
                    className="flex items-center gap-4 bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl border border-lime-300 dark:border-lime-500/30 shadow-[0_10px_30px_rgba(128,255,0,0.06)]"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#80FF00] to-emerald-400 flex items-center justify-center font-bold text-black shadow-sm shrink-0">JD</div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-32 bg-gray-300 rounded dark:bg-white/20" />
                        <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.2 rounded font-bold shrink-0">5x Index Boost</span>
                      </div>
                      <div className="text-[11px] text-gray-800 dark:text-gray-200 font-extrabold font-mono truncate">
                        "Lead Full-Stack Architect | Building scalable Cloud Infra to support 12M+ active sessions"
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-500 px-2.5 py-0.5 rounded-full font-black dark:bg-emerald-500/10 shrink-0">Attracts DMs</span>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Step 7: Promotes AI Interview Coach */}
            {currentStep === 7 && (
              <div className="space-y-6 flex flex-col justify-between h-full">
                <div className="space-y-3 text-center animate-fade-in">
                  <span className="text-xs font-black uppercase tracking-widest text-[#80FF00] bg-black px-3 py-1 rounded-full">Interview Ready</span>
                  <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-gray-900 dark:text-white">
                    Real-Time AI Interview Coach
                  </h1>
                  <p className="text-gray-500 dark:text-white/60 text-sm max-w-xl mx-auto">
                    Practice answering questions tailored to your CV and specific target roles. Receive immediate, data-driven audio feedback on structural gaps, tone, and confidence.
                  </p>
                </div>

                {/* Conversation Flow Visualizer */}
                <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] border border-gray-250/60 dark:border-white/5 flex flex-col md:flex-row gap-4 flex-1 justify-center min-h-[220px]">
                  <div className="flex-1 space-y-3">
                    <div className="bg-white dark:bg-[#1A1A1A] p-3 rounded-2xl rounded-tl-none border border-gray-200/50 dark:border-white/10 shadow-sm">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1 mb-1">
                        <Bot className="w-3.5 h-3.5" /> AI Coach
                      </span>
                      <p className="text-[11px] font-medium leading-relaxed text-gray-800 dark:text-gray-200">
                        "Tell me about a time you had to optimize performance. What metrics did you use?"
                      </p>
                    </div>

                    {/* Waveform loops */}
                    <div className="flex items-center gap-1 px-4 h-6">
                      {[...Array(14)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-[#80FF00] rounded-full"
                          animate={{
                            height: [8, Math.floor(Math.random() * 20) + 8, 8]
                          }}
                          transition={{
                            duration: 0.8 + (i % 3) * 0.2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Feedback Rating card overlay */}
                  <motion.div 
                    className="w-full md:w-48 bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl border border-blue-500/20 shadow-lg space-y-3 shrink-0"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Live AI Evaluation</span>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-0.5">
                          <span>Delivery Structure</span>
                          <span>92%</span>
                        </div>
                        <div className="w-full bg-gray-150 h-1 rounded-full overflow-hidden dark:bg-white/15">
                          <div className="bg-emerald-500 h-full rounded-full w-[92%]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-0.5">
                          <span>Confidence Metrics</span>
                          <span>86%</span>
                        </div>
                        <div className="w-full bg-gray-150 h-1 rounded-full overflow-hidden dark:bg-white/15">
                          <div className="bg-emerald-500 h-full rounded-full w-[86%]" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 italic">
                      Tip: Expand on task outcomes using raw numbers.
                    </p>
                  </motion.div>
                </div>
              </div>
            )}



            {/* Step 5: Search Status */}
            {currentStep === 5 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Job Search Status
                  </h1>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    What is your current search strategy? This helps us configure notifications and automation alerts.
                  </p>
                </div>

                <div className="grid gap-3 max-w-md mx-auto">
                  {[
                    { id: 'browsing', label: 'Just browsing', desc: 'No active searches, just updating CV for potential future needs.' },
                    { id: 'exploring', label: 'Exploring opportunities', desc: 'Open to interesting roles if they fit, checking boards occasionally.' },
                    { id: 'active', label: 'Actively applying weekly', desc: 'Checking roles, submitting several custom CV applications each week.' },
                    { id: 'aggressive', label: 'Aggressively hunting', desc: 'Full time search. Submitting applications daily, seeking fast response.' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSearchStatus(option.id);
                        handleNext();
                      }}
                      className={`text-left p-5 border-2 rounded-xl transition-all relative ${
                        searchStatus === option.id ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-bold">{option.label}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Application Volume */}
            {currentStep === 6 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Expected Volume
                  </h1>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    How many job applications do you plan to send per month?
                  </p>
                </div>

                <div className="grid md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                  {[
                    { id: 'low', label: '0–5', desc: 'Low volume CV' },
                    { id: 'medium', label: '6–20', desc: 'Targeted search' },
                    { id: 'high', label: '21–50', desc: 'Active pipeline' },
                    { id: 'aggressive', label: '50+', desc: 'Scale search' }
                  ].map(vol => (
                    <button
                      key={vol.id}
                      onClick={() => {
                        setMonthlyVolume(vol.id);
                        handleNext();
                      }}
                      className={`p-6 border-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all ${
                        monthlyVolume === vol.id ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl font-black">{vol.label}</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{vol.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 8: Integrated Tracker Promotion & Interest */}
            {currentStep === 8 && (
              <div className="space-y-6 flex flex-col justify-between h-full animate-fade-in">
                <div className="space-y-2 text-center">
                  <span className="text-xs font-black uppercase tracking-widest text-[#80FF00] bg-black px-3 py-1 rounded-full">Automation Suite</span>
                  <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-gray-900 dark:text-white">
                    Autopilot Application Tracker
                  </h1>
                  <p className="text-gray-500 dark:text-white/60 text-sm max-w-xl mx-auto">
                    Let AI scout matching roles, draft cover letters, autofill forms, and sync interview calendar updates automatically.
                  </p>
                </div>

                {/* Rich Animating Visual Board with Explanatory Overlay */}
                <div className="grid md:grid-cols-2 gap-6 bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] border border-gray-250/60 dark:border-white/5 flex-1 min-h-[260px] items-center">
                  
                  {/* Kanban Pipeline Board */}
                  <div className="grid grid-cols-4 gap-2 bg-white dark:bg-[#1A1A1A]/40 p-4 rounded-2xl border border-gray-250/60 dark:border-white/5 h-full min-h-[180px]">
                    {[
                      { name: 'Scout', color: 'bg-indigo-500' },
                      { name: 'Applied', color: 'bg-amber-500' },
                      { name: 'Interviews', color: 'bg-blue-500' },
                      { name: 'Offers', color: 'bg-[#80FF00]' }
                    ].map((col, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-[#1A1A1A] p-2 rounded-xl border border-gray-200/50 dark:border-white/5 flex flex-col gap-2 relative overflow-hidden h-full min-h-[140px]">
                        <span className="text-[8px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <div className={`w-1 h-1 rounded-full ${col.color}`} /> {col.name}
                        </span>

                        {/* Animating Card depending on trackerAnimStage */}
                        {idx === 0 && trackerAnimStage === 0 && (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white dark:bg-[#2A2A2A] p-2 rounded-lg border border-indigo-400 shadow-sm text-[10px] space-y-1"
                          >
                            <div className="font-extrabold truncate text-gray-900 dark:text-white">React Lead</div>
                            <div className="text-[8px] text-indigo-500 font-bold">Stripe • Matching!</div>
                          </motion.div>
                        )}

                        {idx === 1 && trackerAnimStage === 1 && (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white dark:bg-[#2A2A2A] p-2 rounded-lg border border-amber-400 shadow-sm text-[10px] space-y-1"
                          >
                            <div className="font-extrabold truncate text-gray-900 dark:text-white">React Lead</div>
                            <div className="text-[8px] text-amber-500 font-bold flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5 animate-bounce" /> Sending Apply...
                            </div>
                          </motion.div>
                        )}

                        {idx === 2 && trackerAnimStage === 2 && (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white dark:bg-[#2A2A2A] p-2 rounded-lg border border-blue-400 shadow-sm text-[10px] space-y-1"
                          >
                            <div className="font-extrabold truncate text-gray-900 dark:text-white">React Lead</div>
                            <div className="text-[8px] text-blue-500 font-bold">Round 1 Scheduled</div>
                          </motion.div>
                        )}

                        {idx === 3 && trackerAnimStage === 3 && (
                          <motion.div 
                            layoutId="tracker-live-card"
                            className="bg-white dark:bg-[#2A2A2A] p-2 rounded-lg border border-lime-400 shadow-md text-[10px] space-y-1"
                          >
                            <div className="font-extrabold truncate text-gray-900 dark:text-white">React Lead</div>
                            <div className="text-[8px] text-[#80FF00] font-black flex items-center gap-0.5">
                              <Trophy className="w-2.5 h-2.5 text-[#80FF00]" /> Offer $160K
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Stage Explaining Text column */}
                  <div className="space-y-3">
                    {[
                      { stage: 0, title: '1. Auto-Scouting Match', desc: 'AI scans job boards and matches roles to your CV profile instantly.' },
                      { stage: 1, title: '2. Smart Email Apply', desc: 'Drafts tailored cover letters and emails, auto-submitting in 1-click.' },
                      { stage: 2, title: '3. Calendar Auto-Sync', desc: 'Reads incoming interview confirmations and schedules preparation triggers.' },
                      { stage: 3, title: '4. Offer & Pipeline Win', desc: 'Tracks offers, compares salaries, and saves structural highlights.' }
                    ].map((step, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all duration-300 text-left ${
                          trackerAnimStage === step.stage 
                            ? 'bg-white dark:bg-[#1A1A1A] border-lime-300 dark:border-lime-500/30 shadow-md scale-[1.02]' 
                            : 'border-transparent opacity-40'
                        }`}
                      >
                        <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                          <CheckCircle className={`w-3.5 h-3.5 ${trackerAnimStage === step.stage ? 'text-[#80FF00]' : 'text-gray-300'}`} />
                          {step.title}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yes/No Selection wrapper */}
                <div className="space-y-3 text-center max-w-sm mx-auto pt-2">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-450 uppercase tracking-widest">Would a visual tracker help organize your search?</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTrackerInterest('yes');
                        handleNext();
                      }}
                      className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all text-xs ${
                        trackerInterest === 'yes' 
                          ? 'border-black bg-slate-50 dark:border-[#80FF00] dark:bg-white/5 dark:text-white' 
                          : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20 dark:text-gray-300'
                      }`}
                    >
                      Yes, absolutely
                    </button>
                    <button
                      onClick={() => {
                        setTrackerInterest('no');
                        handleNext();
                      }}
                      className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all text-xs ${
                        trackerInterest === 'no' 
                          ? 'border-black bg-slate-50 dark:border-[#80FF00] dark:bg-white/5 dark:text-white' 
                          : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20 dark:text-gray-300'
                      }`}
                    >
                      No, just need CV
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 9: Auto-Apply feature list */}
            {currentStep === 9 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Automate Submissions
                  </h1>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    Let AI manage the tedious work of finding matching jobs and submitting tailored applications.
                  </p>
                </div>

                {/* Auto-apply simulation */}
                <div className="bg-slate-50 border border-gray-150 p-6 rounded-2xl max-w-md mx-auto space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Autopilot Activity</span>
                    <span className="text-[10px] bg-black text-[#80FF00] px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">Running</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: 'Scouting compatibility match...', activeStep: 1 },
                      { label: 'Recalibrating bullet points to job description...', activeStep: 2 },
                      { label: 'Writing tailored summary paragraph...', activeStep: 3 },
                      { label: 'Autofilling portal input questions...', activeStep: 4 }
                    ].map((step, index) => {
                      const isDone = autoApplyStep >= step.activeStep;
                      const isCurrent = autoApplyStep === step.activeStep - 1;
                      return (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100">
                          <span className={`${isDone ? 'text-black font-semibold' : isCurrent ? 'text-black font-bold' : 'text-gray-400'}`}>
                            {step.label}
                          </span>
                          {isDone ? (
                            <Check className="h-4 w-4 text-green-600 stroke-[3]" />
                          ) : isCurrent ? (
                            <Loader2 className="h-4 w-4 animate-spin text-black" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-200" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 text-center max-w-sm mx-auto pt-2">
                  <h3 className="font-bold">Automate filling repetitive job applications?</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setAutoapplyInterest('yes');
                        handleNext();
                      }}
                      className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all ${
                        autoapplyInterest === 'yes' ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Yes, automate it!
                    </button>
                    <button
                      onClick={() => {
                        setAutoapplyInterest('no');
                        handleNext();
                      }}
                      className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all ${
                        autoapplyInterest === 'no' ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      No, manual apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 10: Search preferences */}
            {currentStep === 10 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Target Preferences
                  </h1>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    Define your job target parameters to feed the matching algorithm.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
                  {/* Roles */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                      <Search className="h-3.5 w-3.5 text-gray-400" /> Target Roles (Select one or more)
                    </label>
                    <div className="relative">
                      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-3.5 bg-slate-50/70 dark:bg-black/10 rounded-2xl border border-gray-200/60 dark:border-white/5 shadow-inner pr-6">
                        {[
                          'Software Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'Growth Lead',
                          'Teacher', 'Sales Associate', 'Customer Service Representative', 'Administrative Assistant',
                          'Retail Associate', 'Cashier', 'Receptionist', 'Delivery Driver', 'Operations Manager',
                          'HR Specialist', 'Technical Recruiter', 'Account Executive', 'Marketing Specialist',
                          'Financial Analyst', 'Business Analyst', 'Content Strategist', 'Office Manager',
                          'Warehouse Associate', 'Security Officer', 'Other'
                        ].map(role => {
                          const isSel = targetRoles.includes(role);
                          return (
                            <motion.button
                              key={role}
                              type="button"
                              onClick={() => {
                                if (isSel) setTargetRoles(prev => prev.filter(r => r !== role));
                                else setTargetRoles(prev => [...prev, role]);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
                                isSel 
                                  ? 'bg-black text-[#80FF00] border-black shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-[1.03]' 
                                  : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-650 hover:text-black hover:scale-[1.01]'
                              }`}
                              whileTap={{ scale: 0.97 }}
                            >
                              {role}
                            </motion.button>
                          );
                        })}
                      </div>
                      {/* Subtle bottom scroll indicator fade */}
                      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/90 to-transparent pointer-events-none rounded-b-2xl" />
                    </div>
                  </div>

                  {/* Location preference */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Workplace Layout
                    </label>
                    <div className="flex gap-2 h-[38px]">
                      {['Remote', 'Hybrid', 'Onsite'].map(loc => {
                        const isSel = locations.includes(loc);
                        return (
                          <button
                            key={loc}
                            onClick={() => {
                              if (isSel) setLocations(prev => prev.filter(l => l !== loc));
                              else setLocations(prev => [...prev, loc]);
                            }}
                            className={`flex-1 border rounded-xl text-xs font-bold transition-all ${
                              isSel ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-655 hover:border-gray-300'
                            }`}
                          >
                            {loc}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" /> Experience Level
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={e => setExperienceLevel(e.target.value)}
                      className="w-full h-[38px] py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black text-gray-700 font-medium"
                    >
                      <option value="">Select Level...</option>
                      <option value="entry">Entry (0-2 years)</option>
                      <option value="mid">Mid-Senior (3-6 years)</option>
                      <option value="senior">Senior (7+ years)</option>
                      <option value="exec">Lead / Executive</option>
                    </select>
                  </div>

                  {/* Target Salary */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> Target Salary Range
                    </label>
                    <select
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                      className="w-full h-[38px] py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black text-gray-700 font-medium"
                    >
                      <option value="">Select Range...</option>
                      <option value="under_60k">Under $60,000</option>
                      <option value="60k_90k">$60,000 - $90,000</option>
                      <option value="90k_120k">$90,000 - $120,000</option>
                      <option value="120k_150k">$120,000 - $150,000</option>
                      <option value="150k_180k">$150,000 - $180,000</option>
                      <option value="180k_220k">$180,000 - $220,000</option>
                      <option value="above_220k">$220,000+</option>
                    </select>
                  </div>

                  {/* Visa sponsorship */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Visa Sponsorship
                    </label>
                    <div className="flex gap-2 h-[38px]">
                      <button
                        onClick={() => setVisaRequired(true)}
                        className={`flex-1 border rounded-xl text-xs font-bold transition-all ${
                          visaRequired === true ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-655 hover:border-gray-300'
                        }`}
                      >
                        Required
                      </button>
                      <button
                        onClick={() => setVisaRequired(false)}
                        className={`flex-1 border rounded-xl text-xs font-bold transition-all ${
                          visaRequired === false ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-655 hover:border-gray-300'
                        }`}
                      >
                        Not Needed
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button 
                    onClick={handleNext}
                    className="text-xs text-gray-500 hover:text-black font-semibold uppercase tracking-wider"
                  >
                    Skip Target Settings ➔
                  </button>
                </div>
              </div>
            )}

            {/* Step 11: Score calculation & Personalized Recommendation */}
            {currentStep === 11 && (() => {
              // Custom styles
              const accentColorClass = "text-lime-600 dark:text-[#80FF00]";
              const bgGlowClass = "from-lime-50/50 to-emerald-50/30";
              const borderClass = "border-lime-200 dark:border-[#80FF00]/20";
              const buttonBgClass = "bg-black text-[#80FF00] hover:bg-slate-900 shadow-md";
              const TitleText = "Congratulations on completing the 1st step of automating your job search experience!";
              const DescText = "Let's finalise your Primary CV which will be used for referring, auto-submitting applications, and tailored coaching.";
              const CtaText = "Start Optimizing My CV";

              return (
                <div className="space-y-8 max-w-2xl mx-auto py-4 relative">
                  {/* Confetti Animation Effect */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                    {[...Array(25)].map((_, idx) => {
                      const color = ['bg-[#80FF00]', 'bg-blue-400', 'bg-pink-400', 'bg-amber-400', 'bg-indigo-400'][idx % 5];
                      return (
                        <motion.div
                          key={idx}
                          className={`absolute w-2 h-2 rounded-full ${color}`}
                          initial={{ 
                            x: 0, 
                            y: 100, 
                            opacity: 0, 
                            scale: Math.random() * 0.8 + 0.4 
                          }}
                          animate={{ 
                            x: (Math.random() - 0.5) * 500, 
                            y: (Math.random() - 0.7) * 400 - 50, 
                            opacity: [0, 1, 1, 0],
                            rotate: Math.random() * 360
                          }}
                          transition={{ 
                            duration: 2.5 + Math.random() * 1.5,
                            repeat: Infinity,
                            delay: Math.random() * 0.5,
                            ease: "easeOut"
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="space-y-3 text-center relative z-10">
                    <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-black">
                      Onboarding Completed! 🎉
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-gray-900 leading-tight">
                      {TitleText}
                    </h1>
                  </div>

                  {/* Handwritten Note Card */}
                  <div className="relative bg-[#faf7f2] border border-amber-100 rounded-3xl p-6 md:p-8 shadow-[0_15px_30px_rgba(0,0,0,0.03)] text-left font-serif max-w-lg mx-auto z-10 overflow-hidden transform rotate-[-0.5deg] hover:rotate-0 transition-transform duration-300">
                    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap" rel="stylesheet" />
                    
                    {/* Decorative paper clip simulation or pen label */}
                    <div className="absolute top-3 right-4 text-[10px] text-amber-800/40 uppercase tracking-widest font-sans font-black select-none">
                      CEO's Office
                    </div>

                    <div className="space-y-4 text-amber-950/90 text-lg leading-relaxed select-text" style={{ fontFamily: "'Caveat', cursive" }}>
                      <p className="text-xl font-bold">Dear {parsedCVData?.basics?.name ? parsedCVData.basics.name.trim().split(' ')[0] : 'candidate'},</p>
                      <p>
                        Welcome to CVCircle. We built this platform to take the tedious manual labor out of your job search so you can focus on landing roles you actually love. You've just mapped your preferences perfectly.
                      </p>
                      <p>
                        Let's finalise your Primary CV. This master profile will fuel our scouting algorithm, auto-submit applications, and power your tailored coaching triggers.
                      </p>
                      <div className="pt-2 flex justify-between items-end">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xl text-black">Amar Lohia</p>
                          <p className="text-xs uppercase tracking-wider font-sans font-bold text-gray-400 select-none">CEO, CVCircle</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-lg mx-auto pt-2 z-10 relative">
                    <Button
                      onClick={() => completeOnboarding('/editor')}
                      className={`w-full py-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all ${buttonBgClass}`}
                    >
                      {CtaText} <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                    </Button>
                  </div>

                  <div className="text-center pt-2 relative z-10">
                    <button 
                      onClick={() => completeOnboarding('/editor')}
                      className="text-xs text-gray-500 hover:text-black font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 mx-auto hover:scale-105 duration-200"
                    >
                      Review my CV <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()}
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      </main>

      {/* Footer / Navigation Bar */}
      <footer className="px-6 py-4 border-t transition-colors duration-300 text-xs text-gray-400 border-gray-150 bg-[#f3f2ee]">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          {/* Back button */}
          {currentStep !== 11 ? (
            <Button
              onClick={handleBack}
              disabled={currentStep === 1}
              variant="ghost"
              className="font-bold flex items-center gap-1.5 rounded-xl hover:bg-slate-200/50 px-4 py-2 text-gray-500 disabled:opacity-30 dark:hover:bg-white/5 dark:text-gray-400"
            >
              <ChevronLeft className="h-4.5 w-4.5" /> Back
            </Button>
          ) : (
            <div className="w-[80px]" />
          )}

          {/* Copyright text */}
          <div className="text-center font-medium">
            &copy; {new Date().getFullYear()} CVCircle. All features secured.
          </div>

          {/* Next button */}
          {currentStep !== 11 ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !intent) ||
                (currentStep === 2 && (!seedingMethod || (seedingMethod !== 'scratch' && !parsedCVData))) ||
                (currentStep === 5 && !searchStatus) ||
                (currentStep === 6 && !monthlyVolume) ||
                (currentStep === 8 && !trackerInterest) ||
                (currentStep === 9 && !autoapplyInterest)
              }
              className="bg-black text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 rounded-xl px-5 py-2.5 shadow-sm disabled:opacity-35 dark:bg-[#80FF00] dark:text-black dark:hover:bg-[#70e600]"
            >
              Next <ChevronRight className="h-4.5 w-4.5" />
            </Button>
          ) : (
            <div className="w-[80px]" />
          )}
        </div>
      </footer>

    </div>
  );
};

export default WelcomePage;
