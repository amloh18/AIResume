'use client';

import React, { useState } from 'react';
import { Zap, Settings, Target, MapPin, Clock, FileText, Plus, X, Save, AlertCircle } from 'lucide-react';

interface AutoApplySettings {
  enabled: boolean;
  targetRoles: string[];
  locations: string[];
  remoteOnly: boolean;
  maxPerHour: number;
  maxPerDay: number;
  useCoverLetter: boolean;
  useTailoredCV: boolean;
}

interface AutoApplyPanelProps {
  userId?: string;
  region?: 'UK' | 'India';
}

export function AutoApplyPanel({ userId, region = 'UK' }: AutoApplyPanelProps) {
  const [settings, setSettings] = useState<AutoApplySettings>({
    enabled: false,
    targetRoles: [],
    locations: ['UK'],
    remoteOnly: true,
    maxPerHour: 5,
    maxPerDay: 10,
    useCoverLetter: true,
    useTailoredCV: true,
  });
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Save settings to API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addRole = () => {
    if (newRole.trim() && !settings.targetRoles.includes(newRole.trim())) {
      setSettings(prev => ({
        ...prev,
        targetRoles: [...prev.targetRoles, newRole.trim()],
      }));
      setNewRole('');
    }
  };

  const removeRole = (index: number) => {
    setSettings(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.filter((_, i) => i !== index),
    }));
  };

  const toggleLocation = (loc: string) => {
    setSettings(prev => ({
      ...prev,
      locations: prev.locations.includes(loc)
        ? prev.locations.filter(l => l !== loc)
        : [...prev.locations, loc],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              settings.enabled 
                ? 'bg-lime-100 dark:bg-lime-900/30' 
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Zap className={`w-6 h-6 ${
                settings.enabled 
                  ? 'text-lime-600 dark:text-lime-400' 
                  : 'text-gray-400'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Auto-Apply
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically apply to jobs that match your preferences
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              settings.enabled ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
              settings.enabled ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        {settings.enabled && (
          <div className="mt-4 p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
            <div className="flex items-center gap-2 text-lime-700 dark:text-lime-300">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">
                Auto-apply is active. Jobs matching your criteria will be applied automatically.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Settings Form */}
      {settings.enabled && (
        <div className="space-y-4">
          {/* Target Roles */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">Target Roles</h4>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.targetRoles.map((role, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-full text-sm"
                >
                  {role}
                  <button 
                    onClick={() => removeRole(index)}
                    className="ml-1 hover:text-lime-900 dark:hover:text-lime-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add role..."
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRole()}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-full bg-transparent focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add roles like "Software Engineer", "Product Manager", "Data Analyst"
            </p>
          </div>

          {/* Locations */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">Locations</h4>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['UK', 'India'].map((loc) => (
                <button
                  key={loc}
                  onClick={() => toggleLocation(loc)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    settings.locations.includes(loc)
                      ? 'bg-lime-500 text-black border-lime-500'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-lime-500'
                  }`}
                >
                  {loc === 'UK' ? '🇬🇧 United Kingdom' : '🇮🇳 India'}
                </button>
              ))}
            </div>
          </div>

          {/* Application Limits */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">Application Limits</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Per Hour
                </label>
                <input
                  type="number"
                  value={settings.maxPerHour}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxPerHour: Math.min(50, Math.max(1, Number(e.target.value))) 
                  }))}
                  min={1}
                  max={50}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a230f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Per Day
                </label>
                <input
                  type="number"
                  value={settings.maxPerDay}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxPerDay: Math.min(100, Math.max(1, Number(e.target.value))) 
                  }))}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a230f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
              </div>
            </div>
          </div>

          {/* CV & Cover Letter Options */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">Application Documents</h4>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useTailoredCV}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    useTailoredCV: e.target.checked 
                  }))}
                  className="w-5 h-5 text-lime-500 rounded focus:ring-lime-500"
                />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Tailor CV for each job</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Customize your CV based on job requirements
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useCoverLetter}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    useCoverLetter: e.target.checked 
                  }))}
                  className="w-5 h-5 text-lime-500 rounded focus:ring-lime-500"
                />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Generate cover letter</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically create a personalized cover letter
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-lime-500 hover:bg-lime-600 disabled:bg-lime-500/50 text-black font-medium rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Save className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Not Enabled State */}
      {!settings.enabled && (
        <div className="text-center py-12 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Auto-Apply is disabled
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Enable auto-apply to automatically submit applications to jobs that match your preferences. 
            Set your target roles, locations, and limits above.
          </p>
          <button
            onClick={() => setSettings(prev => ({ ...prev, enabled: true }))}
            className="px-6 py-2.5 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors"
          >
            Enable Auto-Apply
          </button>
        </div>
      )}
    </div>
  );
}

export default AutoApplyPanel;
