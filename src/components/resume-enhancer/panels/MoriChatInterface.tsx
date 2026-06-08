'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Loader2, 
  Trash2, 
  CornerDownRight, 
  CheckCircle2,
  AlertCircle,
  Undo2,
  MousePointer2,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selection?: {
    path: string;
    text: string;
  };
  status?: 'pending' | 'applied' | 'rejected';
}

const MoriChatInterface: React.FC = () => {
  const { state, dispatch, updateCVData } = useResumeEnhancer();
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Listen for selection events from the CV preview
  useEffect(() => {
    const handleSelection = (e: CustomEvent) => {
      const { path, text } = e.detail;
      setCurrentSelection({ path, text });
      
      // Highlight the chat input or show a toast?
      // For now, let's just update the state
    };

    window.addEventListener('mori-cv-selection', handleSelection as EventListener);
    return () => {
      window.removeEventListener('mori-cv-selection', handleSelection as EventListener);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      selection: currentSelection || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare context for the AI
      const payload = {
        messages: messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })),
        cvData: state.cvData,
        selection: currentSelection,
        jobData: state.jobData,
        targetRole: state.targetRole,
        seniorityLevel: state.seniorityLevel
      };

      const response = await fetch('/api/ai/mori-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          chat_mode: true
        })
      });

      if (!response.ok) throw new Error('Mori is temporarily unavailable');

      const result = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || "I've processed your request.",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the AI suggested data updates, apply them
      if (result.updatedCV) {
        updateCVData(result.updatedCV);
        // Maybe show a success toast or indicator in message
      }

      // Clear selection after use?
      setCurrentSelection(null);

    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm('Clear conversation history?')) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm Mori. How can I help you with your CV today?",
        timestamp: Date.now()
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B0F1A]">
      {/* Selection Banner */}
      <AnimatePresence>
        {currentSelection && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <MousePointer2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate italic">
                Selected: "{currentSelection.text}"
              </div>
            </div>
            <button 
              onClick={() => setCurrentSelection(null)}
              className="p-1 hover:bg-emerald-500/20 rounded-md text-emerald-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar"
      >
        {messages.map((m) => (
          <div 
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
              </div>
              <div className="space-y-1">
                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-emerald-500 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                }`}>
                  {m.selection && (
                    <div className="mb-2 pb-2 border-b border-white/20 opacity-80 italic flex items-center gap-1.5">
                      <CornerDownRight className="w-3 h-3" />
                      Re: "{m.selection.text.substring(0, 40)}{m.selection.text.length > 40 ? '...' : ''}"
                    </div>
                  )}
                  {m.content}
                </div>
                <div className={`text-[9px] text-slate-400 px-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 items-center text-slate-400">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              </div>
              <span className="text-[11px] animate-pulse italic">Mori is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-[#0F1629] border-t border-slate-200 dark:border-white/5">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={currentSelection ? "How should I change this part?" : "Ask Mori to edit your CV..."}
            rows={1}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none dark:text-white dark:placeholder-slate-500"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
              input.trim() && !isLoading 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-100' 
                : 'bg-slate-200 dark:bg-white/5 text-slate-400 scale-95'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex gap-2">
            <button 
              onClick={clearChat}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-400 hover:text-red-500 transition-all"
              title="Clear Chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            Powered by Mori AI
          </div>
        </div>
      </div>
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default MoriChatInterface;
