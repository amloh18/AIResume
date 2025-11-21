'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export default function CodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  autoFocus = true
}: CodeInputProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize digits from value prop
  useEffect(() => {
    if (value && value.length <= 4) {
      const newDigits = value.split('').concat(Array(4 - value.length).fill(''));
      setDigits(newDigits);
    }
  }, [value]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleInputChange = (index: number, inputValue: string) => {
    // Only allow single digit
    if (inputValue.length > 1) {
      inputValue = inputValue.slice(-1);
    }

    // Only allow digits
    if (inputValue && !/^\d$/.test(inputValue)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = inputValue;
    setDigits(newDigits);

    // Update parent component
    const code = newDigits.join('');
    onChange(code);

    // Auto-focus next input
    if (inputValue && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits are entered
    if (code.length === 4 && onComplete) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current digit
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      } else if (index > 0) {
        // Move to previous input
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePaste();
    }
  };

  const handlePaste = async () => {
    try {
      const pastedText = await navigator.clipboard.readText();
      const digits = pastedText.replace(/\D/g, '').slice(0, 4);
      
      if (digits.length === 4) {
        const newDigits = digits.split('');
        setDigits(newDigits);
        onChange(digits);
        
        // Focus last input
        inputRefs.current[3]?.focus();
        
        // Call onComplete
        if (onComplete) {
          onComplete(digits);
        }
      }
    } catch (error) {
      // Paste not supported or failed - silently handle
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when focusing
    inputRefs.current[index]?.select();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4">
        {digits.map((digit, index) => (
          <motion.input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`
              w-16 h-16 text-2xl font-bold text-center
              bg-transparent rounded-full
              text-white placeholder-gray-500
              outline-none focus:outline-none
              transition-all duration-200
              ${error 
                ? 'border border-red-500 focus:border-2 focus:border-red-500' 
                : 'border border-[#80FF00]/50 focus:border-2 focus:border-[#80FF00]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            `}
            placeholder="0"
          />
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Enter the 4-digit code sent to your email
        </p>
      </div>
    </div>
  );
}
