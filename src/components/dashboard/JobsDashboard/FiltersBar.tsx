'use client';

import React, { useState } from 'react';
import type { JobsFilter, JobsMetrics } from '@/types/automation-schema';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface FiltersBarProps {
  filters: JobsFilter;
  onChange: (filters: Partial<JobsFilter>) => void;
  onReset: () => void;
  metrics: JobsMetrics | null;
}

export default function FiltersBar({
  filters,
  onChange,
  onReset,
  metrics,
}: FiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-4">
      {/* Search and Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job title, company..."
            value={filters.searchText || ''}
            onChange={(e) => onChange({ searchText: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="hidden sm:inline">Filters</span>
        </button>
        {Object.keys(filters).length > 2 && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-300 dark:border-gray-700">
          {/* Match Score Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Match Score Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={filters.matchScoreMin || 0}
                onChange={(e) =>
                  onChange({ matchScoreMin: parseInt(e.target.value) })
                }
                className="w-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.matchScoreMax || 100}
                onChange={(e) =>
                  onChange({ matchScoreMax: parseInt(e.target.value) })
                }
                className="w-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Companies */}
          {metrics && metrics.topCompanies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Companies
              </label>
              <select
                multiple
                value={filters.companies || []}
                onChange={(e) => {
                  const selected = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  onChange({ companies: selected });
                }}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm max-h-32"
              >
                {metrics.topCompanies.map((company) => (
                  <option key={company.company} value={company.company}>
                    {company.company} ({company.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Locations */}
          {metrics && metrics.topLocations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Locations
              </label>
              <select
                multiple
                value={filters.locations || []}
                onChange={(e) => {
                  const selected = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  onChange({ locations: selected });
                }}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm max-h-32"
              >
                {metrics.topLocations.map((location) => (
                  <option key={location.location} value={location.location}>
                    {location.location} ({location.count})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
