'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DocumentService } from '@/lib/services/document-service';
import { ISectionContent, ISectionBlueprint } from '@/models';

interface FlexibleDocumentEditorProps {
  documentId?: string;
  templateId?: string;
  onSave?: (document: any) => void;
}

interface SectionEditorProps {
  section: ISectionContent;
  blueprint: ISectionBlueprint;
  onUpdate: (sectionKey: string, items: any[], styles?: any) => void;
  onRemove: (sectionKey: string) => void;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  blueprint,
  onUpdate,
  onRemove
}) => {
  const [items, setItems] = useState(section.items);
  const [isEditing, setIsEditing] = useState(false);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, blueprint.defaultItemContent]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const saveChanges = () => {
    onUpdate(section.sectionKey, items);
    setIsEditing(false);
  };

  const cancelChanges = () => {
    setItems(section.items);
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {blueprint.displayName}
        </h3>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={saveChanges}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={cancelChanges}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => onRemove(section.sectionKey)}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border rounded p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Item {index + 1}</h4>
                {blueprint.isList && items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {Object.keys(blueprint.defaultItemContent).map((field) => (
                <div key={field} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                  {Array.isArray(item[field]) ? (
                    <textarea
                      value={item[field].join(', ')}
                      onChange={(e) => handleItemChange(index, field, e.target.value.split(',').map(s => s.trim()))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter ${field} separated by commas`}
                    />
                  ) : typeof item[field] === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={item[field]}
                      onChange={(e) => handleItemChange(index, field, e.target.checked)}
                      className="mr-2"
                    />
                  ) : (
                    <input
                      type="text"
                      value={item[field] || ''}
                      onChange={(e) => handleItemChange(index, field, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Enter ${field}`}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          
          {blueprint.isList && (
            <button
              onClick={addItem}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
            >
              + Add {blueprint.displayName}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="text-sm text-gray-700">
              {Object.entries(item).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="font-medium">{key}:</span>{' '}
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FlexibleDocumentEditor: React.FC<FlexibleDocumentEditorProps> = ({
  documentId,
  templateId,
  onSave
}) => {
  const { data: session } = useSession();
  const [document, setDocument] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableSections, setAvailableSections] = useState<ISectionBlueprint[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');

  useEffect(() => {
    if (documentId) {
      loadDocument();
    } else if (templateId) {
      loadTemplate();
    }
  }, [documentId, templateId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to load document');
      
      const data = await response.json();
      setDocument(data.document);
      setTemplate(data.document.template);
      setAvailableSections(data.document.template.availableSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) throw new Error('Failed to load template');
      
      const data = await response.json();
      setTemplate(data.template);
      setAvailableSections(data.template.availableSections);
      
      // Create new document
      const newDocResponse = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          title: 'New Document',
          description: ''
        })
      });
      
      if (!newDocResponse.ok) throw new Error('Failed to create document');
      
      const newDocData = await newDocResponse.json();
      setDocument(newDocData.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const addSection = async (sectionKey: string) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey })
      });
      
      if (!response.ok) throw new Error('Failed to add section');
      
      const data = await response.json();
      setDocument(data.document);
      setSelectedSection('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add section');
    }
  };

  const updateSection = async (sectionKey: string, items: any[], styles?: any) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/sections/${sectionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, styles })
      });
      
      if (!response.ok) throw new Error('Failed to update section');
      
      const data = await response.json();
      setDocument(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update section');
    }
  };

  const removeSection = async (sectionKey: string) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/sections/${sectionKey}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to remove section');
      
      const data = await response.json();
      setDocument(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove section');
    }
  };

  const saveDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.title,
          description: document.description,
          content: document.content,
          status: 'draft'
        })
      });
      
      if (!response.ok) throw new Error('Failed to save document');
      
      const data = await response.json();
      setDocument(data.document);
      onSave?.(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-16 h-16 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  if (!document || !template) {
    return <div className="text-gray-600 p-4">No document or template found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {document.title}
        </h1>
        <p className="text-gray-600 mb-4">
          Template: {template.name} ({template.category})
        </p>
        
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={document.title}
            onChange={(e) => setDocument({ ...document, title: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Document title"
          />
          <button
            onClick={saveDocument}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>

      {/* Add Section Panel */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Add Section</h2>
        <div className="flex gap-2 flex-wrap">
          {availableSections.map((section) => {
            const exists = document.content.some((s: ISectionContent) => s.sectionKey === section.key);
            return (
              <button
                key={section.key}
                onClick={() => addSection(section.key)}
                disabled={exists && !section.isList}
                className={`px-3 py-1 rounded text-sm ${
                  exists && !section.isList
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                title={section.description}
              >
                {section.displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Content */}
      <div className="space-y-4">
        {document.content.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No sections added yet. Use the panel above to add sections to your document.</p>
          </div>
        ) : (
          document.content.map((section: ISectionContent) => {
            const blueprint = availableSections.find(s => s.key === section.sectionKey);
            if (!blueprint) return null;
            
            return (
              <SectionEditor
                key={section.sectionKey}
                section={section}
                blueprint={blueprint}
                onUpdate={updateSection}
                onRemove={removeSection}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default FlexibleDocumentEditor; 