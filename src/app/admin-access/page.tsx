'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

const AdminAccessPage: React.FC = () => {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const makeAdmin = async () => {
    if (!email) {
      setMessage('Please enter an email address');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/make-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setEmail('');
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to make user admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Make User Admin</h1>
        
        {session ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={makeAdmin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Making Admin...' : 'Make Admin'}
            </button>
            
            {message && (
              <div className={`p-3 rounded-md ${
                message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}
            
            <div className="text-sm text-gray-600">
              <p>Current user: {session.user?.email}</p>
              <p>Role: {session.user?.role || 'user'}</p>
              <p>User ID: {session.user?.id}</p>
            </div>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/check-role');
                  const data = await response.json();
                  console.log('Role check data:', data);
                  alert(`Session role: ${data.sessionUser.role}\nDatabase role: ${data.databaseUser.role}\nMatch: ${data.roleMatch}`);
                } catch (error) {
                  console.error('Error checking role:', error);
                }
              }}
              className="w-full mt-4 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Check Role Status
            </button>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/refresh-session', { method: 'POST' });
                  const data = await response.json();
                  console.log('Session refresh data:', data);
                  if (data.needsRefresh) {
                    alert(`Session needs refresh!\nSession role: ${data.sessionRole}\nDatabase role: ${data.databaseRole}\n\nPlease log out and log back in.`);
                  } else {
                    alert(`Session is up to date!\nRole: ${data.sessionRole}`);
                  }
                } catch (error) {
                  console.error('Error refreshing session:', error);
                }
              }}
              className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Check Session Status
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAccessPage; 