'use client';

import React, { useState, useRef, useEffect } from 'react';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  isPreview?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onContentSelect?: (content: string, section: string, elementType: string) => void;
  sectionKey?: string;
  elementType?: string;
  isSelected?: boolean;
}

export function EditableField({
  value,
  onChange,
  placeholder,
  multiline = false,
  isPreview = false,
  style = {},
  className = '',
  onContentSelect,
  sectionKey,
  elementType,
  isSelected
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const startEditing = () => {
    if (!isPreview) {
      setIsEditing(true);
      setCurrentValue(value);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onChange(currentValue);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || (multiline && !e.shiftKey))) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setCurrentValue(value);
      handleBlur();
    }
  };

  const handleClick = () => {
    if (!isPreview && onContentSelect && sectionKey && elementType) {
      onContentSelect(value, sectionKey, elementType);
    }
  };

  const containerStyle: React.CSSProperties = {
    ...style,
    cursor: !isPreview && onContentSelect ? 'pointer' : 'default',
    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
    borderRadius: '4px',
    padding: isSelected ? '4px' : '2px',
    transition: 'all 0.2s ease-in-out'
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }
  }, [isEditing, multiline]);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full resize-none overflow-hidden relative z-30 ${className}`}
          style={style}
          autoFocus
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full relative z-30 ${className}`}
        style={style}
        autoFocus
      />
    );
  }

  return (
    <div
      className={`${!isPreview ? 'cursor-pointer hover:bg-gray-100' : ''} p-1 rounded-md whitespace-pre-wrap ${className}`}
      onClick={handleClick}
      style={containerStyle}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </div>
  );
} 