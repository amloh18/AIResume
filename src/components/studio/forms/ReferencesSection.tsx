'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface ReferencesSectionProps {
  data: any[];
  onUpdate: (path: string, value: any) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const ReferencesSection: React.FC<ReferencesSectionProps> = ({
  data,
  onUpdate,
  onAdd,
  onRemove
}) => {
  const themeClasses = getThemeClasses;
  
  // Ensure we have proper data structure
  const safeData = Array.isArray(data) ? data : [];

  const addReference = () => {
    const newReference = {
      name: '',
      reference: ''
    };
    onUpdate('references', [...safeData, newReference]);
  };

  const removeReference = (index: number) => {
    const updatedData = safeData.filter((_, i) => i !== index);
    onUpdate('references', updatedData);
  };

  const updateReference = (index: number, field: string, value: any) => {
    const updatedData = [...safeData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    onUpdate('references', updatedData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          References
        </h3>
        <motion.button
          onClick={addReference}
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add Reference
        </motion.button>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No references added yet</p>
          <p className="text-sm">Click "Add Reference" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeData.map((reference, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Reference #{index + 1}
                </h4>
                <button
                  onClick={() => removeReference(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <ProfessionalTextField
                  label="Reference Name"
                  value={reference.name || ''}
                  onChange={(value) => updateReference(index, 'name', value)}
                  placeholder="e.g., Dr. John Smith, Sarah Johnson"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference Details
                  </label>
                  <textarea
                    value={reference.reference || ''}
                    onChange={(e) => updateReference(index, 'reference', e.target.value)}
                    placeholder="Include: Name, Title, Company, Phone, Email, Relationship"
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                    rows={4}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferencesSection;
