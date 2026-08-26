'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, AlertCircle, CheckCircle2, Lightbulb, ArrowRight, FileSearch } from 'lucide-react';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { Skeleton } from '@/components/ui/Skeleton';
import { getCvScoreForDisplay } from '@/lib/utils/cv-scoring';

interface CvReportSidebarProps {
  cv: any;
  isOpen: boolean;
  onClose: () => void;
}

function cvId(cv: any): string {
  return String(cv?.id || cv?._id || '');
}

function cvAtsScore(cv: any): number {
  return Math.round(getCvScoreForDisplay(cv) || 0);
}

/** Same normalisation used by the CV Health panel on the dashboard. */
function buildMetrics(report: any, score: number) {
  const norm = (val: number, max: number) => Math.round(Math.min(100, Math.max(0, (val / max) * 100)));
  if (report) {
    return [
      { label: 'Formatting', value: norm(report.formatting ?? score, 15) },
      { label: 'Keywords', value: norm(report.quantification ?? report.keywords ?? 0, 20) },
      { label: 'Readability', value: norm(report.readability ?? score, 20) },
      { label: 'Impact', value: norm(report.impactVerbs ?? 0, 20) },
      { label: 'Skills', value: norm(report.completeness ?? 0, 25) },
    ];
  }
  if (score > 0) {
    return [
      { label: 'Formatting', value: Math.min(100, score + 4) },
      { label: 'Keywords', value: Math.max(30, score - 4) },
      { label: 'Readability', value: Math.min(100, score + 9) },
      { label: 'Impact', value: Math.max(25, score - 13) },
      { label: 'Skills', value: Math.min(100, score + 1) },
    ];
  }
  return [
    { label: 'Formatting', value: 0 },
    { label: 'Keywords', value: 0 },
    { label: 'Readability', value: 0 },
    { label: 'Impact', value: 0 },
    { label: 'Skills', value: 0 },
  ];
}

export default function CvReportSidebar({ cv, isOpen, onClose }: CvReportSidebarProps) {
  const router = useRouter();
  const [fullCv, setFullCv] = useState<any>(null);
  const [resolvedCvId, setResolvedCvId] = useState<string>('');

  // Render-time adjustment (React's documented pattern): whenever the target
  // CV changes or the sidebar opens, drop the previously loaded CV so the
  // skeleton shows until the fresh fetch lands. All other state updates
  // happen in async callbacks, keeping effects side-effect-only.
  const currentCvId = cv ? cvId(cv) : '';
  if (currentCvId && resolvedCvId !== currentCvId) {
    setResolvedCvId(currentCvId);
    setFullCv(null);
  }

  // Load the full CV (with report metadata) whenever the sidebar opens.
  useEffect(() => {
    if (!isOpen || !cv) return;
    const id = cvId(cv);
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authenticatedFetch(`/api/cvs/${id}`);
        const result = await res.json();
        if (!cancelled) {
          // Fall back to the summary CV so the sidebar always resolves out of
          // the loading state, even when the full fetch fails.
          setFullCv(result.success && result.data?.cv ? result.data.cv : cv);
        }
      } catch (err) {
        console.error('Failed to load CV report:', err);
        if (!cancelled) setFullCv(cv);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, cv]);

  const loading = isOpen && !!cv && fullCv === null;
  const analysis = fullCv?.metadata?.surgeonAnalysis || cv?.metadata?.surgeonAnalysis;
  const report = analysis?.scoreReport;
  const score = cvAtsScore(fullCv || cv);
  const metrics = useMemo(() => buildMetrics(report, score), [report, score]);
  const hasReport = !!report || score > 0;

  const tone = score >= 80 ? 'Good score' : score >= 60 ? 'Decent score' : 'Needs work';
  const toneCls =
    score >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : score >= 60
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400';

  const strengths: any[] = report?.strengths || analysis?.strengths || [];
  const gaps: any[] = report?.gaps || analysis?.gaps || [];
  const actions: any[] = report?.actions || analysis?.actions || [];

  const fixInEditor = () => {
    const id = cvId(fullCv || cv);
    onClose();
    router.push(`/editor?mode=edit&cvId=${id}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="cv-report-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          <motion.aside
            key="cv-report-panel"
            initial={{ x: 'calc(100% + 12px)' }}
            animate={{ x: 0 }}
            exit={{ x: 'calc(100% + 12px)' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-label="CV analysis report"
            className="fixed right-3 top-3 bottom-3 w-[min(26rem,calc(100vw-1.5rem))] bg-white dark:bg-[#141810] shadow-2xl z-[9999] flex flex-col rounded-2xl overflow-hidden border border-[var(--border-primary)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)] flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text-primary)] leading-snug">CV Analysis Report</h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)] truncate">{cv?.title || 'Untitled CV'}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -m-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shrink-0"
                aria-label="Close report"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {loading ? (
                <div className="space-y-4" aria-hidden="true">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="space-y-2.5 pt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-1 flex-1 rounded-full" />
                        <Skeleton className="h-3 w-9" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : !hasReport ? (
                <div className="py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    <FileSearch size={22} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">No analysis yet</h3>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Run an ATS analysis on this CV in the editor to see its full report here.
                  </p>
                  <button
                    onClick={fixInEditor}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-black transition-all hover:brightness-110"
                  >
                    Run analysis in editor <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Score block */}
                  <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 text-4xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                        {score > 0 ? `${score}%` : '—'}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${toneCls}`}>{tone}</div>
                        {report?.verdict ? (
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{report.verdict}</p>
                        ) : (
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {score >= 80
                              ? 'Strong CV — keep refining to stay ahead.'
                              : score > 0
                                ? 'Keep improving — small fixes can move the needle.'
                                : 'Run an analysis to see the breakdown.'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Category metrics */}
                    <div className="mt-4 space-y-2.5">
                      {metrics.map((m) => (
                        <div key={m.label} className="flex items-center gap-2.5">
                          <span className="w-20 text-xs text-[var(--text-secondary)] shrink-0">{m.label}</span>
                          <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${Math.min(100, m.value)}%` }} />
                          </div>
                          <span className="w-9 text-right text-xs font-medium text-[var(--text-primary)] tabular-nums shrink-0">{m.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  {strengths.length > 0 && (
                    <section>
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={13} /> Strengths
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {strengths.slice(0, 5).map((s: any, i: number) => (
                          <li key={i} className="rounded-lg border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/5 px-3 py-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{s.title || s.label}</p>
                            {s.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">{s.detail}</p>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Gaps */}
                  {gaps.length > 0 && (
                    <section>
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <AlertCircle size={13} /> Gaps
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {gaps.slice(0, 6).map((g: any, i: number) => (
                          <li key={i} className="rounded-lg border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-[var(--text-primary)]">{g.title || g.label}</p>
                              {g.severity && (
                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${g.severity === 'blocker' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}`}>
                                  {g.severity}
                                </span>
                              )}
                            </div>
                            {g.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">{g.detail}</p>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Actions */}
                  {actions.length > 0 && (
                    <section>
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        <Lightbulb size={13} /> Recommended actions
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {actions.slice(0, 6).map((a: any, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-[var(--border-primary)] px-3 py-2">
                            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 text-[10px] font-bold">
                              {a.step || i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[var(--text-primary)]">{a.title}</p>
                              {a.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">{a.detail}</p>}
                              {(a.impact || a.effort) && (
                                <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                                  {a.impact && `Impact: ${a.impact}`}
                                  {a.impact && a.effort && ' · '}
                                  {a.effort && `Effort: ${a.effort}`}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {strengths.length === 0 && gaps.length === 0 && actions.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[var(--border-primary)] px-4 py-6 text-center">
                      <TrendingUp size={18} className="mx-auto text-[var(--text-secondary)]" />
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        Detailed strengths, gaps and actions appear here after a full analysis run.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer CTA */}
            {hasReport && (
              <div className="border-t border-[var(--border-primary)] px-5 py-3.5 flex-shrink-0">
                <button
                  onClick={fixInEditor}
                  className="group inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#013f2e] px-4 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:brightness-110 hover:shadow-md hover:shadow-lime-400/20"
                >
                  Fix in editor
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
