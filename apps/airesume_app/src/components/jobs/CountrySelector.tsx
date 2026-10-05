'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, Globe } from 'lucide-react';
import { COUNTRIES_LIST, type CountryOption } from '@/lib/config/job-constants';
import { chipState } from '@/components/ui/chip-styles';

export type { CountryOption };
export { COUNTRIES_LIST };

/**
 * Detect user's country code based on browser timezone
 */
export function detectUserCountry(): CountryOption {
  if (typeof Intl === 'undefined') return COUNTRIES_LIST[0]; // fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('Asia/Colombo')) {
      return COUNTRIES_LIST.find((c) => c.code === 'IN') || COUNTRIES_LIST[7];
    }
    if (tz.includes('Shanghai') || tz.includes('Beijing') || tz.includes('Chongqing') || tz.includes('Hong_Kong') || tz.includes('Taipei') || tz.includes('Urumqi')) {
      return COUNTRIES_LIST.find((c) => c.code === 'CN') || COUNTRIES_LIST[8];
    }
    if (tz.includes('London') || tz.includes('Belfast') || tz.includes('Europe/London')) {
      return COUNTRIES_LIST.find((c) => c.code === 'GB') || COUNTRIES_LIST[10];
    }
    if (tz.includes('America/New_York') || tz.includes('America/Los_Angeles') || tz.includes('America/Chicago') || tz.includes('America/Denver')) {
      return COUNTRIES_LIST.find((c) => c.code === 'US') || COUNTRIES_LIST[9];
    }
    if (tz.includes('America/Toronto') || tz.includes('America/Vancouver')) {
      return COUNTRIES_LIST.find((c) => c.code === 'CA') || COUNTRIES_LIST[12];
    }
    if (tz.includes('Europe/Berlin') || tz.includes('Europe/Frankfurt') || tz.includes('Europe/Paris') || tz.includes('Europe/Amsterdam')) {
      return COUNTRIES_LIST.find((c) => c.code === 'DE') || COUNTRIES_LIST[11];
    }
    if (tz.includes('Asia/Dubai')) {
      return COUNTRIES_LIST.find((c) => c.code === 'AE') || COUNTRIES_LIST[15];
    }
    if (tz.includes('Asia/Singapore')) {
      return COUNTRIES_LIST.find((c) => c.code === 'SG') || COUNTRIES_LIST[13];
    }
    if (tz.includes('Australia/Sydney') || tz.includes('Australia/Melbourne')) {
      return COUNTRIES_LIST.find((c) => c.code === 'AU') || COUNTRIES_LIST[14];
    }
    if (tz.includes('Asia/Tokyo')) {
      return COUNTRIES_LIST.find((c) => c.code === 'JP') || COUNTRIES_LIST[0];
    }
    if (tz.includes('Asia/Seoul')) {
      return COUNTRIES_LIST.find((c) => c.code === 'KR') || COUNTRIES_LIST[0];
    }
  } catch {
    // fallback
  }
  return COUNTRIES_LIST.find((c) => c.code === 'IN') || COUNTRIES_LIST[0];
}

interface CountrySelectorProps {
  value: string[]; // e.g. ['India'] or ['United Kingdom', 'India']
  onChange: (countries: string[]) => void;
  disabled?: boolean;
  align?: 'left' | 'right';
  variant?: 'default' | 'pill';
}

export function CountrySelector({ value, onChange, disabled, align = 'right', variant = 'default' }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleCountry = (countryName: string) => {
    if (value.includes(countryName)) {
      // Don't allow empty, fallback to Worldwide if last removed
      const updated = value.filter((c) => c !== countryName);
      onChange(updated.length > 0 ? updated : ['Worldwide / Remote']);
    } else {
      onChange([...value, countryName]);
    }
  };

  const handleSelectOnly = (countryName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([countryName]);
    setIsOpen(false);
  };

  const filteredCountries = useMemo(() => {
    return COUNTRIES_LIST.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.region.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const continents = useMemo(() => filteredCountries.filter((c) => c.isContinent), [filteredCountries]);
  const countriesOnly = useMemo(() => filteredCountries.filter((c) => !c.isContinent), [filteredCountries]);

  // Selected Country objects
  const selectedObjects = COUNTRIES_LIST.filter((c) => value.includes(c.name));
  const isPill = variant === 'pill';
  const isNonDefault = value.length > 0 && !value.includes('Worldwide / Remote');

  return (
    <div ref={dropdownRef} className="relative select-none">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={
          isPill
            ? `${chipState(
                disabled ? 'disabled' : isNonDefault ? 'active' : 'idle',
                'md'
              )} ${disabled ? '' : 'cursor-pointer'}`
            : `flex items-center gap-2 h-10 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ease-out border shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50 shadow-2xs ${
                isOpen
                  ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border-[#013f2e] dark:border-lime-500 ring-2 ring-lime-500/20'
                  : 'bg-white dark:bg-[#141810] border-gray-200/90 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.985] hover:scale-[1.015]'}`
        }
      >
        <div className="flex items-center gap-1.5">
          {selectedObjects.length === 1 ? (
            <>
              <span className="text-xs shrink-0">{selectedObjects[0].flag}</span>
              <span className="truncate max-w-[90px] sm:max-w-[160px] md:max-w-none">{selectedObjects[0].name}</span>
            </>
          ) : selectedObjects.length > 1 ? (
            <>
              <div className="flex items-center -space-x-1">
                {selectedObjects.slice(0, 3).map((c) => (
                  <span key={c.code} className="text-xs">
                    {c.flag}
                  </span>
                ))}
              </div>
              <span>{selectedObjects.length} Locations</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 opacity-70" />
              <span>Region</span>
            </>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] p-2.5 animate-fadeIn space-y-2`}
        >
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country, continent (e.g. Europe, Asia, China)..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-lime-500"
            />
          </div>

          {/* List of Continents & Countries */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {/* Continents & Regions */}
            {continents.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-0.5">
                  Continents & Macro Regions
                </div>
                {continents.map((c) => {
                  const isSelected = value.includes(c.name);
                  return (
                    <div
                      key={c.code}
                      onClick={() => handleToggleCountry(c.name)}
                      className={`group px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-lime-500/15 text-lime-800 dark:text-lime-300 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-lime-500 border-lime-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleSelectOnly(c.name, e)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-lime-600 font-medium px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                      >
                        Only
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Specific Countries */}
            {countriesOnly.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-0.5 pt-1">
                  Countries
                </div>
                {countriesOnly.map((c) => {
                  const isSelected = value.includes(c.name);
                  return (
                    <div
                      key={c.code}
                      onClick={() => handleToggleCountry(c.name)}
                      className={`group px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-lime-500/10 text-lime-800 dark:text-lime-300 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-lime-500 border-lime-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleSelectOnly(c.name, e)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-lime-600 font-medium px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                      >
                        Only
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Quick Actions */}
          <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] px-1">
            <button
              type="button"
              onClick={() => onChange(COUNTRIES_LIST.map((c) => c.name))}
              className="text-gray-500 hover:text-lime-600 font-medium"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => onChange(['Worldwide / Remote'])}
              className="text-lime-600 dark:text-lime-400 font-semibold hover:underline"
            >
              Reset to Worldwide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CountrySelector;
