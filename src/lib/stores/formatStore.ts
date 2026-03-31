'use client';

import { create } from 'zustand';
import { DateFormatStyle } from '@/lib/utils/textFormatting';
import { SectionTitleStyle, SummaryStyle, FormatState } from '@/types/snippets';

interface FormatStore extends FormatState {
  setDateFormat: (style: DateFormatStyle) => void;
  setSectionTitleStyle: (style: SectionTitleStyle) => void;
  setSummaryStyle: (style: SummaryStyle) => void;
  setShowContactIcons: (show: boolean) => void;
}

export const useFormatStore = create<FormatStore>((set) => ({
  dateFormat: 'MMM_YYYY',
  sectionTitleStyle: 'bordered',
  summaryStyle: 'justified',
  showContactIcons: true,

  setDateFormat: (style) => set({ dateFormat: style }),
  setSectionTitleStyle: (style) => set({ sectionTitleStyle: style }),
  setSummaryStyle: (style) => set({ summaryStyle: style }),
  setShowContactIcons: (show) => set({ showContactIcons: show }),
}));
