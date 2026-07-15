'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { useSession } from 'next-auth/react';
import { useMembership } from '@/lib/hooks/useMembership';
import { UserTier } from '@/types/dashboard-widgets';
import UpgradeBanner from '@/components/dashboard/redesigned/UpgradeBanner';
import { 
  Send, Sparkles, User, Loader2, Trash2, CornerDownRight, 
  MousePointer2, MessageSquare, History, Edit2, X, Plus, ChevronRight, Check,
  ChevronUp, ChevronDown, Mic, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface SuggestedImprovement {
  original: string;
  improved: string;
  isSelection: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selection?: {
    text: string;
  };
  suggestion?: SuggestedImprovement;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

const SUGGESTIONS = [
  { label: '✨ Improve Tone', prompt: 'Improve the overall tone to be professional, confident, and persuasive.' },
  { label: '🎯 Align with JD', prompt: 'Align this content to address the core requirements in the job description.' },
  { label: '🚀 Highlight Achievements', prompt: 'Strengthen the text by emphasizing tangible achievements and impact.' },
  { label: '✂️ Make Shorter', prompt: 'Shorten and condense the content to make it more direct and concise.' }
];

interface MoriCoverLetterChatProps {
  onBodyChange?: (content: string) => void;
  onClose?: () => void;
  isBottomOverlay?: boolean;
}

const COVER_LETTER_PLACEHOLDERS = [
  "Ask Mori AI to polish your cover letter...",
  "Ask Mori AI by voice (click Mic)...",
  "Mori can align your letter to target jobs...",
  "Mori can make the introduction more hook-like...",
  "Mori can improve grammatical tone...",
  "Mori can make the cover letter shorter/longer..."
];

export const MoriCoverLetterChat: React.FC<MoriCoverLetterChatProps> = ({
  onBodyChange,
  onClose,
  isBottomOverlay = false
}) => {
  const { state, dispatch } = useResumeEnhancer();
  const [input, setInput] = useState('');

  const { data: session, status: sessionStatus } = useSession();
  const { membership } = useMembership();
  const planKey = membership?.planKey || 'free';
  const userTier: UserTier = planKey.toLowerCase().startsWith('smart') || planKey.toLowerCase().startsWith('pro') 
    ? 'smart' 
    : planKey.toLowerCase().startsWith('focused') 
      ? 'focused' 
      : 'starter';

  const [limitExhausted, setLimitExhausted] = useState(false);

  const checkMoriLimit = async () => {
    if (sessionStatus === 'unauthenticated') return;
    try {
      const res = await fetch('/api/ai/mori-chat/history');
      if (res.ok) {
        const data = await res.json();
        if (data.limitExhausted !== undefined) {
          setLimitExhausted(data.limitExhausted);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Mori Chat limit status', e);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      checkMoriLimit();
    }
  }, [sessionStatus]);
  
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % COVER_LETTER_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Safari!");
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
      console.warn('[Mori Cover Letter STT] Microphone permission request failed:', err);
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
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        toast.success("Listening... Speak now!");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => prev + (prev ? ' ' : '') + transcript);
        }
      };

      rec.onerror = (e: any) => {
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
          console.warn('[Mori Cover Letter STT] Speech recognition error code:', errorCode);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
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
      content: "Hi! I'm Mori. I can help you polish and write your cover letter. Highlight any paragraph or sentence on the left, then choose a quick action or tell me what to change.",
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<{ text: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // History State
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chats from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mori_cl_chat_history');
      if (saved) {
        setChatHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cover letter chat history from localStorage', e);
    }
  }, []);

  // Save chats to localStorage
  const saveToHistory = (updatedHistory: ChatHistoryItem[]) => {
    setChatHistory(updatedHistory);
    try {
      localStorage.setItem('mori_cl_chat_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !showHistory) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, showHistory, currentSelection]);

  // Listen for selection text in the window
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 5) {
        setCurrentSelection({ text: selection });
      }
    };

    const handleMouseDown = () => {
      setTimeout(() => {
        const selection = window.getSelection()?.toString().trim();
        if (!selection) {
          setCurrentSelection(null);
        }
      }, 200);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;

    const bodyContent = state.autoGeneratedCoverLetter || '';
    const hasSelection = !!currentSelection;
    const selectedTextCtx = currentSelection?.text || '';

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      selection: currentSelection ? { text: selectedTextCtx } : undefined
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCurrentSelection(null);

    // Save/update this active chat in local history
    let activeChatId = chatId;
    let updatedHistory = [...chatHistory];

    if (!activeChatId) {
      activeChatId = Date.now().toString();
      setChatId(activeChatId);
      const newChat: ChatHistoryItem = {
        id: activeChatId,
        title: textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : ''),
        updatedAt: Date.now(),
        messages: newMessages
      };
      updatedHistory.unshift(newChat);
    } else {
      updatedHistory = updatedHistory.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, updatedAt: Date.now(), messages: newMessages } 
          : chat
      );
    }
    saveToHistory(updatedHistory);

    try {
      let finalPrompt = '';
      if (hasSelection) {
        finalPrompt = `The user wants to improve a specific selection of their cover letter.
Original Selection:
"${selectedTextCtx}"

User Request:
${textToSend}

Please rewrite only the selected text to fulfill the request. Return the rewritten text directly.`;
      } else {
        finalPrompt = `The user wants to improve their cover letter body.
Full Cover Letter Body:
"${bodyContent}"

User Request:
${textToSend}

Please rewrite the cover letter body to fulfill the request. Return the rewritten body content directly. IMPORTANT: Ensure that the rewritten cover letter body ends with a formal sign-off (e.g., "Sincerely,\n\n${state.cvData?.basics?.name || 'Candidate'}") so the signature remains part of the body text.`;
      }

      const response = await fetch('/api/ai/improve-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          cvData: state.cvData,
          jobData: state.jobData
        })
      });

      if (!response.ok) {
        throw new Error('AI service failed to respond.');
      }

      const result = await response.json();
      if (!result.success || !result.content) {
        throw new Error(result.error || 'Failed to generate improvement.');
      }

      const improvedText = result.content;

      // Apply the improvement directly to the canvas body
      let updatedBody = '';
      if (hasSelection) {
        if (bodyContent.includes(selectedTextCtx)) {
          updatedBody = bodyContent.replace(selectedTextCtx, improvedText);
        } else {
          const normalizedOriginal = selectedTextCtx.replace(/\s+/g, ' ');
          const index = bodyContent.replace(/\s+/g, ' ').indexOf(normalizedOriginal);
          if (index !== -1) {
            updatedBody = bodyContent.substring(0, index) + improvedText + bodyContent.substring(index + selectedTextCtx.length);
          } else {
            updatedBody = bodyContent + '\n\n' + improvedText;
          }
        }
      } else {
        updatedBody = improvedText;
      }

      if (onBodyChange) {
        onBodyChange(updatedBody);
      } else {
        dispatch({ type: 'SET_AUTO_COVER_LETTER', payload: { draft: updatedBody } });
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: hasSelection 
          ? "I've applied the rewritten text directly to your cover letter canvas!" 
          : "I've updated the cover letter body with the improvements directly on your canvas!",
        timestamp: Date.now()
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // Save assistant response
      updatedHistory = updatedHistory.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, updatedAt: Date.now(), messages: finalMessages } 
          : chat
      );
      saveToHistory(updatedHistory);
      
      toast.success('Changes applied directly to canvas!');

    } catch (error: any) {
      console.error('Mori cover letter chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered a temporary connection issue. Please check your network or try again.",
        timestamp: Date.now()
      };
      
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);

      updatedHistory = updatedHistory.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, updatedAt: Date.now(), messages: finalMessages } 
          : chat
      );
      saveToHistory(updatedHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadChat = (id: string) => {
    const chat = chatHistory.find(c => c.id === id);
    if (chat) {
      setMessages(chat.messages);
      setChatId(id);
      setShowHistory(false);
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    const updated = chatHistory.filter(c => c.id !== id);
    saveToHistory(updated);
    if (chatId === id) {
      handleNewChat();
    }
  };

  const handleRenameChat = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    if (!editTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    const updated = chatHistory.map(c => c.id === id ? { ...c, title: editTitle } : c);
    saveToHistory(updated);
    setEditingChatId(null);
  };

  const handleNewChat = () => {
    setChatId(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm Mori. I can help you polish and write your cover letter. Highlight any paragraph or sentence on the left, then choose a quick action or tell me what to change.",
        timestamp: Date.now()
      }
    ]);
    setShowHistory(false);
  };

  return (
    <div className={`${isBottomOverlay ? "w-full flex flex-col pointer-events-auto relative" : "flex flex-col h-full bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm relative overflow-hidden"} ${limitExhausted ? "min-h-[400px]" : ""}`}>
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
                        key={chat.id}
                        onClick={() => handleLoadChat(chat.id)}
                        className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors border ${chatId === chat.id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-250' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <div className="flex-grow min-w-0 pr-2">
                          <h4 className="text-xs font-bold truncate text-slate-700 dark:text-slate-350">{chat.title}</h4>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(e, chat.id); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-transparent border-none">
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
                              <CornerDownRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span className="italic leading-snug">"{m.selection.text.substring(0, 60)}{m.selection.text.length > 60 ? '...' : ''}"</span>
                            </div>
                          )}
                          <span className="whitespace-pre-line">{m.content}</span>
                        </div>
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
                    <span className="opacity-70 shrink-0">Targeting Selection:</span>
                    <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-[380px]">
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
          <div className="flex items-center gap-2.5 w-full">
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
                placeholder={COVER_LETTER_PLACEHOLDERS[placeholderIndex]}
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
              {chatId ? chatHistory.find(c => c.id === chatId)?.title || 'Current Chat' : 'New Chat'}
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <button 
                onClick={handleNewChat}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-emerald-600 transition-all flex items-center gap-1 text-[10px] bg-transparent border-none cursor-pointer"
                title="New Chat"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-[10px] bg-transparent border-none cursor-pointer ${showHistory ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
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
                  className="absolute inset-0 z-20 bg-white dark:bg-[#141810] flex flex-col"
                >
                  <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-gray-50 dark:bg-transparent flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Previous Conversations</span>
                    <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-white bg-transparent border-none"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {chatHistory.map((chat) => (
                      <div 
                        key={chat.id}
                        onClick={() => handleLoadChat(chat.id)}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${chatId === chat.id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-250' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 ${m.role === 'user' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`}>
                      {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words max-w-full bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-none shadow-sm">
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MoriCoverLetterChat;
