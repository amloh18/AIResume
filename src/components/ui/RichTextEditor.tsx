'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo 
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = ''
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-3 min-h-[120px] text-white dark:text-white prose-gray dark:prose-gray',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!isMounted || !editor) {
    return (
      <div className={`border border-lime-300 dark:border-lime-600 rounded-md ${className}`}>
        <div className="border-b border-lime-200 dark:border-lime-700 p-2 flex items-center gap-1">
          <div className="w-6 h-6 bg-lime-200 dark:bg-lime-700 rounded animate-pulse"></div>
          <div className="w-6 h-6 bg-lime-200 dark:bg-lime-700 rounded animate-pulse"></div>
          <div className="w-px h-6 bg-lime-300 dark:bg-lime-600 mx-2"></div>
          <div className="w-6 h-6 bg-lime-200 dark:bg-lime-700 rounded animate-pulse"></div>
          <div className="w-6 h-6 bg-lime-200 dark:bg-lime-700 rounded animate-pulse"></div>
        </div>
        <div className="p-3 min-h-[120px] bg-lime-50 dark:bg-lime-900/10">
          <div className="h-4 bg-lime-200 dark:bg-lime-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 bg-lime-200 dark:bg-lime-700 rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    );
  }

  const MenuBar = () => {
    return (
      <div className="border-b border-lime-200 dark:border-lime-700 p-2 flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded hover:bg-lime-100 dark:hover:bg-lime-900/20 text-lime-600 dark:text-lime-400 ${
            editor.isActive('bold') ? 'bg-lime-200 dark:bg-lime-800/30' : ''
          }`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded hover:bg-lime-100 dark:hover:bg-lime-900/20 text-lime-600 dark:text-lime-400 ${
            editor.isActive('italic') ? 'bg-lime-200 dark:bg-lime-800/30' : ''
          }`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        
        <div className="w-px h-6 bg-lime-300 dark:bg-lime-600 mx-2" />
        
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded hover:bg-lime-100 dark:hover:bg-lime-900/20 text-lime-600 dark:text-lime-400 ${
            editor.isActive('bulletList') ? 'bg-lime-200 dark:bg-lime-800/30' : ''
          }`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded hover:bg-lime-100 dark:hover:bg-lime-900/20 text-lime-600 dark:text-lime-400 ${
            editor.isActive('orderedList') ? 'bg-lime-200 dark:bg-lime-800/30' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1 rounded hover:bg-lime-100 dark:hover:bg-lime-900/20 text-lime-600 dark:text-lime-400 ${
            editor.isActive('blockquote') ? 'bg-lime-200 dark:bg-lime-800/30' : ''
          }`}
          title="Quote"
        >
          <Quote size={16} />
        </button>
        
        <div className="w-px h-6 bg-lime-300 dark:bg-lime-600 mx-2" />
        
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1 rounded hover:bg-lime-100 dark:hover:bg-lime-900/20 text-lime-600 dark:text-lime-400 disabled:opacity-50"
          title="Undo"
        >
          <Undo size={16} />
        </button>
        
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1 rounded hover:bg-lime-100 dark:hover:bg-lime-900/20 text-lime-600 dark:text-lime-400 disabled:opacity-50"
          title="Redo"
        >
          <Redo size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className={`border border-lime-300 dark:border-lime-600 rounded-md ${className}`}>
      <MenuBar />
      <EditorContent editor={editor} />
      {!content && (
        <div className="absolute top-12 left-3 text-lime-400 dark:text-lime-500 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor; 