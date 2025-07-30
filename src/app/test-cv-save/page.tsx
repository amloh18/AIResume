'use client';

import React, { useState, useEffect } from 'react';

export default function TestCVSave() {
  const [userId, setUserId] = useState('6889b151d17daa1eaee91a5c');
  const [cvId, setCvId] = useState('');
  const [cvs, setCvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load CVs for the user
  const loadCVs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cvs?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setCvs(result.data.data);
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
      setMessage('Error loading CVs');
    } finally {
      setLoading(false);
    }
  };

  // Create a new CV
  const createCV = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cvs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title: `Test CV ${Date.now()}`,
          templateName: 'ATS Friendly Finance CV',
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('CV created successfully!');
        setCvId(result.data.cv.id);
        loadCVs();
      } else {
        setMessage('Error creating CV');
      }
    } catch (error) {
      console.error('Error creating CV:', error);
      setMessage('Error creating CV');
    } finally {
      setLoading(false);
    }
  };

  // Save CV data
  const saveCVData = async () => {
    if (!cvId) {
      setMessage('Please create or select a CV first');
      return;
    }

    try {
      setLoading(true);
      const testData = {
        personal_info: {
          name: "Test User",
          contact0: "+1 234 567 8900",
          contact1: "test@example.com",
          contact2: "linkedin.com/in/testuser",
          summary: "This is a test CV created to demonstrate the saving functionality."
        },
        education: {
          education_0_title: "Bachelor of Science",
          education_0_company: "Test University",
          education_0_duration: "2018 - 2022",
          education_0_detail_0: "Graduated with honors"
        }
      };

      const response = await fetch(`/api/cvs/${cvId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          cvData: testData,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('CV data saved successfully!');
        loadCVs();
      } else {
        setMessage('Error saving CV data');
      }
    } catch (error) {
      console.error('Error saving CV data:', error);
      setMessage('Error saving CV data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCVs();
  }, [userId]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">CV Save Test Page</h1>
        
        {/* User ID Input */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">User Configuration</h2>
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">User ID:</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={loadCVs}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Load CVs
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={createCV}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create New CV'}
            </button>
            <button
              onClick={saveCVData}
              disabled={loading || !cvId}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Test Data'}
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <p className="text-gray-700">{message}</p>
          </div>
        )}

        {/* CV List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User CVs</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : cvs.length === 0 ? (
            <p className="text-gray-500">No CVs found. Create one to get started!</p>
          ) : (
            <div className="space-y-4">
              {cvs.map((cv) => (
                <div
                  key={cv.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    cvId === cv.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCvId(cv.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cv.title}</h3>
                      <p className="text-sm text-gray-600">
                        Status: {cv.status} | Version: {cv.version}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(cv.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Last Modified: {new Date(cv.metadata.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        ID: {cv.id.slice(-8)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Endpoints Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
          <div className="space-y-2 text-sm">
            <p><strong>GET /api/cvs?userId={userId}</strong> - List user's CVs</p>
            <p><strong>POST /api/cvs</strong> - Create new CV</p>
            <p><strong>GET /api/cvs/{cvId}/save?userId={userId}</strong> - Get CV data for editing</p>
            <p><strong>POST /api/cvs/{cvId}/save</strong> - Save CV data during editing</p>
            <p><strong>PUT /api/cvs/{cvId}</strong> - Update CV</p>
            <p><strong>DELETE /api/cvs/{cvId}?userId={userId}</strong> - Delete CV</p>
          </div>
        </div>
      </div>
    </div>
  );
} 