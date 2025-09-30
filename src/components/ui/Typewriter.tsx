'use client';

import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  words: string[];
  delay?: number;
  className?: string;
}

const Typewriter = ({ words, delay = 2000, className = '' }: TypewriterProps) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Safety check for empty words array
  useEffect(() => {
    if (words.length === 0) {
      console.warn('Typewriter: No words provided');
    }
  }, [words]);

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    
    // Safety check for empty words array
    if (!currentWord || words.length === 0) {
      return;
    }
    
    if (isDeleting) {
      if (currentText.length > 0) {
        const timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
      }
    } else {
      if (currentText.length < currentWord.length) {
        const timeout = setTimeout(() => {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
        }, 150);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsDeleting(true);
        }, delay);
        return () => clearTimeout(timeout);
      }
    }
  }, [currentText, currentWordIndex, isDeleting, words, delay]);

  // Fallback if no words provided
  if (words.length === 0) {
    return (
      <span className={`inline-block ${className}`}>
        <span className="text-lime-400">CV</span>
      </span>
    );
  }

  return (
    <span className={`inline-block ${className}`}>
      <span className="text-lime-400 transition-all duration-200">
        {currentText}
      </span>
      <span className="animate-pulse text-lime-400">|</span>
    </span>
  );
};

export default Typewriter;
