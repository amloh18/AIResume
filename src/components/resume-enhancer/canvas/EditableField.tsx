'use client';

/**
 * EditableField -- inline contentEditable component for the WYSIWYG canvas.
 *
 * Renders a span/div that becomes editable when the canvas is in edit mode.
 * Supports AI highlight marks (yellow <mark> tags for fix annotations) and
 * optional rich-text (multiline) editing.
 */

import React, { useRef, useCallback, useEffect, memo } from 'react';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p';
  editable?: boolean;
  multiline?: boolean;
  placeholder?: string;
  highlightedField?: string | null;
  fieldPath?: string;
  fixAnnotations?: Array<{ id: string; fieldPath: string; status: string }>;
  onAnnotationClick?: (fixId: string) => void;
}

function EditableFieldInner({
  value,
  onChange,
  className = '',
  tag = 'div',
  editable = true,
  multiline = false,
  placeholder = 'Click to edit...',
  highlightedField,
  fieldPath,
  fixAnnotations,
  onAnnotationClick,
}: EditableFieldProps) {
  const ref = useRef<HTMLElement>(null);
  const lastValueRef = useRef(value);

  // Sync external value changes (e.g. from undo or AI fix apply)
  useEffect(() => {
    if (ref.current && value !== lastValueRef.current) {
      // Only update DOM if the value actually changed externally
      const currentContent = multiline ? ref.current.innerHTML : ref.current.textContent;
      if (currentContent !== value) {
        if (multiline) {
          ref.current.innerHTML = value || '';
        } else {
          ref.current.textContent = value || '';
        }
      }
      lastValueRef.current = value;
    }
  }, [value, multiline]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const newValue = multiline ? ref.current.innerHTML : (ref.current.textContent || '');
    lastValueRef.current = newValue;
    onChange(newValue);
  }, [onChange, multiline]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent line breaks in single-line fields
      if (!multiline && e.key === 'Enter') {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
    },
    [multiline],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!multiline) {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      }
    },
    [multiline],
  );

  // Check if this field has an active annotation
  const hasAnnotation = fixAnnotations?.some(
    (a) => a.fieldPath === fieldPath && a.status === 'open',
  );
  const isHighlighted = highlightedField === fieldPath;

  const Tag = tag as any;
  const editableProps = editable
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: handleInput,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
      }
    : {};

  const highlightClasses = [
    hasAnnotation ? 'ring-1 ring-yellow-400 bg-yellow-50/50 rounded' : '',
    isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50/30 rounded' : '',
  ].join(' ');

  return (
    <Tag
      ref={ref}
      className={`${className} ${highlightClasses} ${
        editable ? 'outline-none focus:ring-1 focus:ring-[var(--cv-accent)]/30 rounded cursor-text' : ''
      } ${!value && editable ? 'text-gray-400 italic' : ''}`}
      {...editableProps}
      data-field-path={fieldPath}
      dangerouslySetInnerHTML={
        multiline ? { __html: value || (editable ? placeholder : '') } : undefined
      }
    >
      {!multiline ? value || (editable ? placeholder : '') : undefined}
    </Tag>
  );
}

const EditableField = memo(EditableFieldInner);
export default EditableField;
