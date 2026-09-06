'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { recoverMoriChatResult, resolveMoriEditTarget, sanitizeMoriChatMessage } from '@/lib/utils/mori-chat-response';
import MoriChatLimitPanel from '@/components/payment/MoriChatLimitPanel';
import { MoriMessageBubble, MoriLoadingIndicator, MoriSuggestionChips } from '@/components/mori';
import { useSession } from 'next-auth/react';
import { useAuthModalStore } from '@/lib/stores/authModalStore';
import { 
  Send, Sparkles, Trash2, ChevronRight, MessageSquare, History, Edit2, X, Plus, MousePointer2
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

const SUGGESTIONS = [
  { label: '✨ Optimize my CV', prompt: 'Optimize my CV' },
  { label: '🎯 Tailor CV to JD', prompt: 'Tailor my CV to the target job description' },
  { label: '✍️ Improve Summary', prompt: 'Improve my CV summary/profile section to make it more impactful' },
  { label: '🚀 Enhance Bullet Points', prompt: 'Enhance the bullet points in my work experience section with stronger action verbs and metrics' },
  { label: '🛠️ Optimize Skills for ATS', prompt: 'Optimize my skills section for ATS screening based on the target job' }
];

const MoriChatInterface: React.FC = () => {
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

  const handleSend = async (overrideInput?: string) => {
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

    const textLower = textToSend.toLowerCase();
    const isConfirmWholeCV = textLower.includes('apply to whole') || textLower.includes('apply to the whole') || textLower.includes('entire cv') || textLower.includes('proceed');
    // Match against ANY prior assistant option (not just the latest message) so
    // clicking a stale/older option card still sends instead of re-asking.
    const isQuickOption = messages.some(m => m.role === 'assistant' && m.options?.some(opt => opt.prompt === textToSend || opt.label === textToSend));
    const target = resolveMoriEditTarget(textToSend, state.cvData);

    if (!currentSelection && !isConfirmWholeCV && !isQuickOption && target.status === 'ask') {
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

    const inferredSelection = currentSelection || (target.status === 'resolved' ? target.selection : null);

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

      if (recovered.updatedCV) {
        const oldCV = state.cvData;
        const newCV = recovered.updatedCV;

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
      <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-transparent shrink-0">
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        
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
          {messages.map((m, idx) => (
            <div key={m.id} className="group">
              <MoriMessageBubble
                message={m}
                onOptionClick={(prompt) => handleSend(prompt)}
                isLatest={idx === messages.length - 1 && m.role === 'assistant'}
                disabled={isLoading}
              />
              {/* Suggestion chips on welcome message */}
              {m.id === 'welcome' && messages.length === 1 && (
                <MoriSuggestionChips
                  suggestions={SUGGESTIONS}
                  onSelect={(prompt) => handleSend(prompt)}
                  disabled={isLoading}
                />
              )}
            </div>
          ))}
          {isLoading && <MoriLoadingIndicator />}
        </div>
      </div>

      {/* Input Area Overlay (sticks to bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pt-0 bg-gradient-to-t from-white via-white to-transparent dark:from-[var(--bg-secondary)] dark:via-[var(--bg-secondary)] z-10 pointer-events-none">
        
        {/* Selection Banner directly above input */}
        <AnimatePresence>
          {currentSelection && (
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
                  "{currentSelection.text}"
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
          <MoriChatLimitPanel />
        ) : (
          <div className={`pointer-events-auto relative group shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[var(--bg-primary)] border border-slate-200 dark:border-white/10 transition-all ${currentSelection ? 'rounded-b-xl rounded-t-none border-t-0' : 'rounded-2xl'}`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={currentSelection ? "Instruct Mori to update selection or whole CV..." : "Ask Mori to edit your CV..."}
              rows={1}
              className="w-full bg-transparent px-4 py-3.5 pr-12 text-[11.5px] placeholder:text-[11.5px] placeholder:text-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none dark:text-white"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={() => handleSend()}
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