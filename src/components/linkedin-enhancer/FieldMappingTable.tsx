import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Edit2 } from 'lucide-react';

interface FieldMapping {
  cvField: string;
  linkedinField: string;
  status: 'synced' | 'different' | 'missing';
  cvValue?: string;
  linkedinValue?: string;
  editable?: boolean;
}

interface FieldMappingTableProps {
  mappings: FieldMapping[];
  onFieldUpdate?: (field: string, value: string) => void;
}

export default function FieldMappingTable({ mappings, onFieldUpdate }: FieldMappingTableProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = (field: string) => {
    onFieldUpdate?.(field, editValue);
    setEditingField(null);
  };

  const getStatusColor = (status: FieldMapping['status']) => {
    switch (status) {
      case 'synced':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'different':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
      case 'missing':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: FieldMapping['status']) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4" />;
      case 'different':
        return <AlertCircle className="w-4 h-4" />;
      case 'missing':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: FieldMapping['status']) => {
    switch (status) {
      case 'synced':
        return 'Synced';
      case 'different':
        return 'Different';
      case 'missing':
        return 'Missing';
      default:
        return 'Unknown';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
              <th className="px-4 py-3 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CV Field
              </th>
              <th className="px-4 py-3 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                LinkedIn Field
              </th>
              <th className="px-4 py-3 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CV Value
              </th>
              <th className="px-4 py-3 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                LinkedIn Value
              </th>
              <th className="px-4 py-3 text-right text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {mappings.map((mapping, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="text-small font-medium text-gray-900 dark:text-white">
                    {mapping.cvField}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-small text-gray-600 dark:text-gray-400">
                    {mapping.linkedinField}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-small font-medium ${getStatusColor(mapping.status)}`}>
                    {getStatusIcon(mapping.status)}
                    {getStatusLabel(mapping.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editingField === mapping.cvField ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-2 py-1 text-small border border-gray-300 dark:border-white/10 rounded bg-white dark:bg-black/20 text-gray-900 dark:text-white"
                      autoFocus
                    />
                  ) : (
                    <span className="text-small text-gray-900 dark:text-white">
                      {mapping.cvValue || '-'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-small text-gray-600 dark:text-gray-400">
                    {mapping.linkedinValue || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {mapping.editable && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (editingField === mapping.cvField) {
                          handleSave(mapping.cvField);
                        } else {
                          handleEdit(mapping.cvField, mapping.cvValue || '');
                        }
                      }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      {editingField === mapping.cvField ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      )}
                    </motion.button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {mappings.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No field mappings available</p>
        </div>
      )}
    </motion.div>
  );
}
