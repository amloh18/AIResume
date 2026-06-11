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
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/Logo';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import CodeVerificationScreen from '@/components/auth/CodeVerificationScreen';
import { toast } from 'react-hot-toast';
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
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Dynamic description mappings for strengths and weaknesses
  const getStrengthDescription = (strength: string) => {
    const str = strength.toLowerCase();
    if (str.includes('keyword') || str.includes('alignment')) return 'Excellent alignment with industry-standard terminology.';
    if (str.includes('structure') || str.includes('layout')) return 'Easy for human recruiters and ATS software to scan quickly.';
    if (str.includes('contact') || str.includes('email') || str.includes('phone') || str.includes('details')) return 'Essential details are prominent and formatted correctly.';
    if (str.includes('skills') || str.includes('expertise')) return 'Well-defined skill sections showing technical competencies.';
    if (str.includes('experience') || str.includes('work') || str.includes('history') || str.includes('timeline')) return 'Rich work history with clear progression and dates.';
    return 'Contributes to a highly readable and professional CV.';
  };

  const getWeaknessDescription = (weakness: string) => {
    const str = weakness.toLowerCase();
    if (str.includes('keyword') || str.includes('missing')) return 'Essential industry terms are missing; this hurts ATS keyword screening.';
    if (str.includes('quantified') || str.includes('achievement') || str.includes('metrics') || str.includes('results')) return 'Recruiters favor metrics (e.g. sales grown 20%, time saved by 5h).';
    if (str.includes('summary') || str.includes('profile') || str.includes('objective')) return 'A strong summary at the top helps frame your career elevator pitch.';
    if (str.includes('skills') || str.includes('technical')) return 'Define a clearer skills section to highlight core keywords.';
    if (str.includes('length') || str.includes('word')) return 'Adjust length to avoid fluff and keep sections crisp.';
    return 'Improve this section to optimize your resume and bypass ATS filters.';
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
      await fetch('/api/user/onboarding-session', {
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
          currentStep: 3, // Start at Step 3 (Surgeon Builder) in the editor
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
    try {
      const parsed = JSON.parse(jsonInput);
      setParsedCVData(parsed);
      setSeedingMethod('json');
      setShowJsonModal(false);
      
      // Early CV Creation
      await savePrimaryCV(parsed, droppedFile || 'Primary CV', cvScore);
      
      handleNext();
    } catch (e) {
      setJsonError('Invalid JSON format. Please check and try again.');
    }
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
        const sessionRes = await fetch('/api/user/onboarding-session');
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
                const step = Math.max(1, parseInt(stepMatch[1]));
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
        
        // Check and transfer guest draft if authenticated
        checkAndTransferGuestDraft();
        
        // If they fast-tracked, call completion logic instead of simple redirect
        if (parsed.fastTrackToEditor) {
          completeOnboarding('/editor', parsed);
        } else {
          setCurrentStep(parsed.step || 5);
        }
      } catch (e) {
        console.error('Error restoring onboarding state:', e);
      }
    }
  }, [status, router]);

  // Handle Next Navigation
  const handleNext = () => {
    // Skip Step 3 (Analysis) for scratch CVs
    if (currentStep === 2 && (intent === 'cv_scratch' || seedingMethod === 'scratch')) {
      if (status === 'authenticated') {
        setCurrentStep(5); // Skip Step 3 and Step 4 (Auth Wall)
      } else {
        setCurrentStep(4); // Skip Step 3
      }
      return;
    }

    if (currentStep === 3 && (intent === 'cv' || intent === 'cv_scratch')) {
      // Type 1 User Fast-Track check: If user fast-tracks, set flag & go to auth or editor
      if (status === 'authenticated') {
        completeOnboarding('/editor');
      } else {
        setFastTrackToEditor(true);
        setCurrentStep(4);
      }
      return;
    }

    if (currentStep === 3 && status === 'authenticated') {
      // If already logged in, skip auth wall (step 4)
      setCurrentStep(5);
      return;
    }

    if (currentStep < 10) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete Onboarding redirection based on scores
      const rec = getRecommendedTier();
      completeOnboarding(rec.redirectUrl);
    }
  };

  const handleBack = () => {
    if (currentStep === 5 && status === 'authenticated') {
      if (intent === 'cv_scratch' || seedingMethod === 'scratch') {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep === 4 && (intent === 'cv_scratch' || seedingMethod === 'scratch')) {
      setCurrentStep(2);
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
        : '/editor?doc=master-cv&mode=improve&step=2';
        
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

      if (isUserAuth) {
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
        // Guest user - redirect to editor or dashboard with restore draft flag
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

  // Actual Parser Implementation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setActualFile(file);
      setDroppedFile(file.name);
      setIsParsing(true);
      setParseProgress(0);
      setParseStep(0);

      const formData = new FormData();
      formData.append('file', file);

      try {
        // Start visual progress simulator in parallel
        const progressInterval = setInterval(() => {
          setParseProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            // Update steps based on progress
            if (prev === 25) setParseStep(1);
            if (prev === 50) setParseStep(2);
            if (prev === 75) setParseStep(3);
            return prev + 5;
          });
        }, 200);

        const response = await fetch('/api/cv/parse', {
          method: 'POST',
          body: formData,
        });

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
        
        clearInterval(progressInterval);
        setParseProgress(100);

        // The API returns the CV data structure directly if successful, with a _parsed flag
        if (result._parsed || result.basics || result.work) {
          // Store the whole result as the CV data
          setParsedCVData(result);
          
          // Early CV Creation
          const score = result.analysis?.score || result._score || 68;
          setCVScore(score);
          await savePrimaryCV(result, file.name, score);
          
          triggerNotification("CV Parsed successfully!");
          setTimeout(() => {
            setIsParsing(false);
            handleNext();
          }, 800);
        } else {
          throw new Error(result.error || "Parsing failed");
        }
      } catch (err: any) {
        console.error("Parsing error:", err);
        const errMsg = err?.message || "Failed to parse CV. Please try again or Start Fresh.";
        toast.error(errMsg, { duration: 5000, position: 'bottom-right' });
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

  // Mini Kanban Animation loop for Step 7
  const [kanbanStage, setKanbanStage] = useState(0);
  useEffect(() => {
    if (currentStep !== 7) return;
    const interval = setInterval(() => {
      setKanbanStage(prev => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, [currentStep]);

  // Mini Auto-Apply animation for Step 8
  const [autoApplyStep, setAutoApplyStep] = useState(0);
  useEffect(() => {
    if (currentStep !== 8) return;
    const interval = setInterval(() => {
      setAutoApplyStep(prev => (prev + 1) % 5);
    }, 2200);
    return () => clearInterval(interval);
  }, [currentStep]);

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col justify-between selection:bg-lime-200 transition-colors duration-300 ${
      currentStep === 4 ? 'bg-[#141810] text-white dark' : 'bg-[#f3f2ee] text-[#1A1A1A]'
    }`}>
      
      {/* Top Header */}
      <header className={`px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b transition-colors duration-300 ${
        currentStep === 4 ? 'border-white/10' : 'border-gray-100'
      }`}>
        <Logo size="sm" />
        
        {/* Horizontal Progress Bar */}
        {!isLoadingSession && (
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span>Step {currentStep} of 10</span>
            <div className={`w-32 h-2 rounded-full overflow-hidden transition-colors duration-300 ${
              currentStep === 4 ? 'bg-white/10' : 'bg-gray-150'
            }`}>
              <div 
                className={`h-full transition-all duration-500 ease-out ${
                  currentStep === 4 ? 'bg-[#80FF00]' : 'bg-black'
                }`}
                style={{ width: `${currentStep * 10}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className={`${currentStep === 3 ? 'max-w-6xl' : 'max-w-4xl'} mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center transition-all duration-300`}>
        
        <AnimatePresence mode="wait">
          {isResuming ? (
            <motion.div
              key="resume-screen"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full bg-white border border-gray-150 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] max-w-2xl mx-auto relative overflow-hidden"
            >
              {/* Subtle top decoration line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#80FF00] via-emerald-400 to-[#80FF00]" />

              <div className="space-y-8">
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
                      Step {currentStep} of 10
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                      <motion.div 
                        className="bg-gradient-to-r from-[#80FF00] to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(128,255,0,0.5)]" 
                        initial={{ width: 0 }}
                        animate={{ width: `${currentStep * 10}%` }}
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
                    {status === 'authenticated' ? (
                      <div className="flex items-center gap-3 text-sm font-bold text-green-700">
                        <CheckCircle className="h-5 w-5 text-green-600 fill-green-100" />
                        <span>Account Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm font-bold text-amber-700">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <span>Authentication Pending</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
                      <span>{11 - currentStep} steps remaining to unlock full dashboard</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
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
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full transition-all duration-300 ${
                currentStep === 4 
                  ? 'max-w-md mx-auto bg-white dark:bg-[#141810] border border-gray-100 dark:border-white/10 rounded-md p-8 shadow-2xl' 
                  : 'bg-white border border-gray-200 rounded-[2rem] p-8 md:p-12 shadow-sm'
              }`}
            >
            
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

                {!isParsing ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { id: 'upload', title: 'Upload CV', desc: 'PDF, Word, TXT', icon: Upload },
                        { id: 'linkedin', title: 'LinkedIn', desc: 'Profile PDF', icon: Linkedin },
                        { id: 'json', title: 'JSON Data', desc: 'Copy-Paste JSON', icon: FileJson },
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
                                setParsedCVData(null); // CRITICAL: Reset any previously parsed data for scratch mode
                                setCVScore(0);
                                handleNext();
                              } else if (method.id === 'json') {
                                setShowJsonModal(true);
                              }
                            }}
                            className={`p-6 border-2 rounded-2xl text-center flex flex-col items-center justify-center gap-3 transition-all ${
                              isSelected ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
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

                    {(seedingMethod === 'upload' || seedingMethod === 'linkedin') && (
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
                          'Indexing skills keywords'
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
                              <Sparkles size={24} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-black">AI-Powered Import</h2>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Fast-track your tailored CV</p>
                            </div>
                          </div>
                          <button onClick={() => setShowJsonModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="p-5 bg-lime-50 rounded-[24px] border border-lime-100 space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-lime-800 flex items-center gap-2">
                              <Zap size={14} className="fill-lime-800" /> Getting started is simple
                            </h4>
                            
                            <div className="space-y-4 text-xs leading-relaxed text-lime-900/80">
                              <div className="flex gap-3">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-lime-200 text-lime-800 flex items-center justify-center font-black">1</span>
                                <p>Attach your CV or paste your LinkedIn profile into <strong>Claude or ChatGPT</strong>.</p>
                              </div>
                              <div className="flex gap-3">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-lime-200 text-lime-800 flex items-center justify-center font-black">2</span>
                                <p>Copy our specialized AI prompt below and paste it into the chat.</p>
                              </div>
                              <div className="flex gap-3">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-lime-200 text-lime-800 flex items-center justify-center font-black">3</span>
                                <p>Copy the JSON output provided by the AI and paste it into the box below.</p>
                              </div>
                            </div>

                            <div className="pt-2">
                              <Button 
                                onClick={copyJsonSample}
                                className="w-full bg-lime-800 hover:bg-lime-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 h-10 shadow-sm"
                              >
                                <Copy size={14} /> Copy AI Prompt
                              </Button>
                              <p className="text-[10px] text-lime-700/60 text-center mt-2 font-medium italic">
                                Voila! It's that easy to get a tailored CV. You can choose premium templates later.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">JSON Input</label>
                            <textarea 
                              value={jsonInput}
                              onChange={(e) => {
                                setJsonInput(e.target.value);
                                setJsonError('');
                              }}
                              placeholder='Paste the { "basics": ... } code block here'
                              className="w-full h-40 p-5 bg-slate-50 border border-gray-100 rounded-[24px] font-mono text-[11px] outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                            />
                            {jsonError && <p className="text-xs text-red-500 font-bold ml-2">{jsonError}</p>}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={() => setShowJsonModal(false)} variant="ghost" className="flex-1 rounded-2xl font-bold py-6">Cancel</Button>
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
              </div>
            )}

            {/* Step 3: Completeness Gauge & early exit */}
            {/* Step 3: CV Analysis Dashboard */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Your CV Analysis
                  </h1>
                  <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                    We've analyzed your CV to give you actionable insights and a health score.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left: Health Index */}
                  <div className="bg-slate-50 border border-gray-150 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Initial Health Index</h3>
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle 
                          cx="80" cy="80" r="70" 
                          stroke="#E2E8F0" strokeWidth="12" 
                          fill="transparent" 
                        />
                        <motion.circle 
                          cx="80" cy="80" r="70" 
                          stroke="#80FF00" strokeWidth="12" 
                          fill="transparent" 
                          strokeDasharray="439.8"
                          initial={{ strokeDashoffset: 439.8 }}
                          animate={{ strokeDashoffset: 439.8 - (439.8 * (activeSnapshot.healthIndex || 0)) / 100 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-4xl font-black">{activeSnapshot.healthIndex}%</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Score</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#80FF00]/10 text-green-700 rounded-full text-xs font-bold">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {activeSnapshot.healthIndex >= 80 ? 'Excellent' : activeSnapshot.healthIndex >= 60 ? 'Fair' : 'Needs Improvement'}
                      </div>
                      <p className="text-xs text-gray-500 max-w-[180px] mx-auto mt-2 leading-relaxed">
                        {activeSnapshot.healthIndex >= 80 
                          ? 'Your CV is highly competitive and ready for elite roles!' 
                          : activeSnapshot.healthIndex >= 60 
                          ? 'Your CV has a solid foundation. Let\'s make it stand out!' 
                          : 'Your CV needs significant optimization to bypass modern ATS.'}
                      </p>
                    </div>
                  </div>

                  {/* Center: Score Breakdown */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Score Breakdown</h3>
                      <button className="text-gray-300 hover:text-gray-500 transition-colors"><Info size={14} /></button>
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { label: 'Structure & Formatting', score: activeSnapshot.breakdown.structure, color: 'bg-green-500', icon: Palette },
                        { label: 'ATS Readability', score: activeSnapshot.breakdown.readability, color: 'bg-indigo-500', icon: FileText },
                        { label: 'Content Strength', score: activeSnapshot.breakdown.contentStrength, color: 'bg-orange-500', icon: Sparkles },
                        { label: 'Skills & Keywords', score: activeSnapshot.breakdown.skillsKeywords, color: 'bg-blue-500', icon: Target },
                        { label: 'Impact & Achievements', score: activeSnapshot.breakdown.impactAchievements, color: 'bg-teal-500', icon: Zap },
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[11px] font-bold">
                              <div className="flex items-center gap-2 text-gray-600">
                                <div className={`p-1 rounded ${item.color} bg-opacity-10 text-${item.color.split('-')[1]}-600`}>
                                  <Icon size={12} />
                                </div>
                                <span>{item.label}</span>
                              </div>
                              <span className="text-gray-400">{item.score} / 20</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                className={`h-full ${item.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.score / 20) * 100}%` }}
                                transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: At a Glance */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 space-y-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">At a Glance</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Pages Detected', value: activeSnapshot.stats.pagesDetected, icon: FileText },
                        { label: 'Total Words', value: activeSnapshot.stats.totalWords, icon: Mail },
                        { label: 'Experience', value: `${activeSnapshot.stats.experienceYears} years`, icon: Briefcase },
                        { label: 'Top Skills Found', value: activeSnapshot.stats.skillsFound, icon: Zap },
                        { label: 'Sections Detected', value: `${activeSnapshot.stats.sectionsDetected}/9`, icon: LayoutGrid },
                      ].map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-gray-300"><Icon size={16} /></div>
                              <span className="text-xs font-bold text-gray-500">{stat.label}</span>
                            </div>
                            <span className="text-xs font-black">{stat.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Your Strengths */}
                  <div className="bg-green-50/50 border border-green-100 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle size={18} className="fill-green-700 text-white" />
                      <h3 className="text-sm font-black uppercase tracking-tight">Your Strengths</h3>
                    </div>
                    <div className="space-y-4">
                      {activeSnapshot.strengths.map((s, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="mt-1 p-1 bg-white rounded shadow-sm text-green-600"><Check size={10} strokeWidth={4} /></div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{s}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{getStrengthDescription(s)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-green-100 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm"><Trophy size={16} /></div>
                      <div>
                        <p className="text-xs font-black text-green-800">Keep it up!</p>
                        <p className="text-[10px] text-green-700/70">You're on the right track.</p>
                      </div>
                    </div>
                  </div>

                  {/* Areas to Improve */}
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-orange-700">
                      <Info size={18} className="fill-orange-700 text-white" />
                      <h3 className="text-sm font-black uppercase tracking-tight">Areas to Improve</h3>
                    </div>
                    <div className="space-y-4">
                      {activeSnapshot.weaknesses.map((w, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="mt-1 p-1 bg-white rounded shadow-sm text-orange-600"><Zap size={10} fill="currentColor" /></div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{w}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{getWeaknessDescription(w)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-orange-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-orange-600 shadow-sm"><TrendingUp size={16} /></div>
                        <div>
                          <p className="text-xs font-black text-orange-800">Potential Score Boost</p>
                          <p className="text-[10px] text-orange-700/70">+{activeSnapshot.potentialBoost} points</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-orange-300" />
                    </div>
                  </div>

                  {/* Top Missing Keywords */}
                  <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-6 flex flex-col shadow-sm">
                    <div className="flex items-center gap-2 text-blue-700 mb-6">
                      <Search size={18} />
                      <h3 className="text-sm font-black uppercase tracking-tight">Top Missing Keywords</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-auto">
                      {activeSnapshot.missingKeywords.map((k, idx) => (
                        <div key={idx} className="px-3 py-1.5 bg-white border border-blue-100 text-blue-600 text-[10px] font-bold rounded-lg shadow-sm">
                          {k}
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-blue-100 flex gap-3 items-start">
                      <Lightbulb size={18} className="text-blue-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-blue-900 uppercase tracking-wide">Tip</p>
                        <p className="text-[10px] text-blue-700/70 leading-relaxed font-medium">
                          Add these keywords naturally in your experience and skills sections.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Banner */}
                <div className="bg-indigo-600 rounded-2xl p-5 text-white flex items-center justify-between shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg">
                      <Sparkles size={20} className="fill-white" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black uppercase tracking-wide">AI Recommendation</h4>
                      <p className="text-xs text-indigo-100 max-w-md font-medium leading-relaxed">
                        With a few strategic improvements, your CV can rank significantly higher with ATS systems and catch recruiters' attention.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-10 relative z-10">
                    <div className="text-center">
                      <span className="text-3xl font-black">{(activeSnapshot.healthIndex || 0) + (activeSnapshot.potentialBoost || 0)}%</span>
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mt-1">Potential Score</p>
                    </div>
                    
                    <div className="h-10 w-px bg-white/20" />
                    
                    <button className="flex items-center gap-4 text-left group/btn">
                      <div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Top Priority</p>
                        <p className="text-xs font-bold text-white max-w-[200px] leading-tight group-hover:text-white transition-colors">
                          {activeSnapshot.topPriority || 'Complete your profile to see tailored recommendations...'}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-indigo-300 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex flex-col items-center gap-4 pt-4 border-t border-gray-100">
                  <Button 
                    onClick={() => {
                      if (status === 'authenticated') {
                        completeOnboarding('/editor');
                      } else {
                        setFastTrackToEditor(true);
                        setCurrentStep(4);
                      }
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

            {/* Step 4: Auth Wall */}
            {currentStep === 4 && isVerifying && (
              <div className="py-4">
                <CodeVerificationScreen
                  email={authEmail}
                  type="email-verification"
                  onCodeVerified={handleVerifyCodeSubmitDirect}
                  onResendCode={handleResendCode}
                  isLoading={authLoading}
                  error={authError}
                  success={authSuccess}
                  remainingAttempts={3}
                  cooldownSeconds={60}
                  onBack={() => {
                    setIsVerifying(false);
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                />
              </div>
            )}

            {currentStep === 4 && !isVerifying && (
              <div className="space-y-6">
                
                {/* Mode Toggle Switch */}
                <div className="mb-6 flex justify-center">
                  <div className="relative inline-flex items-center bg-gray-100 dark:bg-[#1A1A1A] rounded-md p-1.5 border border-gray-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => { setAuthTab('signin'); setAuthError(''); setAuthSuccess(''); }}
                      className={`relative px-8 py-3 text-base font-medium rounded-sm transition-all duration-300 z-10 ${
                        authTab === 'signin'
                          ? 'text-black font-semibold'
                          : 'text-gray-500 hover:text-gray-800 dark:text-white/70 dark:hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthTab('signup'); setAuthError(''); setAuthSuccess(''); }}
                      className={`relative px-8 py-3 text-base font-medium rounded-sm transition-all duration-300 z-10 ${
                        authTab === 'signup'
                          ? 'text-black font-semibold'
                          : 'text-gray-500 hover:text-gray-800 dark:text-white/70 dark:hover:text-white'
                      }`}
                    >
                      Sign Up
                    </button>
                    <motion.div
                      className="absolute top-1.5 bottom-1.5 bg-[#80FF00] rounded-sm z-0 shadow-sm"
                      initial={false}
                      animate={{
                        left: authTab === 'signin' ? '0.375rem' : '50%',
                        right: authTab === 'signup' ? '0.375rem' : '50%',
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {authTab === 'signin' ? 'Sign In' : 'Create your account'}
                  </h2>
                  <p className="text-gray-600 dark:text-white/70 text-sm max-w-sm mx-auto">
                    {authTab === 'signin'
                      ? 'Welcome back! Please enter your credentials to access your account.'
                      : 'Sign up now to start managing your job applications and CVs.'}
                  </p>
                </div>

                {/* Social Buttons */}
                <div className="space-y-3">
                  {/* Google */}
                  <motion.button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 border border-blue-500 hover:border-blue-600 text-white py-3 px-6 rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </motion.button>

                  {/* LinkedIn */}
                  <motion.button
                    type="button"
                    onClick={() => handleOAuth('linkedin')}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-3 bg-[#0a66c2] hover:bg-[#004182] border border-[#0a66c2] hover:border-[#004182] text-white py-3 px-6 rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    Continue with LinkedIn
                  </motion.button>

                  {/* Apple */}
                  <motion.button
                    type="button"
                    onClick={() => handleOAuth('apple')}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 border border-black hover:border-gray-900 text-white py-3 px-6 rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 384 512" fill="white">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                    </svg>
                    Continue with Apple
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-[#141810] text-gray-500 dark:text-white/60">Or continue with email</span>
                  </div>
                </div>

                {/* Inline Form */}
                <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-sm text-xs font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-sm text-xs font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  {/* Name field (Sign Up only) */}
                  {authTab === 'signup' && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="authName" className="text-sm font-medium text-gray-700 dark:text-white/80 w-full flex-shrink-0 text-left">
                        Full Name
                      </label>
                      <div className="relative w-full flex items-center">
                        <UserIcon className="absolute left-4 text-gray-400 w-5 h-5 flex items-center justify-center pointer-events-none" />
                        <input
                          type="text"
                          id="authName"
                          value={authName}
                          onChange={e => setAuthName(e.target.value)}
                          placeholder="Your Name"
                          required
                          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 border border-gray-300 dark:border-[#80FF00]/50 focus:border-2 focus:border-[#80FF00] rounded-sm outline-none focus:outline-none transition-all duration-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="authEmail" className="text-sm font-medium text-gray-700 dark:text-white/80 w-full flex-shrink-0 text-left">
                      Email Address
                    </label>
                    <div className="relative w-full flex items-center">
                      <Mail className="absolute left-4 text-gray-400 w-5 h-5 flex items-center justify-center pointer-events-none" />
                      <input
                        type="email"
                        id="authEmail"
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 border border-gray-300 dark:border-[#80FF00]/50 focus:border-2 focus:border-[#80FF00] rounded-sm outline-none focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="authPassword" className="text-sm font-medium text-gray-700 dark:text-white/80 w-full flex-shrink-0 text-left">
                      Password
                    </label>
                    <div className="relative w-full flex items-center">
                      <Lock className="absolute left-4 text-gray-400 w-5 h-5 flex items-center justify-center pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="authPassword"
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-11 pr-12 py-3 bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 border border-gray-300 dark:border-[#80FF00]/50 focus:border-2 focus:border-[#80FF00] rounded-sm outline-none focus:outline-none transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 dark:text-white/60 dark:hover:text-white transition-colors flex items-center justify-center w-8 h-full z-10"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-[#80FF00] hover:bg-[#70e600] text-gray-900 dark:text-black font-semibold py-3 px-6 rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {authTab === 'signup' ? 'Create Account' : 'Sign In'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-600/30">
                  <div className="flex justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <a href="/legal#privacy" target="_blank" className="hover:text-[#88E03F] transition-colors duration-200">
                      Privacy Policy
                    </a>
                    <span className="text-gray-450 dark:text-gray-600">•</span>
                    <a href="/legal#terms" target="_blank" className="hover:text-[#88E03F] transition-colors duration-200">
                      Terms of Service
                    </a>
                    <span className="text-gray-450 dark:text-gray-600">•</span>
                    <a href="/legal#support" target="_blank" className="hover:text-[#88E03F] transition-colors duration-200">
                      Support
                    </a>
                  </div>
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

            {/* Step 7: Interactive Kanban board demo */}
            {currentStep === 7 && (
              <div className="space-y-8">
                <div className="space-y-3 text-center">
                  <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                    Visual Pipeline Tracker
                  </h1>
                  <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    CVCircle automatically updates and tracks your applications using an integrated Kanban board.
                  </p>
                </div>

                {/* Animated Mini Kanban */}
                <div className="bg-slate-50 border border-gray-150 p-6 rounded-2xl space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { title: 'To Apply', color: 'bg-blue-500' },
                      { title: 'Applied', color: 'bg-amber-500' },
                      { title: 'Interviewing', color: 'bg-green-500' }
                    ].map((col, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 min-h-[140px] flex flex-col gap-2 relative overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${col.color}`} /> {col.title}
                        </span>

                        {/* Floating Card */}
                        {idx === 0 && kanbanStage === 0 && (
                          <motion.div 
                            layoutId="kanban-card"
                            className="bg-slate-50 p-2.5 rounded-lg border border-gray-200 shadow-sm text-xs space-y-1"
                          >
                            <div className="font-bold truncate">Frontend Developer</div>
                            <div className="text-[10px] text-gray-400">Vercel</div>
                          </motion.div>
                        )}
                        {idx === 1 && kanbanStage === 1 && (
                          <motion.div 
                            layoutId="kanban-card"
                            className="bg-slate-50 p-2.5 rounded-lg border border-gray-200 shadow-sm text-xs space-y-1 border-l-4 border-l-amber-500"
                          >
                            <div className="font-bold truncate">Frontend Developer</div>
                            <div className="text-[10px] text-gray-400">Vercel</div>
                          </motion.div>
                        )}
                        {idx === 2 && kanbanStage === 2 && (
                          <motion.div 
                            layoutId="kanban-card"
                            className="bg-slate-50 p-2.5 rounded-lg border border-gray-200 shadow-sm text-xs space-y-1 border-l-4 border-l-green-500"
                          >
                            <div className="font-bold truncate">Frontend Developer</div>
                            <div className="text-[10px] text-gray-400">Vercel</div>
                          </motion.div>
                        )}

                        <div className="text-[9px] text-gray-300 text-center mt-auto">Drop area</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 text-center max-w-sm mx-auto pt-2">
                  <h3 className="font-bold">Would a visual tracker help organize your search?</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTrackerInterest('yes');
                        handleNext();
                      }}
                      className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all ${
                        trackerInterest === 'yes' ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Yes, absolutely
                    </button>
                    <button
                      onClick={() => {
                        setTrackerInterest('no');
                        handleNext();
                      }}
                      className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all ${
                        trackerInterest === 'no' ? 'border-black bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      No, just need CV
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Auto-Apply feature list */}
            {currentStep === 8 && (
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

            {/* Step 9: Search preferences */}
            {currentStep === 9 && (
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
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" /> Target Roles
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Software Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'Growth Lead'].map(role => {
                        const isSel = targetRoles.includes(role);
                        return (
                          <button
                            key={role}
                            onClick={() => {
                              if (isSel) setTargetRoles(prev => prev.filter(r => r !== role));
                              else setTargetRoles(prev => [...prev, role]);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isSel ? 'bg-black text-[#80FF00] border-black' : 'bg-white border-gray-200 text-gray-600'
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Location preference */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Workplace Layout
                    </label>
                    <div className="flex gap-2">
                      {['Remote', 'Hybrid', 'Onsite'].map(loc => {
                        const isSel = locations.includes(loc);
                        return (
                          <button
                            key={loc}
                            onClick={() => {
                              if (isSel) setLocations(prev => prev.filter(l => l !== loc));
                              else setLocations(prev => [...prev, loc]);
                            }}
                            className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all ${
                              isSel ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600'
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
                      className="w-full py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black"
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
                      <DollarSign className="h-3.5 w-3.5" /> Target Annual Salary
                    </label>
                    <input 
                      type="text" 
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                      placeholder="e.g. $90,000"
                      className="w-full py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black"
                    />
                  </div>

                  {/* Visa sponsorship */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Do you require visa sponsorship?
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVisaRequired(true)}
                        className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all ${
                          visaRequired === true ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        Yes, I do
                      </button>
                      <button
                        onClick={() => setVisaRequired(false)}
                        className={`flex-1 py-2 border rounded-xl text-xs font-bold transition-all ${
                          visaRequired === false ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        No sponsorship needed
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

            {/* Step 10: Score calculation & Personalized Recommendation */}
            {currentStep === 10 && (() => {
              const rec = getRecommendedTier();
              const type = rec.type; // 1, 2, or 3
              
              // Custom styles based on user type
              let accentColorClass = "text-teal-600";
              let bgGlowClass = "from-teal-50/50 to-emerald-50/30";
              let borderClass = "border-teal-200";
              let buttonBgClass = "bg-teal-600 hover:bg-teal-700 text-white";
              let TitleText = "Your workspace is ready. We've set up your Master CV.";
              let DescText = "Optimize your resume to perfection. We've parsed your experience and created a Master CV profile. Let's refine your sections and use AI recommendations to boost your ATS score.";
              let CtaText = "Start Optimizing My CV";
              let PlanLabel = "Free CV Studio";
              const IconComponent = type === 2 ? Briefcase : type === 3 ? Zap : FileText;

              if (type === 2) {
                accentColorClass = "text-blue-600";
                bgGlowClass = "from-blue-50/50 to-green-50/30";
                borderClass = "border-blue-200";
                buttonBgClass = "bg-gradient-to-r from-blue-600 to-green-600 text-white hover:opacity-95 shadow-lg shadow-blue-100";
                TitleText = "Your tracker is ready. Add your first job to start managing applications.";
                DescText = "Take control of your job search. Visualize your application stages, track target deadlines, and never miss an interview follow-up again.";
                CtaText = "Go to Job Tracker";
                PlanLabel = "Career Builder (Job Tracker)";
              } else if (type === 3) {
                accentColorClass = "text-violet-650";
                bgGlowClass = "from-violet-50/50 to-orange-50/30";
                borderClass = "border-violet-200";
                buttonBgClass = "bg-gradient-to-r from-violet-600 to-orange-500 text-white hover:opacity-95 shadow-lg shadow-violet-100";
                TitleText = "Your automation workspace is ready. Complete your auto-apply settings.";
                DescText = "Your autopilot setup is pre-configured. Complete your auto-apply parameters, review matching filters, and start auto-submitting applications.";
                CtaText = "Go to Auto-Apply Setup";
                PlanLabel = "Auto-Apply Autopilot";
              }

              return (
                <div className="space-y-8 max-w-2xl mx-auto py-4">
                  <div className="space-y-3 text-center">
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 ${accentColorClass}`}>
                      Personalized Onboarding Exit
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-[#1a1a1a]">
                      {TitleText}
                    </h1>
                  </div>

                  <div className={`bg-gradient-to-b ${bgGlowClass} border ${borderClass} rounded-[2rem] p-8 md:p-10 space-y-6 relative overflow-hidden shadow-sm flex flex-col items-center text-center`}>
                    <div className={`p-4 rounded-2xl bg-white shadow-sm border ${borderClass} ${accentColorClass}`}>
                      <IconComponent className="h-8 w-8 stroke-[2.5]" />
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{PlanLabel}</span>
                      <p className="text-gray-600 text-base leading-relaxed max-w-lg">
                        {DescText}
                      </p>
                    </div>

                    <div className="w-full pt-4">
                      <Button
                        onClick={() => completeOnboarding(rec.redirectUrl)}
                        className={`w-full py-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all ${buttonBgClass}`}
                      >
                        {CtaText} <ChevronRight className="h-5 w-5 stroke-[2.5]" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button 
                      onClick={() => completeOnboarding('/dashboard')}
                      className="text-xs text-gray-400 hover:text-black font-semibold uppercase tracking-wider transition-colors"
                    >
                      Go to main dashboard instead ➔
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Nav Bar (Steps 1, 2, 3, 5, 6, 9) */}
            {![4, 10].includes(currentStep) && (
              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100">
                <Button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  variant="ghost"
                  className="font-bold flex items-center gap-1.5 rounded-xl hover:bg-slate-100 px-4 py-2 text-gray-500 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>

                {/* Progress Indicators */}
                <div className="flex items-center gap-1.5">
                  {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i + 1 === currentStep 
                          ? 'w-6 bg-black' 
                          : i + 1 < currentStep 
                          ? 'w-1.5 bg-gray-400' 
                          : 'w-1.5 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !intent) ||
                    (currentStep === 2 && (!seedingMethod || (seedingMethod !== 'scratch' && !parsedCVData))) ||
                    (currentStep === 5 && !searchStatus) ||
                    (currentStep === 6 && !monthlyVolume) ||
                    (currentStep === 7 && !trackerInterest) ||
                    (currentStep === 8 && !autoapplyInterest)
                  }
                  className="bg-black text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 rounded-xl px-5 py-2.5 shadow-sm disabled:opacity-35"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-gray-100 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} CVCircle. All features secured.
      </footer>

    </div>
  );
};

export default WelcomePage;
