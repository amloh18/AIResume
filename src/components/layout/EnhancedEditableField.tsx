'use client';

import React, { useState, useEffect } from 'react';
import { EditableField } from './EditableField';
import { TiptapEditor } from '../cv-studio/TiptapEditor';

// Client-side only wrapper to prevent SSR issues
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

interface EnhancedEditableFieldProps {
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
  useRichText?: boolean;
  templateId?: string;
}

export function EnhancedEditableField({
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
  isSelected = false,
  useRichText = false,
  templateId
}: EnhancedEditableFieldProps) {
  // Determine if this field should use rich text editing
  const shouldUseRichText = useRichText || 
    (multiline && elementType && ['summary', 'description', 'details'].includes(elementType));

  // Generate dynamic class name for template styling
  const getTemplateClassName = () => {
    if (!templateId || !elementType) return className;
    
    const templateClassMap: Record<string, Record<string, string>> = {
      'modernProfessional': {
        'summary': 'desc-modern-professional',
        'description': 'desc-modern-professional',
        'name': 'name-modern-professional',
        'title': 'title-modern-professional'
      },
      'classicElegant': {
        'summary': 'desc-classic-elegant',
        'description': 'desc-classic-elegant',
        'name': 'name-classic-elegant',
        'title': 'title-classic-elegant'
      },
      'minimalistClean': {
        'summary': 'desc-minimalist-clean',
        'description': 'desc-minimalist-clean',
        'name': 'name-minimalist-clean',
        'title': 'title-minimalist-clean'
      }
    };

    const templateClasses = templateClassMap[templateId];
    const elementClass = templateClasses?.[elementType];
    
    return elementClass ? `${className} ${elementClass}` : className;
  };

  if (shouldUseRichText) {
    return (
      <ClientOnly>
        <TiptapEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          isPreview={isPreview}
          className={getTemplateClassName()}
          style={style}
          onContentSelect={onContentSelect}
          sectionKey={sectionKey}
          elementType={elementType}
          isSelected={isSelected}
        />
      </ClientOnly>
    );
  }

  return (
    <EditableField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      multiline={multiline}
      isPreview={isPreview}
      style={style}
      className={getTemplateClassName()}
      onContentSelect={onContentSelect}
      sectionKey={sectionKey}
      elementType={elementType}
      isSelected={isSelected}
    />
  );
} 