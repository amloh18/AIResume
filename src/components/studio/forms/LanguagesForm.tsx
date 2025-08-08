'use client';

import React, { useState } from 'react';
import { Language } from '@/lib/stores/cvStore';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface LanguagesFormProps {
  languages: Language[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Language>) => void;
}

const proficiencyOptions = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'native', label: 'Native' },
];

const LanguagesForm: React.FC<LanguagesFormProps> = ({
  languages,
  onAdd,
  onRemove,
  onUpdate
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Languages</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Language
        </button>
      </div>

      {languages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No languages added yet.</p>
          <p className="text-sm">Click "Add Language" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {languages.map((lang, index) => (
            <div key={lang.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Language #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(lang.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(lang.id) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(lang.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove language"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(lang.id) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language *
                    </label>
                    <input
                      type="text"
                      value={lang.language}
                      onChange={(e) => onUpdate(lang.id, { language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="English"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proficiency
                    </label>
                    <select
                      value={lang.proficiency}
                      onChange={(e) => onUpdate(lang.id, { proficiency: e.target.value as Language['proficiency'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {proficiencyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguagesForm;