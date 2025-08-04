'use client';

import React, { useState } from 'react';
import { TiptapEditor } from '../../components/cv-studio/TiptapEditor';

export default function TestTiptapSimplePage() {
  const [content, setContent] = useState('<p>This is a <strong>test</strong> with <em>formatting</em>.</p>');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Simple Tiptap Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Rich Text Editor:</h2>
          <TiptapEditor
            value={content}
            onChange={setContent}
            placeholder="Start typing..."
          />
          
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Current HTML:</h3>
            <pre className="text-sm bg-white p-2 rounded border">{content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
} 