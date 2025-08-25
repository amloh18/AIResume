'use client';

import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface LanguagesFormProps {
  languages: Array<{
    language: string;
    fluency: string;
  }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
}

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
            <div key={lang.language} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Language #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(lang.language)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(lang.language) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(lang.language)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove language"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(lang.language) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language *
                      </label>
                      <input
                        type="text"
                        value={lang.language}
                        onChange={(e) => onUpdate(lang.language, { language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="English"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proficiency Level
                      </label>
                      <select
                        value={lang.fluency}
                        onChange={(e) => onUpdate(lang.language, { fluency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select level</option>
                        <option value="Native">Native</option>
                        <option value="Fluent">Fluent</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Basic">Basic</option>
                      </select>
                    </div>
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