'use client';

import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { generateNodeId } from '@/lib/utils/nodeId';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Link2
} from 'lucide-react';

import {
  ExperienceBlock,
  EducationBlock,
  SkillsBlock,
  ProjectsBlock,
  BulletNode,
  SkillTagNode,
  DateRangeNode,
  HighlightMark,
  MetricMark,
} from './extensions';
import {
  DragDropPlugin,
  KeyboardShortcutsPlugin,
  AISuggestionPlugin,
  ContextDetectionPlugin,
} from './plugins';

interface ResumeEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  resumeData?: any;
}

export const ResumeEditor: React.FC<ResumeEditorProps> = ({
  initialContent = '',
  onChange,
  onSave,
  resumeData,
}) => {
  const [context, setContext] = useState<{
    sectionType: string | null;
    sectionId: string | null;
    itemId: string | null;
    fieldType: string | null;
  }>({
    sectionType: null,
    sectionId: null,
    itemId: null,
    fieldType: null,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start building your resume...',
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ExperienceBlock,
      EducationBlock,
      SkillsBlock,
      ProjectsBlock,
      BulletNode,
      SkillTagNode,
      DateRangeNode,
      HighlightMark,
      MetricMark,
      DragDropPlugin,
      KeyboardShortcutsPlugin.configure({
        onSave,
      }),
      AISuggestionPlugin,
      ContextDetectionPlugin.configure({
        onContextChange: (newContext) => {
          setContext(newContext);
        },
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'resume-editor prose prose-sm max-w-none focus:outline-none p-6 min-h-[500px] space-y-1',
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  const addExperienceBlock = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'experienceBlock',
      attrs: {
        id: generateNodeId(),
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
      },
    }).run();
  }, [editor]);

  const addEducationBlock = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'educationBlock',
      attrs: {
        id: generateNodeId(),
        institution: '',
        area: '',
        studyType: '',
        startDate: '',
        endDate: '',
      },
    }).run();
  }, [editor]);

  const addSkillsBlock = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'skillsBlock',
      attrs: {
        id: generateNodeId(),
      },
    }).run();
  }, [editor]);

  const addProjectsBlock = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'projectsBlock',
      attrs: {
        id: generateNodeId(),
        name: '',
        description: '',
      },
    }).run();
  }, [editor]);

  const addBulletPoint = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: 'bulletNode',
      attrs: {
        id: generateNodeId(),
      },
    }).run();
  }, [editor]);

  if (!editor) {
    return <div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />;
  }

  return (
    <div className="resume-editor-container">
      {/* Toolbar */}
      <div className="toolbar flex flex-wrap gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button
          onClick={addExperienceBlock}
          className="px-3 py-1.5 text-sm bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-md hover:bg-lime-200 dark:hover:bg-lime-900/50 transition-colors"
        >
          + Experience
        </button>
        <button
          onClick={addEducationBlock}
          className="px-3 py-1.5 text-sm bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-md hover:bg-lime-200 dark:hover:bg-lime-900/50 transition-colors"
        >
          + Education
        </button>
        <button
          onClick={addSkillsBlock}
          className="px-3 py-1.5 text-sm bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-md hover:bg-lime-200 dark:hover:bg-lime-900/50 transition-colors"
        >
          + Skills
        </button>
        <button
          onClick={addProjectsBlock}
          className="px-3 py-1.5 text-sm bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-md hover:bg-lime-200 dark:hover:bg-lime-900/50 transition-colors"
        >
          + Projects
        </button>
        <div className="flex-1" />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {context.sectionType && (
            <span className="capitalize">{context.sectionType}</span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="editor-wrapper border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, placement: 'top' }}
            className="flex items-center gap-0.5 bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-1"
          >
            {/* Inline formatting */}
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Underline"
            >
              <UnderlineIcon size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Strikethrough"
            >
              <Strikethrough size={14} />
            </button>

            <div className="w-px h-5 bg-gray-600 mx-0.5" />

            {/* Headings */}
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Heading 1"
            >
              <Heading1 size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Heading 2"
            >
              <Heading2 size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Heading 3"
            >
              <Heading3 size={14} />
            </button>

            <div className="w-px h-5 bg-gray-600 mx-0.5" />

            {/* Lists */}
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Bullet List"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Numbered List"
            >
              <ListOrdered size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Quote"
            >
              <Quote size={14} />
            </button>

            <div className="w-px h-5 bg-gray-600 mx-0.5" />

            {/* Alignment */}
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Align Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>

            <div className="w-px h-5 bg-gray-600 mx-0.5" />

            {/* Highlight */}
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('highlightMark') ? 'bg-[#80FF00]/20 text-[#80FF00]' : 'text-gray-300 hover:bg-white/10'}`}
              title="Highlight"
            >
              <Highlighter size={14} />
            </button>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Status Bar */}
      <div className="status-bar flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 p-2 border-t border-gray-200 dark:border-gray-700">
        <div>
          {context.itemId && (
            <span className="text-lime-600 dark:text-lime-400">
              Editing: {context.fieldType}
            </span>
          )}
        </div>
        <div>
          Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Tab</kbd> to indent bullets
        </div>
      </div>
    </div>
  );
};

export default ResumeEditor;