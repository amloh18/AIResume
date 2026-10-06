'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Delete } from 'lucide-react';

/**
 * OnScreenKeyboard
 *
 * In-app keyboard for the mobile editor. When an editable field inside the
 * editor (canvas text fields, cover letter body, chat inputs, document title)
 * receives focus on a touch device, the OS virtual keyboard is suppressed
 * (inputmode="none") and this keyboard drives text insertion via
 * document.execCommand — so the fixed-height editor shell never gets resized
 * or scrolled out from under the user by the native keyboard.
 *
 * Desktop is unaffected: the component only activates for coarse pointers
 * inside the zoom-guarded editor root.
 */

const LETTER_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const SYMBOL_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['.', ',', '?', '!', "'"],
];

const EDITABLE_SELECTOR =
  '[contenteditable="true"], input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea';

function isEditableElement(el: EventTarget | null): el is HTMLElement {
  return !!(el instanceof HTMLElement && el.closest(EDITABLE_SELECTOR));
}

export default function OnScreenKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSymbols, setIsSymbols] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const activeFieldRef = useRef<HTMLElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  // While open, let the rest of the page know so fixed bottom elements (the
  // mobile step pills at bottom-6) can move up out from behind the keyboard.
  useEffect(() => {
    if (!isVisible) return;
    const body = document.body;
    const measure = () => {
      const h = keyboardRef.current?.offsetHeight ?? 0;
      body.style.setProperty('--osk-h', `${h}px`);
    };
    body.classList.add('osk-open');
    measure();
    const ro = new ResizeObserver(measure);
    if (keyboardRef.current) ro.observe(keyboardRef.current);
    return () => {
      ro.disconnect();
      body.classList.remove('osk-open');
      body.style.removeProperty('--osk-h');
    };
  }, [isVisible]);

  // Track focus inside the editor and take over text input on touch devices.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarsePointer = window.matchMedia('(pointer: coarse)');

    // Proactively suppress the native keyboard on editable fields that are
    // already in the DOM (covers non-EditableField editors like the cover
    // letter body and chat inputs).
    const suppressNativeKeyboard = () => {
      const root = document.querySelector('[data-zoom-guard-root]');
      if (!root) return;
      root.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR).forEach((el) => {
        el.setAttribute('inputmode', 'none');
      });
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (!coarsePointer.matches) return;
      const target = e.target as HTMLElement | null;
      if (!target || !isEditableElement(target)) return;
      const root = document.querySelector('[data-zoom-guard-root]');
      if (!root || !root.contains(target)) return;

      // Prefer the in-app keyboard over the OS keyboard on mobile.
      target.setAttribute('inputmode', 'none');

      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      if (target !== activeFieldRef.current) {
        activeFieldRef.current = target;
        setIsSymbols(false);
        setIsShift(false);
        setIsVisible(true);
        // Nudge the focused field above the keyboard panel so the caret
        // isn't hidden behind it.
        window.setTimeout(() => {
          try {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
          } catch {
            /* ignore */
          }
        }, 60);
      }
    };

    const handleFocusOut = () => {
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = window.setTimeout(() => {
        const active = document.activeElement;
        // If focus moved to another editable field, handleFocusIn already
        // adopted it — only hide when focus left editable content entirely.
        if (!(active instanceof HTMLElement && isEditableElement(active))) {
          activeFieldRef.current = null;
          setIsVisible(false);
        }
      }, 150);
    };

    suppressNativeKeyboard();
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, []);

  const insertText = useCallback((text: string) => {
    const field = activeFieldRef.current;
    if (!field) return;
    field.focus();
    let handled = false;
    try {
      handled = document.execCommand('insertText', false, text);
    } catch {
      handled = false;
    }
    if (!handled && 'setRangeText' in field) {
      const input = field as HTMLInputElement;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      input.setRangeText(text, start, end, 'end');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  const deleteBackward = useCallback(() => {
    const field = activeFieldRef.current;
    if (!field) return;
    field.focus();
    let handled = false;
    try {
      handled = document.execCommand('delete');
    } catch {
      handled = false;
    }
    if (!handled && 'setRangeText' in field) {
      const input = field as HTMLInputElement;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      if (start !== end) {
        input.setRangeText('', start, end, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (start > 0) {
        input.setRangeText('', start - 1, end, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, []);

  const insertNewline = useCallback(() => {
    const field = activeFieldRef.current;
    if (!field || field.tagName === 'INPUT') return;
    field.focus();
    // Only multiline fields (whitespace-pre-wrap) accept line breaks —
    // single-line canvas fields intentionally ignore Enter.
    const multiline = window.getComputedStyle(field).whiteSpace === 'pre-wrap';
    if (!multiline) return;
    try {
      document.execCommand('insertLineBreak');
    } catch {
      /* ignore */
    }
  }, []);

  const pressKey = useCallback(
    (key: string) => {
      if (key === 'backspace') {
        deleteBackward();
        return;
      }
      if (key === 'space') {
        insertText(' ');
        return;
      }
      if (key === 'enter') {
        insertNewline();
        return;
      }
      if (key === 'shift') {
        setIsShift((s) => !s);
        return;
      }
      if (key === 'symbols') {
        setIsSymbols((s) => !s);
        setIsShift(false);
        return;
      }
      insertText(isShift ? key.toUpperCase() : key);
      // Auto-release shift after a letter, like native keyboards.
      if (isShift) setIsShift(false);
    },
    [deleteBackward, insertNewline, insertText, isShift]
  );

  const dismiss = useCallback(() => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    try {
      activeFieldRef.current?.blur();
    } catch {
      /* ignore */
    }
    activeFieldRef.current = null;
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  const rows = isSymbols ? SYMBOL_ROWS : LETTER_ROWS;

  return (
    <div
      ref={keyboardRef}
      className="fixed inset-x-0 bottom-0 z-[90] md:hidden select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="group"
      aria-label="On-screen keyboard"
    >
      <style jsx global>{`
        /* Keep the mobile step pills visible above the in-app keyboard. */
        body.osk-open [data-editor-bottom-pill] {
          bottom: calc(1.5rem + var(--osk-h, 230px));
        }
      `}</style>
      <div className="bg-white/95 dark:bg-[#141810]/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] px-1.5 pt-1.5 pb-2">
        {/* Toolbar: layout toggle + Done */}
        <div className="flex items-center gap-1 mb-1 px-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              pressKey('symbols');
            }}
            className="h-8 min-w-[44px] px-2 rounded-lg bg-gray-100 dark:bg-white/10 active:bg-emerald-500/30 text-[11px] font-bold text-gray-600 dark:text-gray-300 shadow-sm transition-colors"
          >
            {isSymbols ? 'ABC' : '123'}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              dismiss();
            }}
            className="h-8 px-3 rounded-lg bg-emerald-500/15 dark:bg-[#013f2e] active:bg-emerald-500/30 flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-[#7EE787] shadow-sm transition-colors"
          >
            <Check size={13} className="stroke-[3]" />
            Done
          </button>
        </div>

        {/* Key rows */}
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 mb-1 justify-center">
            {rowIdx === 2 && !isSymbols && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  pressKey('shift');
                }}
                className={`h-10 w-11 shrink-0 rounded-lg shadow-sm text-base font-bold transition-colors ${
                  isShift
                    ? 'bg-emerald-500/25 text-emerald-700 dark:text-[#7EE787]'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 active:bg-emerald-500/30'
                }`}
                aria-label="Shift"
              >
                ⇧
              </button>
            )}
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  pressKey(key);
                }}
                className="flex-1 h-10 rounded-lg bg-gray-100 dark:bg-white/10 active:bg-emerald-500/30 shadow-sm text-sm font-medium text-gray-800 dark:text-gray-100 transition-colors"
              >
                {isShift && !isSymbols ? key.toUpperCase() : key}
              </button>
            ))}
            {rowIdx === 2 && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  pressKey('backspace');
                }}
                className="h-10 w-11 shrink-0 rounded-lg bg-gray-100 dark:bg-white/10 active:bg-emerald-500/30 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                aria-label="Backspace"
              >
                <Delete size={16} />
              </button>
            )}
          </div>
        ))}

        {/* Bottom row: space + return */}
        <div className="flex gap-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              pressKey('space');
            }}
            className="flex-[4] h-10 rounded-lg bg-gray-100 dark:bg-white/10 active:bg-emerald-500/30 shadow-sm text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors"
          >
            space
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              pressKey('enter');
            }}
            className="flex-[2] h-10 rounded-lg bg-gray-100 dark:bg-white/10 active:bg-emerald-500/30 shadow-sm text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors"
          >
            return
          </button>
        </div>
      </div>
    </div>
  );
}
