'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered 
} from 'lucide-react';

interface TiptapToolbarProps {
  editor: Editor | null;
  isVisible?: boolean;
}

export function TiptapToolbar({ editor, isVisible = true }: TiptapToolbarProps) {
  if (!editor || !isVisible) {
    return null;
  }

  const buttonClass = "p-1 rounded hover:bg-gray-200 transition-colors";
  const activeButtonClass = "p-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors";

  return (
    <div className="flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-md shadow-sm mb-2">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? activeButtonClass : buttonClass}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? activeButtonClass : buttonClass}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? activeButtonClass : buttonClass}
        title="Underline"
      >
        <Underline size={16} />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-1"></div>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? activeButtonClass : buttonClass}
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? activeButtonClass : buttonClass}
        title="Align Center"
      >
        <AlignCenter size={16} />
      </button>
      
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? activeButtonClass : buttonClass}
        title="Align Right"
      >
        <AlignRight size={16} />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-1"></div>
      
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? activeButtonClass : buttonClass}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? activeButtonClass : buttonClass}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
    </div>
  );
} 