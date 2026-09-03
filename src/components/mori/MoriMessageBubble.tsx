'use client';

import React, { useState } from 'react';
import { Sparkles, User, CornerDownRight, Copy, Check, RotateCcw } from 'lucide-react';
import MoriMarkdown from './MoriMarkdown';

interface MessageOption {
  label: string;
  prompt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selection?: { path: string; text: string } | { text: string };
  options?: MessageOption[];
  isError?: boolean;
}

interface MoriMessageBubbleProps {
  message: Message;
  onOptionClick?: (prompt: string) => void;
  onRegenerate?: () => void;
  isLatest?: boolean;
  disabled?: boolean;
}

export default function MoriMessageBubble({
  message,
  onOptionClick,
  onRegenerate,
  isLatest = false,
  disabled = false,
}: MoriMessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex gap-2 max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 ${
            isUser
              ? 'bg-emerald-500'
              : isError
                ? 'bg-red-100 dark:bg-red-500/20'
                : 'bg-slate-200 dark:bg-[var(--bg-primary)]'
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Sparkles className={`w-4 h-4 ${isError ? 'text-red-500' : 'text-emerald-500'}`} />
          )}
        </div>

        <div className="space-y-1 min-w-0">
          {/* Message bubble */}
          <div
            className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words max-w-full overflow-hidden [word-break:break-word] ${
              isUser
                ? 'bg-emerald-500 text-white rounded-tr-none shadow-sm'
                : isError
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 rounded-tl-none shadow-sm'
                  : 'bg-white dark:bg-[var(--bg-primary)] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-none shadow-sm'
            }`}
          >
            {/* Selection context */}
            {message.selection && (
              <div className="mb-2 pb-2 border-b border-white/20 opacity-90 text-[11px] font-medium flex items-start gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="italic leading-snug">
                  &ldquo;{message.selection.text.substring(0, 80)}
                  {message.selection.text.length > 80 ? '...' : ''}&rdquo;
                </span>
              </div>
            )}

            {/* Content with markdown */}
            {isUser ? (
              <span className="text-[13px]">{message.content}</span>
            ) : (
              <MoriMarkdown content={message.content} />
            )}
          </div>

          {/* Timestamp + Actions row */}
          <div className={`flex items-center gap-2 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[9px] text-slate-400 font-medium">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Assistant message actions */}
            {!isUser && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  title="Copy message"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                {isLatest && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={disabled}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-30"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Options / Action cards */}
      {message.options && message.options.length > 0 && (
        <div className="ml-9 mt-2 flex flex-col gap-1.5 w-[85%]">
          {message.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onOptionClick?.(opt.prompt)}
              disabled={disabled}
              className="text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-[11px] font-medium text-emerald-800 dark:text-emerald-300 transition-all flex items-center justify-between group/opt hover:shadow-sm disabled:opacity-50"
            >
              <span>{opt.label}</span>
              <span className="text-emerald-400 group-hover/opt:text-emerald-600 dark:group-hover/opt:text-emerald-300 text-[10px] transition-colors">
                &rarr;
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
