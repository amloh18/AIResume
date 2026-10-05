'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { recoverMoriChatResult, resolveMoriEditTarget, sanitizeMoriChatMessage } from '@/lib/utils/mori-chat-response';
import MoriChatLimitPanel from '@/components/payment/MoriChatLimitPanel';
import { MoriMessageBubble, MoriLoadingIndicator, MoriSuggestionChips } from '@/components/mori';
import { useSession } from 'next-auth/react';
import { useAuthModalStore } from '@/lib/stores/authModalStore';
import { 
  Send, Sparkles, Trash2, ChevronRight, ChevronDown, ChevronUp, MessageSquare, History, Edit2, X, Plus, MousePointer2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  label: string;
  prompt: string;
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
  isError?: boolean;
}

interface ChatHistoryItem {
  _id: string;
  title: string;
  updatedAt: string;
  cvId?: string;
}

/**
 * Dock controls.
 *
 * When `collapsed` is true the interface renders only its input as a slim bar
 * and asks the parent (MoriChatDock) to grow it into the full chat overlay
 * instead of owning the transition itself — that keeps a single chat state
 * across the collapsed ↔ expanded states.
 */
export interface MoriChatDockControls {
  collapsed: boolean;
  onRequestExpand?: () => void;
  onRequestCollapse?: () => void;
}

interface MoriChatInterfaceProps {
  dock?: MoriChatDockControls;
}

const SUGGESTIONS = [
  { label: '✨ Optimize my CV', prompt: 'Optimize my CV' },
  { label: '🎯 Tailor CV to JD', prompt: 'Tailor my CV to the target job description' },
  { label: '✍️ Improve Summary', prompt: 'Improve my CV summary/profile section to make it more impactful' },
  { label: '🚀 Enhance Bullet Points', prompt: 'Enhance the bullet points in my work experience section with stronger action verbs and metrics' },
  { label: '🛠️ Optimize Skills for ATS', prompt: 'Optimize my skills section for ATS screening based on the target job' }
];

const FOLLOW_UP_SUGGESTIONS: Record<string, Array<{ label: string; prompt: string }>> = {
  work: [
    { label: '✨ Now improve summary', prompt: 'Improve my professional summary' },
    { label: '🛠️ Optimize skills for ATS', prompt: 'Optimize my skills section for ATS' },
    { label: '📋 Fix formatting', prompt: 'Fix formatting and consistency across all sections' },
  ],
  education: [
    { label: '🚀 Improve work bullets', prompt: 'Enhance bullet points in my work experience' },
    { label: '✨ Improve summary', prompt: 'Improve my professional summary' },
  ],
  skills: [
    { label: '🎯 Tailor to job', prompt: 'Tailor my CV to the target job description' },
    { label: '🚀 Improve work bullets', prompt: 'Enhance bullet points in my work experience' },
  ],
  basics: [
    { label: '🚀 Improve work bullets', prompt: 'Enhance bullet points in my work experience' },
    { label: '🛠️ Optimize skills', prompt: 'Optimize my skills section for ATS' },
  ],
  default: [
    { label: '✨ Polish entire CV', prompt: 'Polish my entire CV — summary, experience, skills, and formatting' },
    { label: '🎯 Tailor to job', prompt: 'Tailor my CV to the target job description' },
    { label: '🛠️ Optimize for ATS', prompt: 'Optimize my entire CV for ATS screening' },
  ],
};

const MoriChatInterface: React.FC<MoriChatInterfaceProps> = ({ dock }) => {
  const collapsed = !!dock?.collapsed;
  const { state, updateCVData } = useResumeEnhancer();
  const { data: session, status: sessionStatus } = useSession();
  const { openModal } = useAuthModalStore();
  const isGuestMode = sessionStatus === 'unauthenticated';

  const [limitExhausted, setLimitExhausted] = useState(false);
  const [input, setInput] = useState('');
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentSelection) {
        setCurrentSelection(null);
      }
    };

    window.addEventListener('mori-cv-selection', handleSelection as EventListener);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mori-cv-selection', handleSelection as EventListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHistory, currentSelection]);

  const handleSendRef = useRef<((prompt?: string, selection?: { path: string; text: string } | null) => Promise<void>) | null>(null);

  // Listen for direct prompts sent from analysis sections or elsewhere
  useEffect(() => {
    const handleSendPromptEvent = (e: CustomEvent) => {
      const { prompt, selection } = e.detail || {};
      if (prompt) {
        if (dock?.onRequestExpand) {
          dock.onRequestExpand();
        }
        if (showHistory) setShowHistory(false);
        // Small timeout to allow dock expansion animation and state to settle
        setTimeout(() => {
          if (handleSendRef.current) {
            handleSendRef.current(prompt, selection);
          }
        }, 50);
      }
    };

    window.addEventListener('mori-chat-send-prompt', handleSendPromptEvent as EventListener);
    return () => {
      window.removeEventListener('mori-chat-send-prompt', handleSendPromptEvent as EventListener);
    };
  }, [dock, showHistory]);

  const handleSend = async (overrideInput?: string, overrideSelection?: { path: string; text: string } | null) => {
    const textToSend = (overrideInput || input).trim();
    if (!textToSend || isLoading) return;

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
        content: 'Okay, cancelled. Tell me what you would like to change.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      return;
    }

    const effectiveSelection = overrideSelection !== undefined ? overrideSelection : currentSelection;
    const textLower = textToSend.toLowerCase();
    const isConfirmWholeCV = textLower.includes('apply to whole') || textLower.includes('apply to the whole') || textLower.includes('entire cv') || textLower.includes('proceed');
    // Match against ANY prior assistant option (not just the latest message) so
    // clicking a stale/older option card still sends instead of re-asking.
    const isQuickOption = messages.some(m => m.role === 'assistant' && m.options?.some(opt => opt.prompt === textToSend || opt.label === textToSend));
    const target = resolveMoriEditTarget(textToSend, state.cvData);

    if (!effectiveSelection && !isConfirmWholeCV && !isQuickOption && target.status === 'ask') {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: textToSend,
        timestamp: Date.now()
      };
      const warningMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: target.message,
        timestamp: Date.now(),
        options: [...target.options, { label: 'Cancel', prompt: 'Cancel' }]
      };
      setInput('');
      setMessages((prev) => [...prev, userMsg, warningMsg]);
      return;
    }

    const inferredSelection = effectiveSelection || (target.status === 'resolved' ? target.selection : null);

    const userMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      selection: inferredSelection || undefined
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
        selection: inferredSelection,
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
      const recovered = recoverMoriChatResult(result, state.cvData);
      if (result.limitExhausted) {
        setLimitExhausted(true);
      }
      
      const assistantMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: recovered.message,
        timestamp: Date.now(),
        options: recovered.options ?? undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (result.chatId && result.chatId !== chatId) {
        setChatId(result.chatId);
        fetchHistory(); // Refresh history to show new chat
      }

      // Use the server-merged CV directly. The server already normalized IDs,
      // applied operations, and verified the result. Re-merging client-side
      // with original (unnormalized) state would cause operations to target
      // IDs that don't exist, producing incorrect results.
      const mergedCV = result.updatedCV || recovered.updatedCV;
      if (mergedCV) {
        const oldCV = state.cvData;
        const newCV = mergedCV;

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

          // Compare languages
          if (Array.isArray(newCV.languages) && Array.isArray(oldCV.languages)) {
            newCV.languages.forEach((_lang: any, idx: number) => {
              const oldLang = oldCV.languages[idx];
              if (!oldLang || JSON.stringify(newCV.languages[idx]) !== JSON.stringify(oldLang)) {
                window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                  detail: { collection: 'languages', index: idx }
                }));
              }
            });
          }

          // Compare skills
          if (JSON.stringify(newCV.skills) !== JSON.stringify(oldCV.skills)) {
            window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
              detail: { collection: 'skills', index: 0 }
            }));
          }

          // Compare interests
          if (Array.isArray(newCV.interests)) {
            newCV.interests.forEach((_item: any, idx: number) => {
              window.dispatchEvent(new CustomEvent('mori-cv-updated-section', {
                detail: { collection: 'interests', index: idx }
              }));
            });
          }
        }
      } else if (result.updatedCV === null && recovered.updatedCV === null) {
        // No CV changes returned — Mori may have returned only a message/options
        console.warn('[mori-chat] No CV changes in response');
      }

      setCurrentSelection(null);

    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: `Sorry, something went wrong. ${error.message || 'Please try again.'}`,
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  handleSendRef.current = handleSend;

  const handleLoadChat = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/ai/mori-chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages((data.chat.messages || []).map((msg: Message) => (
          msg.role === 'assistant'
            ? { ...msg, content: sanitizeMoriChatMessage(msg.content) || msg.content }
            : msg
        )));
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
    // Collapsed dock: a slim sign-up bar instead of the full promo card, so the
    // bottom bar keeps its height and the editor layout never shifts.
    if (collapsed) {
      return (
        <button
          type="button"
          onClick={() => openModal({ view: 'signup', callbackUrl: window.location.href })}
          className="w-full h-full flex items-center gap-3 px-4 text-left group"
        >
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="flex-1 min-w-0 text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
            Sign up to edit your CV with Mori AI
          </span>
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Sign Up
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      );
    }

    return (
      <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-transparent shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            Mori AI Assistant
          </div>
          {dock?.onRequestCollapse && (
            <button
              onClick={dock.onRequestCollapse}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Collapse Mori"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
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
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>Sign Up to Use AI</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={() => openModal({ view: 'signin', callbackUrl: window.location.href })}
                className="w-full py-2 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
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
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      
      {/* Header Bar */}
      <div className={`px-4 py-2 border-b border-slate-200 dark:border-white/10 items-center justify-between bg-white dark:bg-transparent shrink-0 ${collapsed ? 'hidden' : 'flex'}`}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          {chatId ? chatHistory.find(c => c._id === chatId)?.title || 'Current Chat' : 'New Chat'}
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleNewChat}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-emerald-600 transition-all flex items-center gap-1 text-[10px] font-bold"
            title="New Chat"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-[10px] font-bold ${showHistory ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
            title="History"
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
          {dock?.onRequestCollapse && (
            <button
              onClick={dock.onRequestCollapse}
              className="p-1.5 ml-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Collapse Mori"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 relative overflow-hidden ${collapsed ? 'hidden' : ''}`}>
        
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
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chatHistory.length === 0 ? (
                  <div className="text-center p-6 text-xs text-slate-400 italic">No previous chats found.</div>
                ) : (
                  chatHistory.map((chat) => (
                    <div 
                      key={chat._id}
                      onClick={() => handleLoadChat(chat._id)}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${chatId === chat._id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10'}`}
                    >
                      {editingChatId === chat._id ? (
                        <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                          <input 
                            autoFocus
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => handleRenameChat(e, chat._id)}
                            className="flex-1 text-xs px-2 py-1 bg-white dark:bg-[var(--bg-primary)] border border-emerald-500 outline-none rounded"
                          />
                          <button onClick={(e) => handleRenameChat(e, chat._id)} className="text-emerald-600 hover:text-emerald-700">Save</button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className={`text-xs font-semibold truncate ${chatId === chat._id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {chat.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(chat.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditTitle(chat.title); setEditingChatId(chat._id); }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteChat(e, chat._id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto p-4 space-y-4 hide-scrollbar pb-32"
        >
          {messages.map((m, idx) => {
            const isLatestAssistant = idx === messages.length - 1 && m.role === 'assistant' && !isLoading;
            const hasAiOptions = m.options && m.options.length > 0;
            const isWelcome = m.id === 'welcome' && messages.length === 1;
            const isOnlyUserMsg = messages.length === 2 && idx === 1 && m.role === 'assistant';

            // Determine which section was last edited for follow-up suggestions
            let followUpChips: Array<{ label: string; prompt: string }> | null = null;
            if (isLatestAssistant && !hasAiOptions && !isWelcome) {
              const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
              if (lastUserMsg) {
                const selectionPath = lastUserMsg.selection?.path;
                followUpChips = FOLLOW_UP_SUGGESTIONS[selectionPath || 'default'] || FOLLOW_UP_SUGGESTIONS.default;
              }
            }

            return (
              <div key={m.id} className="group">
                <MoriMessageBubble
                  message={m}
                  onOptionClick={(prompt) => handleSend(prompt)}
                  isLatest={isLatestAssistant}
                  disabled={isLoading}
                />
                {/* Welcome suggestion chips */}
                {isWelcome && (
                  <MoriSuggestionChips
                    suggestions={SUGGESTIONS}
                    onSelect={(prompt) => handleSend(prompt)}
                    disabled={isLoading}
                  />
                )}
                {/* AI-provided options are rendered inside MoriMessageBubble */}
                {/* Dynamic follow-up chips after assistant responses (when AI didn't provide its own options) */}
                {isLatestAssistant && !hasAiOptions && !isWelcome && followUpChips && (
                  <MoriSuggestionChips
                    suggestions={followUpChips}
                    onSelect={(prompt) => handleSend(prompt)}
                    disabled={isLoading}
                  />
                )}
              </div>
            );
          })}
          {isLoading && <MoriLoadingIndicator />}
        </div>
      </div>

      {/* Input Area — overlay while expanded, the whole surface while collapsed */}
      <div
        className={
          collapsed
            ? 'relative z-10 h-full flex items-center'
            : 'absolute bottom-0 left-0 right-0 p-3 pt-0 bg-gradient-to-t from-white via-white to-transparent dark:from-[var(--bg-secondary)] dark:via-[var(--bg-secondary)] z-10 pointer-events-none'
        }
      >
        
        {/* Selection Banner directly above input */}
        <AnimatePresence>
          {currentSelection && !collapsed && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.95 }}
              className="pointer-events-auto bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-t-xl px-3 py-2 flex items-center justify-between mb-0 shadow-sm mx-1"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                <MousePointer2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 line-clamp-2 leading-relaxed">
                  <span className="opacity-70 mr-1">Targeting:</span>
                  &quot;{currentSelection.text}&quot;
                </div>
              </div>
              <button 
                onClick={() => setCurrentSelection(null)}
                className="p-1 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 rounded-md text-emerald-600 dark:text-emerald-400 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {limitExhausted ? (
          collapsed ? (
            <button
              type="button"
              onClick={dock?.onRequestExpand}
              className="w-full h-full flex items-center justify-center gap-2 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400"
            >
              <Sparkles className="w-4 h-4" /> Mori AI limit reached — tap to view options
            </button>
          ) : (
            <MoriChatLimitPanel />
          )
        ) : (
          <div className={`pointer-events-auto relative group transition-all bg-white dark:bg-[var(--bg-primary)] ${collapsed ? 'h-full w-full flex items-center' : 'shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-white/10 ' + (currentSelection ? 'rounded-b-xl rounded-t-none border-t-0' : 'rounded-2xl')}`}>
            {collapsed && (
              <Sparkles className="w-4 h-4 text-emerald-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
            {/* Chevron-up: brings the chat up from the collapsed bar. Without it
                the only way back into an ongoing conversation is to start typing. */}
            {collapsed && dock?.onRequestExpand && (
              <button
                type="button"
                onClick={dock.onRequestExpand}
                title="Bring up chat"
                aria-label="Bring up Mori chat"
                className="absolute left-11 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Typing in the collapsed bar grows the dock into the chat overlay
                // so the conversation (and Mori's thinking state) is visible while
                // composing — the overlay never affects the editor layout.
                if (collapsed && e.target.value.length > 0) dock?.onRequestExpand?.();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  dock?.onRequestExpand?.();
                  handleSend();
                }
              }}
              placeholder={
                collapsed
                  ? (currentSelection ? 'Instruct Mori to update the selection…' : 'Ask or do anything')
                  : (currentSelection ? "Instruct Mori to update selection or whole CV..." : "Ask Mori to edit your CV...")
              }
              rows={1}
              className={`w-full bg-transparent text-[11.5px] placeholder:text-[11.5px] placeholder:text-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none dark:text-white ${collapsed ? 'h-full pl-[4.5rem] pr-24 py-3' : 'px-4 py-3.5 pr-12'}`}
              style={collapsed ? undefined : { minHeight: '48px', maxHeight: '120px' }}
            />
            {/* Compact state chips inside the collapsed bar */}
            {collapsed && (
              <div className="absolute right-11 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                {isLoading ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking
                  </span>
                ) : currentSelection ? (
                  <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold max-w-[140px]">
                    <MousePointer2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">Selection</span>
                  </span>
                ) : null}
              </div>
            )}
            <button
              onClick={() => {
                dock?.onRequestExpand?.();
                handleSend();
              }}
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                input.trim() && !isLoading 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-100' 
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 scale-95'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoriChatInterface;