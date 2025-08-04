'use client';

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { TiptapToolbar } from './TiptapToolbar';

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

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isPreview?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onContentSelect?: (content: string, section: string, elementType: string) => void;
  sectionKey?: string;
  elementType?: string;
  isSelected?: boolean;
  editable?: boolean;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  isPreview = false,
  className = '',
  style = {},
  onContentSelect,
  sectionKey,
  elementType,
  isSelected = false,
  editable = true
}: TiptapEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: editable && !isPreview && isEditing,
    immediatelyRender: false, // Fix for SSR hydration issues
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    onFocus: () => {
      setIsEditing(true);
    },
    onBlur: () => {
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

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
    transition: 'all 0.2s ease-in-out',
    minHeight: '1.2em',
  };

  const editorStyle: React.CSSProperties = {
    outline: 'none',
    border: 'none',
    background: 'transparent',
    width: '100%',
    ...style,
  };

  if (isPreview) {
    return (
      <div
        className={`${className} whitespace-pre-wrap`}
        style={containerStyle}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <div
      className={`${!isPreview ? 'cursor-pointer hover:bg-gray-100' : ''} p-1 rounded-md ${className}`}
      onClick={handleClick}
      style={containerStyle}
    >
      <ClientOnly>
        {editor && isEditing && (
          <TiptapToolbar editor={editor} />
        )}
        {editor ? (
          <EditorContent 
            editor={editor} 
            style={editorStyle}
            className="tiptap-editor"
          />
        ) : (
          <div 
            className="text-gray-400"
            style={editorStyle}
          >
            {placeholder}
          </div>
        )}
      </ClientOnly>
    </div>
  );
} 