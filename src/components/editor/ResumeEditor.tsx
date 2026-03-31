'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { generateNodeId } from '@/lib/utils/nodeId';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Eye, EyeOff, Calendar, GalleryHorizontal, Sparkles
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useFormatStore } from '@/lib/stores/formatStore';
import { useSnippetStore } from '@/lib/stores/snippetStore';
import { DATE_FORMAT_OPTIONS } from '@/lib/utils/textFormatting';
import { SnippetCategory, GalleryItem } from '@/types/snippets';
import { generateBullet } from '@/services/aiBulletService';
import { SectionHoverChip } from './SectionHoverChip';
import { SnippetPicker } from './SnippetPicker';
import { SnippetGallery } from './SnippetGallery';

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

  const [snippetPickerState, setSnippetPickerState] = useState<{
    open: boolean;
    category: SnippetCategory | null;
  }>({ open: false, category: null });

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [generatingBullet, setGeneratingBullet] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const dateFormat = useFormatStore((s) => s.dateFormat);
  const setDateFormat = useFormatStore((s) => s.setDateFormat);
  const showContactIcons = useFormatStore((s) => s.showContactIcons);
  const setShowContactIcons = useFormatStore((s) => s.setShowContactIcons);
  const sectionTitleStyle = useFormatStore((s) => s.sectionTitleStyle);
  const setSectionTitleStyle = useFormatStore((s) => s.setSectionTitleStyle);
  const { startDragging, stopDragging } = useSnippetStore();

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

  const addBulletPoint = useCallback(async (useAI = false) => {
    if (!editor) return;

    if (useAI) {
      setGeneratingBullet(true);
      try {
        const entryData: Record<string, any> = {};
        const existingBullets: string[] = [];

        const { state } = editor;
        const { $from } = state.selection;

        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d);
          const dataType = node.attrs['data-type'];
          if (dataType === 'experience-block') {
            entryData.company = node.attrs.company;
            entryData.position = node.attrs.position;
          } else if (dataType === 'education-block') {
            entryData.institution = node.attrs.institution;
            entryData.studyType = node.attrs.studyType;
            entryData.area = node.attrs.area;
          } else if (dataType === 'projects-block') {
            entryData.name = node.attrs.name;
          }
        }

        const sectionType = (context.sectionType as 'experience' | 'education' | 'project') || 'experience';

        const result = await generateBullet({
          sectionType,
          entryData,
          existingBullets,
          profileSummary: resumeData?.basics?.summary,
        });

        editor.chain().focus().insertContent({
          type: 'bulletNode',
          attrs: { id: generateNodeId() },
        }).run();

        if (result.success && result.bullet) {
          editor.commands.insertContent(result.bullet);
        }
      } catch (err) {
        console.error('AI bullet generation failed:', err);
        editor.chain().focus().insertContent({
          type: 'bulletNode',
          attrs: { id: generateNodeId() },
        }).run();
      } finally {
        setGeneratingBullet(false);
      }
    } else {
      editor.chain().focus().insertContent({
        type: 'bulletNode',
        attrs: { id: generateNodeId() },
      }).run();
    }
  }, [editor, context.sectionType, resumeData]);

  const handleAddEntry = useCallback((sectionType: string) => {
    const typeMap: Record<string, () => void> = {
      'experience-block': addExperienceBlock,
      'education-block': addEducationBlock,
      'skills-block': addSkillsBlock,
      'projects-block': addProjectsBlock,
    };
    typeMap[sectionType]?.();
  }, [addExperienceBlock, addEducationBlock, addSkillsBlock, addProjectsBlock]);

  const handleDeleteSection = useCallback((sectionId: string) => {
    if (!editor) return;
    const { state } = editor;
    let found = false;
    state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.attrs['data-id'] === sectionId) {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
        found = true;
        return false;
      }
      return true;
    });
  }, [editor]);

  const handleOpenSnippets = useCallback((sectionType: string) => {
    const categoryMap: Record<string, SnippetCategory> = {
      'experience-block': 'sectionTitle',
      'education-block': 'sectionTitle',
      'skills-block': 'skills',
      'projects-block': 'sectionTitle',
    };
    const category = categoryMap[sectionType] || 'sectionTitle';
    setSnippetPickerState({ open: true, category });
  }, []);

  const handleOpenGallery = useCallback(() => {
    setGalleryOpen(true);
  }, []);

  const handleCloseGallery = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  const handleGallerySnippetSelect = useCallback((snippet: GalleryItem) => {
    if (!editor) return;
    
    if (snippet.isSection && snippet.sectionType) {
      // Insert section snippet
      const sectionMap: Record<string, () => void> = {
        experience: addExperienceBlock,
        education: addEducationBlock,
        skills: addSkillsBlock,
        projects: addProjectsBlock,
      };
      
      const addFn = sectionMap[snippet.sectionType];
      if (addFn) {
        addFn();
      }
    } else if (snippet.category) {
      // Apply style snippet
      setSnippetPickerState({ open: true, category: snippet.category });
    }
    
    handleCloseGallery();
  }, [editor, addExperienceBlock, addEducationBlock, addSkillsBlock, addProjectsBlock, handleCloseGallery]);

  const handleGalleryDragStart = useCallback((snippet: GalleryItem) => {
    startDragging(snippet);
  }, [startDragging]);

  const handleGalleryDragEnd = useCallback(() => {
    stopDragging();
  }, [stopDragging]);

  const cycleTitleStyle = useCallback(() => {
    const styles: Array<'bordered' | 'minimal' | 'accent' | 'spaced'> = ['bordered', 'minimal', 'accent', 'spaced'];
    const currentIdx = styles.indexOf(sectionTitleStyle);
    const next = styles[(currentIdx + 1) % styles.length];
    setSectionTitleStyle(next);
  }, [sectionTitleStyle, setSectionTitleStyle]);

  if (!editor) {
    return <div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />;
  }

  return (
    <div className="resume-editor-container">
      {/* Toolbar */}
      <div className="toolbar flex flex-wrap items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
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

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Date format selector */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
            <Calendar size={14} />
            <span className="text-xs">Date</span>
          </button>
          <div className="hidden group-hover:block absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateFormat(opt.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  dateFormat === opt.value ? 'text-lime-600 dark:text-lime-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.example}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Contact icons toggle */}
        <button
          onClick={() => setShowContactIcons(!showContactIcons)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-colors ${
            showContactIcons
              ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title={showContactIcons ? 'Hide contact icons' : 'Show contact icons'}
        >
          {showContactIcons ? <Eye size={14} /> : <EyeOff size={14} />}
          <span className="text-xs">Icons</span>
        </button>

        {/* Section title style cycle */}
        <button
          onClick={cycleTitleStyle}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          title={`Title style: ${sectionTitleStyle}`}
        >
          <span className="text-xs capitalize">Title: {sectionTitleStyle}</span>
        </button>

        {/* Snippet Gallery button */}
        <button
          onClick={handleOpenGallery}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-gradient-to-r from-lime-500 to-emerald-500 text-white rounded-md hover:from-lime-600 hover:to-emerald-600 transition-all shadow-sm"
          title="Open Snippet Gallery"
        >
          <GalleryHorizontal size={14} />
          <span className="text-xs font-medium">Gallery</span>
        </button>

        <div className="flex-1" />

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {context.sectionType && (
            <span className="capitalize">{context.sectionType}</span>
          )}
        </div>
      </div>

      {/* Editor Content with overlay */}
      <div
        ref={editorContainerRef}
        className="editor-wrapper relative border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
      >
        <SectionHoverChip
          editor={editor}
          containerRef={editorContainerRef}
          onAddEntry={handleAddEntry}
          onDeleteSection={handleDeleteSection}
          onOpenSnippets={handleOpenSnippets}
        />

        <AnimatePresence>
          {snippetPickerState.open && snippetPickerState.category && (
            <SnippetPicker
              category={snippetPickerState.category}
              onClose={() => setSnippetPickerState({ open: false, category: null })}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {galleryOpen && (
            <SnippetGallery
              onClose={handleCloseGallery}
              onSnippetSelect={handleGallerySnippetSelect}
              onSnippetDragStart={handleGalleryDragStart}
            />
          )}
        </AnimatePresence>

        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-0.5 bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-1"
          >
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
        <div className="flex items-center gap-3">
          {context.itemId && (
            <span className="text-lime-600 dark:text-lime-400">
              Editing: {context.fieldType}
            </span>
          )}
          {generatingBullet && (
            <span className="text-lime-600 dark:text-lime-400 flex items-center gap-1">
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-lime-500 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              Generating...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>
            Date: <strong>{dateFormat.replace(/_/g, ' ')}</strong>
          </span>
          <span>
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Tab</kbd> to indent bullets
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResumeEditor;
