'use client';

import React, { useState } from 'react';
import { TiptapEditor } from '../../components/cv-studio/TiptapEditor';
import { EnhancedEditableField } from '../../components/layout/EnhancedEditableField';

export default function TestTiptapPage() {
  const [summary, setSummary] = useState('<p>This is a <strong>test summary</strong> with <em>rich text</em> formatting.</p>');
  const [name, setName] = useState('John Doe');
  const [description, setDescription] = useState('<p>This is a <strong>job description</strong> with <em>bullet points</em>:</p><ul><li>First bullet point</li><li>Second bullet point</li></ul>');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Tiptap Integration Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Simple Text Field (EditableField)</h2>
            <EnhancedEditableField
              value={name}
              onChange={setName}
              placeholder="Enter your name"
              templateId="modernProfessional"
              elementType="name"
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Rich Text Summary (TiptapEditor)</h2>
            <EnhancedEditableField
              value={summary}
              onChange={setSummary}
              placeholder="Enter your professional summary..."
              multiline={true}
              templateId="modernProfessional"
              elementType="summary"
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Rich Text Description (TiptapEditor)</h2>
            <EnhancedEditableField
              value={description}
              onChange={setDescription}
              placeholder="Enter job description..."
              multiline={true}
              templateId="modernProfessional"
              elementType="description"
            />
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Current Values:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Name:</strong> {name}
              </div>
              <div>
                <strong>Summary:</strong> 
                <div dangerouslySetInnerHTML={{ __html: summary }} />
              </div>
              <div>
                <strong>Description:</strong>
                <div dangerouslySetInnerHTML={{ __html: description }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 