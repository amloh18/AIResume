'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Save, RotateCcw, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Plus, Trash2, ToggleLeft, ToggleRight,
  AlertTriangle, Info,
} from 'lucide-react';

interface IngestionSettings {
  linkedin: {
    enabled: boolean;
    debug: boolean;
    dryRun: boolean;
    maxSearchesPerRun: number;
    maxPagesPerSearch: number;
    maxJobsPerSearch: number;
    maxRuntimeSeconds: number;
    regionStrategy: string;
    regions: string[];
    maxRegionsPerRun: number;
    defaultKeyword: string;
    browserProfileDir: string;
  };
  adzuna: {
    maxPagesPerRun: number;
    rateLimitMs: number;
  };
  jobspy: {
    sites: string[];
    searchTerm: string;
    location: string;
    resultsWanted: number;
    hoursOld: number;
  };
  sources: Record<string, {
    enabled: boolean;
    maxResults: number;
    maxDurationMs: number;
    refreshIntervalMs: number;
    cooldownMs: number;
  }>;
  companies: {
    greenhouse: Array<{ token: string; name: string }>;
    lever: string[];
    ashby: string[];
    workday: Array<{ tenant: string; site: string; name: string }>;
  };
  baselineEnabled: boolean;
  concurrency: number;
  retryMaxAttempts: number;
  retryBaseDelayMs: number;
}

type Section = 'linkedin' | 'adzuna' | 'jobspy' | 'sources' | 'companies' | 'general';

const SECTION_LABELS: Record<Section, string> = {
  linkedin: 'LinkedIn Worker',
  adzuna: 'Adzuna',
  jobspy: 'JobSpy',
  sources: 'Source Schedules',
  companies: 'Company Lists',
  general: 'General',
};

export default function WorkerSettingsPanel() {
  const [settings, setSettings] = useState<IngestionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['general']));
  const [newRegion, setNewRegion] = useState('');
  const [newLeverCompany, setNewLeverCompany] = useState('');
  const [newAshbyCompany, setNewAshbyCompany] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/worker-settings');
      const data = await res.json();
      console.log('[WorkerSettings] Fetch response:', { status: res.status, hasSettings: !!data.settings, error: data.error });
      if (res.ok && data.settings) {
        setSettings(data.settings);
      } else {
        console.error('[WorkerSettings] Fetch failed:', data.error || res.status);
      }
    } catch (err) {
      console.error('[WorkerSettings] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/worker-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      console.log('[WorkerSettings] Save response:', { status: res.status, success: data.success, error: data.error });
      if (!res.ok) {
        setResult({ success: false, message: data.error || `HTTP ${res.status}: Save failed` });
      } else {
        setResult({ success: true, message: data.message || 'Settings saved successfully' });
        if (data.settings) setSettings(data.settings);
      }
    } catch (err: any) {
      console.error('[WorkerSettings] Save error:', err);
      setResult({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!confirm('Reset all ingestion settings to defaults?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/worker-settings', { method: 'POST' });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || 'Reset to defaults' });
      if (data.settings) setSettings(data.settings);
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const update = (path: string, value: any) => {
    if (!settings) return;
    const keys = path.split('.');
    const newSettings = JSON.parse(JSON.stringify(settings));
    let obj: any = newSettings;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  };

  const toggleSection = (s: Section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  if (loading || !settings) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-sm text-white/60">Loading worker settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Ingestion Worker Settings
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Configure all worker parameters. Changes take effect immediately — no redeployment needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetSettings} disabled={saving}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all disabled:opacity-30">
            <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />Reset
          </button>
          <button onClick={saveSettings} disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all disabled:opacity-30">
            {saving ? <Loader2 className="w-3.5 h-3.5 inline mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 inline mr-1.5" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-xl border p-3 flex items-center gap-2 text-sm ${result.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
            {result.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {result.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info banner */}
      <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3 flex items-start gap-2 text-xs text-blue-400/80">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Adzuna API keys</strong> (ADZUNA_APP_ID, ADZUNA_APP_KEY) remain in environment variables for security.
          All other settings below are stored in MongoDB and apply instantly.
        </div>
      </div>

      {/* Sections */}
      {(['general', 'linkedin', 'adzuna', 'jobspy', 'sources', 'companies'] as Section[]).map(section => (
        <SectionPanel
          key={section}
          section={section}
          expanded={expandedSections.has(section)}
          onToggle={() => toggleSection(section)}
          settings={settings}
          update={update}
          newRegion={newRegion} setNewRegion={setNewRegion}
          newLeverCompany={newLeverCompany} setNewLeverCompany={setNewLeverCompany}
          newAshbyCompany={newAshbyCompany} setNewAshbyCompany={setNewAshbyCompany}
        />
      ))}
    </div>
  );
}

// ── Section Panel ──────────────────────────────────────────────────────────

function SectionPanel({ section, expanded, onToggle, settings, update, newRegion, setNewRegion, newLeverCompany, setNewLeverCompany, newAshbyCompany, setNewAshbyCompany }: {
  section: Section; expanded: boolean; onToggle: () => void;
  settings: IngestionSettings; update: (path: string, value: any) => void;
  newRegion: string; setNewRegion: (v: string) => void;
  newLeverCompany: string; setNewLeverCompany: (v: string) => void;
  newAshbyCompany: string; setNewAshbyCompany: (v: string) => void;
}) {
  return (
    <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
        <span className="text-sm font-bold text-white">{SECTION_LABELS[section]}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      {expanded && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="px-4 pb-4 space-y-4">
          {section === 'general' && <GeneralSection settings={settings} update={update} />}
          {section === 'linkedin' && <LinkedInSection settings={settings.linkedin} update={(k, v) => update(`linkedin.${k}`, v)}
            newRegion={newRegion} setNewRegion={setNewRegion} />}
          {section === 'adzuna' && <AdzunaSection settings={settings.adzuna} update={(k, v) => update(`adzuna.${k}`, v)} />}
          {section === 'jobspy' && <JobSpySection settings={settings.jobspy} update={(k, v) => update(`jobspy.${k}`, v)} />}
          {section === 'sources' && <SourcesSection settings={settings.sources} update={(k, v) => update(`sources.${k}`, v)} />}
          {section === 'companies' && <CompaniesSection settings={settings.companies} update={(k, v) => update(`companies.${k}`, v)}
            newLeverCompany={newLeverCompany} setNewLeverCompany={setNewLeverCompany}
            newAshbyCompany={newAshbyCompany} setNewAshbyCompany={setNewAshbyCompany} />}
        </motion.div>
      )}
    </div>
  );
}

// ── Field Components ───────────────────────────────────────────────────────

function Toggle({ label, value, onChange, helpText }: { label: string; value: boolean; onChange: (v: boolean) => void; helpText?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="text-sm text-white/80">{label}</span>
        {helpText && <p className="text-[11px] text-white/30 mt-0.5">{helpText}</p>}
      </div>
      <button onClick={() => onChange(!value)} className="shrink-0">
        {value ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-white/30" />}
      </button>
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, unit }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white/80">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" value={value} min={min} max={max}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs text-right font-mono focus:outline-none focus:border-emerald-500/40" />
        {unit && <span className="text-[11px] text-white/30 w-12">{unit}</span>}
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white/80">{label}</span>
      <input type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-48 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/40" />
    </div>
  );
}

function TagList({ label, tags, onAdd, onRemove, placeholder }: { label: string; tags: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  return (
    <div className="py-2">
      <span className="text-sm text-white/80 block mb-2">{label}</span>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
            {tag}
            <button onClick={() => onRemove(i)} className="hover:text-white"><Trash2 className="w-3 h-3" /></button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-[11px] text-white/20 italic">None</span>}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} placeholder={placeholder || 'Add...'}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onAdd(input.trim()); setInput(''); } }}
          className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/40" />
        <button onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(''); } }}
          className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Section: General ───────────────────────────────────────────────────────

function GeneralSection({ settings, update }: { settings: IngestionSettings; update: (p: string, v: any) => void }) {
  return (
    <div className="space-y-1">
      <Toggle label="Baseline Ingestion Enabled" value={settings.baselineEnabled} onChange={v => update('baselineEnabled', v)}
        helpText="Enable/disable the periodic ingestion scheduler" />
      <NumberInput label="Worker Concurrency" value={settings.concurrency} onChange={v => update('concurrency', v)} min={1} max={10} unit="workers" />
      <NumberInput label="Retry Max Attempts" value={settings.retryMaxAttempts} onChange={v => update('retryMaxAttempts', v)} min={1} max={10} unit="attempts" />
      <NumberInput label="Retry Base Delay" value={settings.retryBaseDelayMs} onChange={v => update('retryBaseDelayMs', v)} min={500} max={30000} unit="ms" />
    </div>
  );
}

// ── Section: LinkedIn ──────────────────────────────────────────────────────

function LinkedInSection({ settings, update, newRegion, setNewRegion }: {
  settings: IngestionSettings['linkedin']; update: (k: string, v: any) => void;
  newRegion: string; setNewRegion: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Toggle label="Enabled" value={settings.enabled} onChange={v => update('enabled', v)} />
      <Toggle label="Debug Mode" value={settings.debug} onChange={v => update('debug', v)} />
      <Toggle label="Dry Run" value={settings.dryRun} onChange={v => update('dryRun', v)} helpText="Scrape but don't store results" />
      <NumberInput label="Max Searches Per Run" value={settings.maxSearchesPerRun} onChange={v => update('maxSearchesPerRun', v)} min={1} max={50} />
      <NumberInput label="Max Pages Per Search" value={settings.maxPagesPerSearch} onChange={v => update('maxPagesPerSearch', v)} min={1} max={10} />
      <NumberInput label="Max Jobs Per Search" value={settings.maxJobsPerSearch} onChange={v => update('maxJobsPerSearch', v)} min={10} max={1000} />
      <NumberInput label="Max Runtime" value={settings.maxRuntimeSeconds} onChange={v => update('maxRuntimeSeconds', v)} min={60} max={3600} unit="sec" />
      <TextInput label="Default Keyword" value={settings.defaultKeyword} onChange={v => update('defaultKeyword', v)} placeholder="software engineer" />
      <TextInput label="Browser Profile Dir" value={settings.browserProfileDir} onChange={v => update('browserProfileDir', v)} />
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-white/80">Region Strategy</span>
        <select value={settings.regionStrategy} onChange={e => update('regionStrategy', e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/40">
          <option value="rotation">Rotation</option>
          <option value="demand">Demand</option>
        </select>
      </div>
      <NumberInput label="Max Regions Per Run" value={settings.maxRegionsPerRun} onChange={v => update('maxRegionsPerRun', v)} min={1} max={20} />
      <TagList label="Regions" tags={settings.regions}
        onAdd={tag => update('regions', [...settings.regions, tag])}
        onRemove={i => update('regions', settings.regions.filter((_, j) => j !== i))}
        placeholder="e.g. US, GB, DE" />
    </div>
  );
}

// ── Section: Adzuna ────────────────────────────────────────────────────────

function AdzunaSection({ settings, update }: { settings: IngestionSettings['adzuna']; update: (k: string, v: any) => void }) {
  return (
    <div className="space-y-1">
      <NumberInput label="Max Pages Per Run" value={settings.maxPagesPerRun} onChange={v => update('maxPagesPerRun', v)} min={1} max={20} unit="pages" />
      <NumberInput label="Rate Limit Delay" value={settings.rateLimitMs} onChange={v => update('rateLimitMs', v)} min={200} max={10000} unit="ms" />
      <div className="flex items-start gap-2 mt-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-2 text-[11px] text-amber-400/70">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        API keys (ADZUNA_APP_ID, ADZUNA_APP_KEY) are stored in environment variables for security.
      </div>
    </div>
  );
}

// ── Section: JobSpy ────────────────────────────────────────────────────────

function JobSpySection({ settings, update }: { settings: IngestionSettings['jobspy']; update: (k: string, v: any) => void }) {
  return (
    <div className="space-y-1">
      <TextInput label="Search Term" value={settings.searchTerm} onChange={v => update('searchTerm', v)} placeholder="software engineer" />
      <TextInput label="Location" value={settings.location} onChange={v => update('location', v)} placeholder="United States" />
      <NumberInput label="Results Wanted" value={settings.resultsWanted} onChange={v => update('resultsWanted', v)} min={1} max={500} />
      <NumberInput label="Hours Old" value={settings.hoursOld} onChange={v => update('hoursOld', v)} min={1} max={720} unit="hours" />
      <TagList label="Sites" tags={settings.sites}
        onAdd={tag => update('sites', [...settings.sites, tag])}
        onRemove={i => update('sites', settings.sites.filter((_, j) => j !== i))}
        placeholder="e.g. indeed, linkedin" />
    </div>
  );
}

// ── Section: Source Schedules ──────────────────────────────────────────────

function SourcesSection({ settings, update }: { settings: IngestionSettings['sources']; update: (k: string, v: any) => void }) {
  const sourceNames = Object.keys(settings);
  return (
    <div className="space-y-3">
      {sourceNames.map(name => {
        const src = settings[name];
        if (!src) return null;
        return (
          <div key={name} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white/80 capitalize">{name}</span>
              <Toggle label="" value={src.enabled} onChange={v => update(`${name}.enabled`, v)} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <NumberInput label="Max Results" value={src.maxResults} onChange={v => update(`${name}.maxResults`, v)} min={10} max={5000} />
              <NumberInput label="Max Duration" value={Math.round(src.maxDurationMs / 60000)} onChange={v => update(`${name}.maxDurationMs`, v * 60000)} min={1} max={60} unit="min" />
              <NumberInput label="Refresh Interval" value={Math.round(src.refreshIntervalMs / 3600000)} onChange={v => update(`${name}.refreshIntervalMs`, v * 3600000)} min={1} max={48} unit="hrs" />
              <NumberInput label="Cooldown" value={Math.round(src.cooldownMs / 60000)} onChange={v => update(`${name}.cooldownMs`, v * 60000)} min={5} max={60} unit="min" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Company Lists ─────────────────────────────────────────────────

function CompaniesSection({ settings, update, newLeverCompany, setNewLeverCompany, newAshbyCompany, setNewAshbyCompany }: {
  settings: IngestionSettings['companies']; update: (k: string, v: any) => void;
  newLeverCompany: string; setNewLeverCompany: (v: string) => void;
  newAshbyCompany: string; setNewAshbyCompany: (v: string) => void;
}) {
  const [newGhToken, setNewGhToken] = useState('');
  const [newGhName, setNewGhName] = useState('');
  const [newWdTenant, setNewWdTenant] = useState('');
  const [newWdSite, setNewWdSite] = useState('');
  const [newWdName, setNewWdName] = useState('');

  return (
    <div className="space-y-4">
      {/* Greenhouse */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
        <span className="text-xs font-bold text-white/60 block mb-2">Greenhouse Companies ({settings.greenhouse.length})</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {settings.greenhouse.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              {c.name} ({c.token})
              <button onClick={() => update('greenhouse', settings.greenhouse.filter((_, j) => j !== i))} className="hover:text-white"><Trash2 className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newGhToken} onChange={e => setNewGhToken(e.target.value)} placeholder="token"
            className="w-24 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/40" />
          <input value={newGhName} onChange={e => setNewGhName(e.target.value)} placeholder="Company Name"
            className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/40" />
          <button onClick={() => { if (newGhToken.trim() && newGhName.trim()) { update('greenhouse', [...settings.greenhouse, { token: newGhToken.trim(), name: newGhName.trim() }]); setNewGhToken(''); setNewGhName(''); } }}
            className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Lever */}
      <TagList label={`Lever Companies (${settings.lever.length})`} tags={settings.lever}
        onAdd={tag => update('lever', [...settings.lever, tag])}
        onRemove={i => update('lever', settings.lever.filter((_, j) => j !== i))}
        placeholder="e.g. netflix" />

      {/* Ashby */}
      <TagList label={`Ashby Companies (${settings.ashby.length})`} tags={settings.ashby}
        onAdd={tag => update('ashby', [...settings.ashby, tag])}
        onRemove={i => update('ashby', settings.ashby.filter((_, j) => j !== i))}
        placeholder="e.g. notion" />

      {/* Workday */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
        <span className="text-xs font-bold text-white/60 block mb-2">Workday Tenants ({settings.workday.length})</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {settings.workday.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              {t.name} ({t.tenant}/{t.site})
              <button onClick={() => update('workday', settings.workday.filter((_, j) => j !== i))} className="hover:text-white"><Trash2 className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newWdTenant} onChange={e => setNewWdTenant(e.target.value)} placeholder="tenant"
            className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/40" />
          <input value={newWdSite} onChange={e => setNewWdSite(e.target.value)} placeholder="site"
            className="w-24 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/40" />
          <input value={newWdName} onChange={e => setNewWdName(e.target.value)} placeholder="Company Name"
            className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/40" />
          <button onClick={() => { if (newWdTenant.trim() && newWdSite.trim() && newWdName.trim()) { update('workday', [...settings.workday, { tenant: newWdTenant.trim(), site: newWdSite.trim(), name: newWdName.trim() }]); setNewWdTenant(''); setNewWdSite(''); setNewWdName(''); } }}
            className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
