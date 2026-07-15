'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { useSession } from 'next-auth/react';
import { useAuthModalStore } from '@/lib/stores/authModalStore';
import { 
  Send, Sparkles, User, Loader2, Trash2, CornerDownRight, 
  MousePointer2, MessageSquare, History, Edit2, X, Plus, ChevronRight,
  ChevronUp, ChevronDown, Mic, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import UpgradeBanner from '@/components/dashboard/redesigned/UpgradeBanner';
import { useMembership } from '@/lib/hooks/useMembership';
import { UserTier } from '@/types/dashboard-widgets';

interface Option {
  label: string;
  prompt: string;
  updatedCV?: any;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selection?: {
    path: string;
    text: string;
  };
  options?: Option[];
}

interface ChatHistoryItem {
  _id: string;
  title: string;
  updatedAt: string;
  cvId?: string;
}

const SUGGESTIONS = [
  { label: '✨ Full CV Optimise', prompt: 'Optimise my entire CV — improve bullet points, strengthen the summary, add metrics, and boost ATS score.' },
  { label: '🎯 Tailor to Job', prompt: 'Tailor my CV to the target job description — align keywords, reframe experience, and highlight relevant skills.' },
  { label: '📝 Rewrite Summary', prompt: 'Rewrite my professional summary to be punchy, ATS-optimised, and tailored to my target role with a strong hook.' },
  { label: '🚀 Power Bullets', prompt: 'Rewrite my work experience bullets using the STAR method — strong action verbs, specific metrics, and impact statements.' },
  { label: '🤖 ATS Keywords', prompt: 'Identify missing ATS keywords from the job description and naturally integrate them into my CV skills and experience sections.' },
  { label: '📊 Add Metrics', prompt: 'Find all bullets missing quantifiable data and suggest realistic metrics — percentages, time saved, revenue, team sizes.' },
  { label: '👀 Fix Grammar & Style', prompt: 'Proofread my entire CV for grammar errors, tense consistency, and professional style. Show me every change.' },
  { label: '🏛️ Improve Structure', prompt: 'Review the structure of my CV and suggest section reordering, title improvements, and any missing sections for my target role.' },
  { label: '🔑 Highlight Achievements', prompt: 'Identify the most impressive achievements in my CV and reframe each one to show maximum impact and business value.' },
  { label: '🧹 Remove Weak Language', prompt: 'Remove filler words, passive voice, and weak phrases from my CV. Replace with confident, active, result-oriented language.' },
];

interface MoriChatInterfaceProps {
  isBottomOverlay?: boolean;
  onClose?: () => void;
}

const PLACEHOLDERS = [
  "Ask Mori AI to polish your CV...",
  "Ask Mori AI by voice (click Mic)...",
  "Mori can write a professional summary...",
  "Mori can tailor experience to target jobs...",
  "Mori can identify keyword gaps for ATS...",
  "Mori can proofread grammatical styling..."
];

const MoriChatInterface: React.FC<MoriChatInterfaceProps> = ({
  isBottomOverlay = false,
  onClose
}) => {
  const { state, updateCVData } = useResumeEnhancer();
  const { openPaymentModal } = usePaymentModal();
  const { data: session, status: sessionStatus } = useSession();
  const { openModal } = useAuthModalStore();
  const isGuestMode = sessionStatus === 'unauthenticated';
  
  const { membership } = useMembership();
  const planKey = membership?.planKey || 'free';
  const userTier: UserTier = planKey.toLowerCase().startsWith('smart') || planKey.toLowerCase().startsWith('pro') 
    ? 'smart' 
    : planKey.toLowerCase().startsWith('focused') 
      ? 'focused' 
      : 'starter';

  const [limitExhausted, setLimitExhausted] = useState(false);
  const [input, setInput] = useState('');
  
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome or Edge.");
      return;
    }

    // Stop existing session before starting new one
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    // Explicitly request microphone access first to trigger the browser's permission prompt if needed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the tracks immediately as we only needed to verify/trigger permission
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      console.warn('[Mori STT] Microphone permission request failed:', err);
      toast.error(
        "Microphone access blocked. Click the lock/settings icon in your browser address bar to allow microphone access.",
        { duration: 6000 }
      );
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;  // Show interim results for better UX
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        toast.success("🎙️ Listening... Speak now!", { duration: 2000 });
      };

      rec.onresult = (event: any) => {
        // Use the last result (final or best interim)
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
        if (transcript) {
          if (lastResult.isFinal) {
            setInput((prev) => prev + (prev ? ' ' : '') + transcript);
          }
        }
      };

      rec.onerror = (e: any) => {
        // e is SpeechRecognitionErrorEvent — only log the string error code, not the Event object
        // to avoid crashing the custom console logger which rejects Event objects
        const errorCode: string = typeof e?.error === 'string' ? e.error : 'unknown';
        const userMessages: Record<string, string> = {
          'no-speech': 'No speech detected. Try again.',
          'audio-capture': 'Microphone not found. Check your audio settings.',
          'not-allowed': 'Microphone access denied. Click the lock/settings icon in your browser address bar to allow microphone access.',
          'network': 'Network error during recognition. Check connection.',
          'aborted': '', // silent — user stopped manually
          'service-not-allowed': 'Speech service not available.',
        };
        const msg = userMessages[errorCode];
        if (msg) toast.error(msg, { duration: 6000 });
        if (errorCode !== 'aborted') {
          console.warn('[Mori STT] Speech recognition error code:', errorCode);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('[Mori STT] Failed to start speech recognition:', err instanceof Error ? err.message : String(err));
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm Mori. I can help you edit your CV using natural language. You can also select any part of the CV on the left to focus our conversation.",
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<{ path: string; text: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getTopLevelSectionKey = (path: string): string => {
    if (path.startsWith('profile') || path.startsWith('basics')) return 'profile';
    if (path.startsWith('experience') || path.startsWith('work')) return 'experience';
    if (path.startsWith('education')) return 'education';
    if (path.startsWith('skills')) return 'skills';
    if (path.startsWith('projects')) return 'projects';
    if (path.startsWith('certifications') || path.startsWith('certificates')) return 'certifications';
    if (path.startsWith('languages')) return 'languages';
    return '';
  };

  const getSectionText = (path: string): string => {
    if (!state.cvData) return '';
    if (path === 'profile') return state.cvData.basics?.summary || '';
    if (path === 'experience') {
      return (state.cvData.work || []).map((exp: any) => 
        `${exp.position || ''} at ${exp.name || ''}: ${exp.summary || ''}`
      ).join('\n');
    }
    if (path === 'education') {
      return (state.cvData.education || []).map((edu: any) => 
        `${edu.studyType || ''} in ${edu.area || ''} at ${edu.institution || ''}`
      ).join('\n');
    }
    if (path === 'skills') {
      return (state.cvData.skills || []).map((s: any) => 
        `${s.category || ''}: ${(s.skills || []).join(', ')}`
      ).join('\n');
    }
    if (path === 'projects') {
      return (state.cvData.projects || []).map((proj: any) => 
        `${proj.name || ''}: ${proj.summary || ''}`
      ).join('\n');
    }
    if (path === 'certifications') {
      return (state.cvData.certificates || []).map((cert: any) => 
        `${cert.name || ''} by ${cert.issuer || ''}`
      ).join('\n');
    }
    if (path === 'languages') {
      return (state.cvData.languages || []).map((l: any) => 
        `${l.language || ''} (${l.fluency || ''})`
      ).join(', ');
    }
    return '';
  };

  const getAvailableSections = () => {
    const sections = [{ value: '', label: 'Entire CV' }];
    if (!state.cvData) return sections;

    if (state.cvData.basics?.summary) {
      sections.push({ value: 'profile', label: 'Professional Summary' });
    }
    if (state.cvData.work && state.cvData.work.length > 0) {
      sections.push({ value: 'experience', label: 'Work Experience' });
    }
    if (state.cvData.education && state.cvData.education.length > 0) {
      sections.push({ value: 'education', label: 'Education' });
    }
    if (state.cvData.skills && state.cvData.skills.length > 0) {
      sections.push({ value: 'skills', label: 'Skills' });
    }
    if (state.cvData.projects && state.cvData.projects.length > 0) {
      sections.push({ value: 'projects', label: 'Projects' });
    }
    if (state.cvData.certificates && state.cvData.certificates.length > 0) {
      sections.push({ value: 'certifications', label: 'Certifications' });
    }
    if (state.cvData.languages && state.cvData.languages.length > 0) {
      sections.push({ value: 'languages', label: 'Languages' });
    }
    return sections;
  };
  
  // History State
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch History
  const fetchHistory = async () => {
    if (sessionStatus === 'unauthenticated') return;
    try {
      const res = await fetch('/api/ai/mori-chat/history');
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.chats || []);
        if (data.limitExhausted !== undefined) {
          setLimitExhausted(data.limitExhausted);
        }
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchHistory();
    }
  }, [sessionStatus]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !showHistory) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, showHistory, currentSelection]);

  // Listen for selection events from the CV preview
  useEffect(() => {
    const handleSelection = (e: CustomEvent) => {
      const { path, text } = e.detail;
      setCurrentSelection({ path, text });
      if (showHistory) setShowHistory(false);
    };

    // Listen for 1-click fix events from the Analysis panel
    const handleMoriFix = (e: CustomEvent) => {
      const { prompt, section } = e.detail || {};
      if (prompt) {
        if (section) {
          setCurrentSelection({ path: section, text: getSectionText(section) });
        }
        if (isCollapsed) setIsCollapsed(false);
        setShowHistory(false);
        // Auto-send after a brief tick so state settles
        setTimeout(() => handleSend(prompt), 50);
      }
    };

    window.addEventListener('mori-cv-selection', handleSelection as EventListener);
    window.addEventListener('mori-fix-issue', handleMoriFix as EventListener);
    return () => {
      window.removeEventListener('mori-cv-selection', handleSelection as EventListener);
      window.removeEventListener('mori-fix-issue', handleMoriFix as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, isCollapsed]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;

    if (textToSend === 'Cancel') {
      setInput('');
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Cancel',
        timestamp: Date.now()
      };
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Action cancelled. Please select a section in the CV preview to edit, or ask a question.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      return;
    }

    const editKeywords = ['change', 'edit', 'rewrite', 'make', 'fix', 'improve', 'add', 'remove', 'update', 'refine', 'modify', 'bullet', 'bulletpoint', 'word', 'phrase', 'cv', 'resume'];
    const textLower = textToSend.toLowerCase();
    const isEditIntent = editKeywords.some(kw => textLower.includes(kw));

    if (!currentSelection && isEditIntent) {
      const isConfirmWholeCV = textLower.includes('apply to whole') || textLower.includes('apply to the whole') || textLower.includes('entire cv') || textLower.includes('proceed') || textLower.includes('about');
      const isQuickOption = messages.length > 1 && messages[messages.length - 1].options?.some(opt => opt.prompt === textToSend || opt.label === textToSend);
      
      if (!isConfirmWholeCV && !isQuickOption) {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: textToSend,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        
        setTimeout(() => {
          const warningMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "You are asking to make changes, but no CV section is currently selected. Please select a section in the CV preview to focus the edits, or choose below to apply changes to the entire CV.",
            timestamp: Date.now(),
            options: [
              { label: "Apply changes to the entire CV", prompt: `${textToSend} (Apply to whole CV)` },
              { label: "Cancel", prompt: "Cancel" }
            ]
          };
          setMessages(prev => [...prev, warningMsg]);
          setIsLoading(false);
        }, 400);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      selection: currentSelection || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const payload = {
        chatId,
        cvId: state.cvId,
        cvType: state.cvType,
        messages: messages.concat(userMessage),
        cvData: state.cvData,
        selection: currentSelection,
        jobData: state.jobData,
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel
      };

      const response = await fetch('/api/ai/mori-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = 'Mori is temporarily unavailable';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
            if (errorData.limitExhausted) {
              setLimitExhausted(true);
            }
          }
        } catch (_) {}
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.limitExhausted) {
        setLimitExhausted(true);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || "I've processed your request.",
        timestamp: Date.now(),
        options: result.options
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (result.chatId && result.chatId !== chatId) {
        setChatId(result.chatId);
        fetchHistory(); // Refresh history to show new chat
      }

      window.dispatchEvent(new CustomEvent('checklist:ai-completed'));

      if (result.updatedCV) {
        const oldCV = state.cvData;
        const newCV = result.updatedCV;

        updateCVData(newCV);

        if (oldCV && newCV) {
          // Compare experience (work)
          if (Array.isArray(newCV.work) && Array.isArray(oldCV.work)) {
            newCV.work.forEach((newJob: any, idx: number) => {
              const oldJob = oldCV.work.find((j: any) => j.id === newJob.id) || oldCV.work[idx];
              if (!oldJob) {
                window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                  detail: { collection: 'experience', index: idx }
                }));
                return;
              }
              if (newJob.summary !== oldJob.summary || newJob.position !== oldJob.position || newJob.name !== oldJob.name) {
                window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                  detail: { collection: 'experience', index: idx }
                }));
              }
              if (Array.isArray(newJob.highlights) && Array.isArray(oldJob.highlights)) {
                newJob.highlights.forEach((bullet: string, hIdx: number) => {
                  if (bullet !== oldJob.highlights[hIdx]) {
                    window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                      detail: { collection: 'experience', index: idx, highlightIndex: hIdx }
                    }));
                  }
                });
              }
            });
          }

          // Compare volunteer
          if (Array.isArray(newCV.volunteer) && Array.isArray(oldCV.volunteer)) {
            newCV.volunteer.forEach((newVol: any, idx: number) => {
              const oldVol = oldCV.volunteer.find((v: any) => v.id === newVol.id) || oldCV.volunteer[idx];
              if (!oldVol) {
                window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                  detail: { collection: 'volunteer', index: idx }
                }));
                return;
              }
              if (newVol.summary !== oldVol.summary || newVol.position !== oldVol.position || newVol.organization !== oldVol.organization) {
                window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                  detail: { collection: 'volunteer', index: idx }
                }));
              }
              if (Array.isArray(newVol.highlights) && Array.isArray(oldVol.highlights)) {
                newVol.highlights.forEach((bullet: string, hIdx: number) => {
                  if (bullet !== oldVol.highlights[hIdx]) {
                    window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                      detail: { collection: 'volunteer', index: idx, highlightIndex: hIdx }
                    }));
                  }
                });
              }
            });
          }

          // Compare education
          if (Array.isArray(newCV.education) && Array.isArray(oldCV.education)) {
            newCV.education.forEach((newEdu: any, idx: number) => {
              const oldEdu = oldCV.education.find((e: any) => e.id === newEdu.id) || oldCV.education[idx];
              if (!oldEdu || newEdu.description !== oldEdu.description || newEdu.studyType !== oldEdu.studyType || newEdu.area !== oldEdu.area || newEdu.institution !== oldEdu.institution) {
                window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                  detail: { collection: 'education', index: idx }
                }));
              }
            });
          }

          // Compare projects
          if (Array.isArray(newCV.projects) && Array.isArray(oldCV.projects)) {
            newCV.projects.forEach((newProj: any, idx: number) => {
              const oldProj = oldCV.projects.find((p: any) => p.id === newProj.id) || oldCV.projects[idx];
              if (!oldProj || newProj.description !== oldProj.description || newProj.name !== oldProj.name) {
                window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                  detail: { collection: 'projects', index: idx }
                }));
              }
            });
          }
        }
      }

      setCurrentSelection(null);

    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const isLimitError = errorMsg.includes('limit reached') || errorMsg.includes('limit') || errorMsg.includes('upgrade your plan');
      if (isLimitError) {
        setLimitExhausted(true);
      }
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = async (option: Option) => {
    if (isLoading) return;

    if (option.updatedCV) {
      // 1. Add user message showing their selection
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `I select option: ${option.label}`,
        timestamp: Date.now()
      };

      // 2. Add assistant message confirming application
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Great! I've updated your CV with your selection: "${option.label}".`,
        timestamp: Date.now() + 1
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      updateCVData(option.updatedCV);
      toast.success(`Applied: ${option.label}`);
    } else {
      // If it doesn't contain updatedCV, treat it as a quick reply prompt
      await handleSend(option.prompt);
    }
  };

  const handleLoadChat = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/ai/mori-chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.chat.messages);
        setChatId(id);
        setShowHistory(false);
      }
    } catch (e) {
      console.error('Failed to load chat', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      const res = await fetch(`/api/ai/mori-chat/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChatHistory(prev => prev.filter(c => c._id !== id));
        if (chatId === id) {
          handleNewChat();
        }
      }
    } catch (e) {
      console.error('Failed to delete chat', e);
    }
  };

  const handleRenameChat = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    if (!editTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    try {
      const res = await fetch(`/api/ai/mori-chat/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle })
      });
      if (res.ok) {
        setChatHistory(prev => prev.map(c => c._id === id ? { ...c, title: editTitle } : c));
        setEditingChatId(null);
      }
    } catch (e) {
      console.error('Failed to rename chat', e);
    }
  };

  const handleNewChat = () => {
    setChatId(null);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm Mori. I can help you edit your CV using natural language. You can also select any part of the CV on the left to focus our conversation.",
      timestamp: Date.now()
    }]);
    setShowHistory(false);
  };

  if (isGuestMode) {
    return (
      <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-transparent shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            Mori AI Assistant
          </div>
        </div>

        {/* Guest Info Card Container */}
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 dark:bg-transparent overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[340px] p-6 rounded-2xl bg-white dark:bg-[var(--bg-primary)] border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col gap-5 text-center relative overflow-hidden group"
          >
            {/* Glowing background light */}
            <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-28 h-28 rounded-full bg-teal-500/10 dark:bg-teal-500/20 blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>

            {/* Sparkles Icon */}
            <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>

            {/* Typography & Copy */}
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
                Unlock Mori AI Assistant
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Supercharge your job hunt with our expert CV AI partner. Mori reads your CV, drafts changes dynamically, and optimizes it for your dream role.
              </p>
            </div>

            {/* Feature List */}
            <div className="text-left bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Natural Language Edits</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Instruct Mori to edit any section of your CV instantly.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Targeted Job Tailoring</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Align your experience directly to target job descriptions.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">ATS Optimization</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Enhance keywords to pass automated screening systems.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => openModal({ view: 'signup', callbackUrl: window.location.href })}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-[12px] font-bold transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>Sign Up to Use AI</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={() => openModal({ view: 'signin', callbackUrl: window.location.href })}
                className="w-full py-2 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.98]"
              >
                Already have an account? Log In
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isBottomOverlay ? "w-full flex flex-col pointer-events-auto relative" : "flex flex-col h-full bg-transparent relative overflow-hidden"} ${limitExhausted ? "min-h-[400px]" : ""}`}>
      {limitExhausted && (
        <div className="absolute inset-0 bg-white/95 dark:bg-[#141810]/98 backdrop-blur-md z-[55] p-3 rounded-2xl flex items-center justify-center">
          <UpgradeBanner tier={userTier} isCompact={true} context="mori" />
        </div>
      )}
      {isBottomOverlay ? (
        <div className="w-full bg-white dark:bg-[#141810] rounded-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3.5 shadow-xl">
          {/* 1. Chat conversation history inside the same container (shown only if not collapsed) */}
          {messages.length > 1 && !isCollapsed && (
            <div 
              ref={scrollRef}
              className="flex-grow overflow-y-auto max-h-[220px] space-y-4 border-b border-slate-100 dark:border-white/5 pb-3 mb-1 custom-scrollbar min-h-[90px] flex flex-col pr-1"
            >
              {showHistory ? (
                <div className="space-y-2 p-1">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-1.5 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Previous Chats</span>
                    <button onClick={() => setShowHistory(false)} className="text-slate-455 hover:text-slate-655 text-xs font-semibold bg-transparent border-none">Back to Chat</button>
                  </div>
                  {chatHistory.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 italic">No previous chats.</div>
                  ) : (
                    chatHistory.map((chat) => (
                      <div 
                        key={chat._id}
                        onClick={() => handleLoadChat(chat._id)}
                        className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors border ${chatId === chat._id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-250' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <div className="flex-grow min-w-0 pr-2">
                          <h4 className="text-xs font-bold truncate text-slate-700 dark:text-slate-350">{chat.title}</h4>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(e, chat._id); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-transparent border-none">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                messages.map((m) => (
                  <div 
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex gap-2.5 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${m.role === 'user' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`}>
                        {m.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Sparkles className="w-3 h-3 text-emerald-500" />}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className={`px-3 py-2 rounded-xl text-[12.5px] leading-relaxed ${
                          m.role === 'user' 
                            ? 'bg-emerald-500 text-white rounded-tr-none shadow-sm' 
                            : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-150 dark:border-white/10 rounded-tl-none shadow-sm'
                        }`}>
                          {m.selection && (
                            <div className="mb-1.5 pb-1.5 border-b border-black/10 dark:border-white/10 opacity-90 text-[10px] font-medium flex items-start gap-1">
                              <CornerDownRight className="w-3 h-3 shrink-0 mt-0.5" />
                              <span className="italic leading-snug">"{m.selection.text.substring(0, 60)}{m.selection.text.length > 60 ? '...' : ''}"</span>
                            </div>
                          )}
                          <span className="whitespace-pre-line">{m.content}</span>
                        </div>
                        {m.role === 'assistant' && m.options && m.options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                            {m.options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => handleOptionClick(opt)}
                                disabled={isLoading}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-500/30 rounded-lg text-[10.5px] font-semibold transition-colors text-left break-words max-w-full active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-2.5 items-start mt-2">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 bg-slate-250 dark:bg-white/10">
                    <Sparkles className="w-3 h-3 text-emerald-500 animate-spin" />
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-155 dark:border-white/10 rounded-tl-none shadow-sm flex items-center">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Target Selection Banner above input */}
          <AnimatePresence>
            {currentSelection && (
              <motion.div 
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 5, opacity: 0 }}
                className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/35 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0 min-w-0 w-full"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-grow mr-2 min-w-0">
                  <MousePointer2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1 min-w-0 max-w-full">
                    <span className="opacity-70 shrink-0">Targeting:</span>
                    <span className="truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                      "{currentSelection.text}"
                    </span>
                  </div>
                </div>
                <button onClick={() => setCurrentSelection(null)} className="p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 rounded text-emerald-600 dark:text-emerald-400 transition-colors shrink-0 bg-transparent border-none">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Main Action/Input bar row */}
          <div className="flex items-center gap-2 w-full">
            {/* Focus Section Dropdown (inline but separated from text box) */}
            <select
              value={getTopLevelSectionKey(currentSelection?.path || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setCurrentSelection(null);
                } else {
                  const text = getSectionText(val);
                  setCurrentSelection({ path: val, text });
                  window.dispatchEvent(new CustomEvent('mori-cv-selection', { 
                    detail: { path: val, text } 
                  }));
                }
              }}
              className="bg-gray-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-2.5 py-2.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 cursor-pointer focus:outline-none transition-colors shrink-0 max-w-[100px] shadow-sm"
            >
              {getAvailableSections().map((s) => (
                <option key={s.value} value={s.value} className="bg-white dark:bg-[#141810] text-slate-800 dark:text-slate-200 text-[10px]">{s.label}</option>
              ))}
            </select>

            {/* Textarea Input Container */}
            <div className="flex-grow flex-1 relative bg-gray-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 flex items-center gap-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  if (isCollapsed) setIsCollapsed(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={PLACEHOLDERS[placeholderIndex]}
                rows={1}
                className="flex-grow bg-transparent text-[13px] placeholder:text-[13px] placeholder:text-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none dark:text-white self-center py-0.5"
                style={{ minHeight: '22px', maxHeight: '90px' }}
              />
            </div>

            {/* Circular Voice Input Button */}
            <button 
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm hover:shadow active:scale-95 shrink-0 ${
                isListening 
                  ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
              title={isListening ? "Stop Voice Input" : "Voice Input"}
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
            </button>

            {/* History Toggle button */}
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                showHistory 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="History"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Chevron Expand/Collapse Toggle button */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                !isCollapsed 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
              title={isCollapsed ? "Expand Chat" : "Collapse Chat"}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* circular send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                input.trim() && !isLoading 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md cursor-pointer hover:scale-105 active:scale-95' 
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4. Suggested Prompts bar (shown only in initial welcome state) */}
          {messages.length <= 1 && !showHistory && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap mt-0.5">
              <span className="font-bold">Suggested prompts:</span>
              <button onClick={() => handleSend("Improve tone")} className="px-3 py-1 bg-slate-105 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-350 rounded-full font-semibold transition-colors cursor-pointer border-none">Improve tone</button>
              <button onClick={() => handleSend("Highlight achievements")} className="px-3 py-1 bg-slate-105 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-350 rounded-full font-semibold transition-colors cursor-pointer border-none">Highlight achievements</button>
              <button onClick={() => handleSend("Align with JD")} className="px-3 py-1 bg-slate-105 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-350 rounded-full font-semibold transition-colors cursor-pointer border-none">Align with JD</button>
              <button onClick={() => handleSend("Make shorter")} className="px-3 py-1 bg-slate-105 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-355 rounded-full font-semibold transition-colors cursor-pointer border-none">Make shorter</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-transparent shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              {chatId ? chatHistory.find(c => c._id === chatId)?.title || 'Current Chat' : 'New Chat'}
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleNewChat}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-emerald-600 transition-all flex items-center gap-1 text-[10px] font-bold bg-transparent border-none cursor-pointer"
                title="New Chat"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-[10px] font-bold bg-transparent border-none cursor-pointer ${showHistory ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                title="History"
              >
                <History className="w-3.5 h-3.5" /> History
              </button>
            </div>
          </div>

          <div className="flex-grow relative overflow-hidden">
            {/* History Overlay Panel */}
            <AnimatePresence>
              {showHistory && (
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-0 z-20 bg-white dark:bg-[var(--bg-secondary)] flex flex-col"
                >
                  <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-gray-50 dark:bg-transparent flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Previous Conversations</span>
                    <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white bg-transparent border-none"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {chatHistory.map((chat) => (
                      <div 
                        key={chat._id}
                        onClick={() => handleLoadChat(chat._id)}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${chatId === chat._id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-250' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold truncate text-slate-700 dark:text-slate-350">{chat.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 space-y-5 custom-scrollbar pb-32">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex gap-2 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 ${m.role === 'user' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-[var(--bg-primary)]'}`}>
                      {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-grow">
                      <div className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words max-w-full bg-white dark:bg-[var(--bg-primary)] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-none shadow-sm">
                        {m.content}
                      </div>
                      {m.role === 'assistant' && m.options && m.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-0.5 max-w-full">
                          {m.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleOptionClick(opt)}
                              disabled={isLoading}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-all text-left break-words max-w-full active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Target Selection Banner above input */}
      <AnimatePresence>
        {currentSelection && (!isBottomOverlay) && (
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 5, opacity: 0 }}
            className="pointer-events-auto bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-250 dark:border-emerald-500/35 rounded-t-xl px-3 py-1.5 flex items-center justify-between mb-0 shadow-sm mx-1 shrink-0 min-w-0 w-full"
          >
            <div className="flex items-center gap-2 overflow-hidden flex-grow mr-2 min-w-0">
              <MousePointer2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1 min-w-0 max-w-full">
                <span className="opacity-70 shrink-0">Targeting:</span>
                <span className="truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                  "{currentSelection.text}"
                </span>
              </div>
            </div>
            <button onClick={() => setCurrentSelection(null)} className="p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 rounded text-emerald-600 dark:text-emerald-400 transition-colors shrink-0">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline input bar (Gemini design) */}
      {!isBottomOverlay && (
      <div className={"p-3 pt-0 bg-transparent shrink-0"}>
        <div className={`pointer-events-auto relative group shadow-xl bg-white dark:bg-[#141810] border border-slate-200 dark:border-white/10 p-2 pl-3 pr-2 flex items-center gap-2 transition-all ${
          currentSelection ? 'rounded-b-2xl rounded-t-none border-t-0' : 'rounded-2xl'
        }`}>
          
          {/* Plus icon on the left (matches Gemini style) */}
          <button 
            onClick={handleNewChat}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Text Input Area */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={currentSelection ? "Instruct Mori to update selection..." : "Ask Mori..."}
            rows={1}
            className="flex-grow bg-transparent py-1 px-1 text-[13px] placeholder:text-[13px] placeholder:text-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none dark:text-white self-center"
            style={{ minHeight: '24px', maxHeight: '100px' }}
          />

          {/* Action elements grouped on the right */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`p-1.5 rounded-full transition-all ${
                input.trim() && !isLoading 
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md' 
                  : 'text-slate-300 dark:text-slate-655 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default React.memo(MoriChatInterface);