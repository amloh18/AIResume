'use client';

import React, { useState } from 'react';
import { Certification } from '@/lib/stores/cvStore';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface CertificationsFormProps {
  certifications: Certification[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Certification>) => void;
}

const CertificationsForm: React.FC<CertificationsFormProps> = ({
  certifications,
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
        <h2 className="text-lg font-semibold text-gray-900">Certifications</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Certification
        </button>
      </div>

      {certifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No certifications added yet.</p>
          <p className="text-sm">Click "Add Certification" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certifications.map((cert, index) => (
            <div key={cert.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  Certification #{index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpanded(cert.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedItems.has(cert.id) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(cert.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove certification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedItems.has(cert.id) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certification Name *
                    </label>
                    <input
                      type="text"
                      value={cert.name}
                      onChange={(e) => onUpdate(cert.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="AWS Certified Solutions Architect"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issuing Organization *
                    </label>
                    <input
                      type="text"
                      value={cert.issuer}
                      onChange={(e) => onUpdate(cert.id, { issuer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Amazon Web Services"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Issue Date
                      </label>
                      <input
                        type="date"
                        value={cert.date}
                        onChange={(e) => onUpdate(cert.id, { date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={cert.expiryDate}
                        onChange={(e) => onUpdate(cert.id, { expiryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate URL
                    </label>
                    <input
                      type="url"
                      value={cert.url}
                      onChange={(e) => onUpdate(cert.id, { url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://verify.aws.com/certificate/..."
                    />
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

export default CertificationsForm; 