'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth'
import { ResumeEnhancerProvider } from '@/contexts/ResumeEnhancerContext'
import { JobJourneyProvider } from '@/contexts/JobJourneyContext'
import { ATSProvider } from '@/contexts/ATSContext'
import { DashboardDataProvider } from '@/contexts/DashboardDataContext'
import ResumeEnhancerContainer from '@/components/resume-enhancer/ResumeEnhancerContainer'
import RouteGuard from '@/components/auth/RouteGuard'
import { geistFont } from '@/lib/fonts'
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext'
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react'

function SyncIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-white text-xs shadow-lg">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Syncing workspace…
    </div>
  )
}

function ResumeEnhancerPageContent() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth()
  const searchParams = useSearchParams()

  const typeParam = searchParams.get('type')
  const rawModeParam = searchParams.get('mode')
  const rawCvId = searchParams.get('cvId')
  const rawJourneyId = searchParams.get('journeyId') || searchParams.get('jobJourneyId')
  const normalizedLegacyMode =
    rawModeParam === 'cvedit'
      ? (rawJourneyId ? 'journey' : 'edit')
      : rawModeParam === 'cledit'
        ? 'edit-cover-letter'
        : (rawModeParam === 'improve' || rawModeParam === 'mode-improve')
          ? 'edit-master'
          : rawModeParam

  let mode: 'create' | 'edit' | 'edit-master' | 'journey' | 'edit-cover-letter' | 'create-cover-letter' =
    (normalizedLegacyMode === 'edit' || normalizedLegacyMode === 'edit-master' || normalizedLegacyMode === 'journey' || normalizedLegacyMode === 'edit-cover-letter' || normalizedLegacyMode === 'create-cover-letter')
      ? normalizedLegacyMode
      : 'create'

  const rawClId = searchParams.get('clId') || searchParams.get('coverLetterId')
  const clId = (rawClId && rawClId !== 'undefined') ? rawClId : undefined
  const cvId = (rawCvId && rawCvId !== 'undefined') ? rawCvId : undefined
  const journeyId = (rawJourneyId && rawJourneyId !== 'undefined') ? rawJourneyId : undefined
  const restoreDraftParam = searchParams.get('restoreDraft') === 'true' || searchParams.get('resumeDraft') === 'true'

  if (typeParam === 'cv' && cvId && mode === 'create') mode = 'edit'
  if ((typeParam === 'cl' || clId) && mode === 'create') mode = 'edit-cover-letter'

  const docParam = searchParams.get('doc')

  const isGuestMode = !isAuthenticated && ((mode === 'create' || restoreDraftParam) && (!cvId || cvId === 'guest-draft') && !clId && !journeyId)
  const restoreDraft = restoreDraftParam

  const [hydrated, setHydrated] = useState(false)
  const [isHydrating, setIsHydrating] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromOnboarding = searchParams.get('fromOnboarding') === 'true'
      if (fromOnboarding) {
        sessionStorage.setItem('fromOnboarding', 'true')
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    // Set a safety timeout of 15 seconds to prevent infinite hang on network/db drops
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('⚠️ Workspace sync timed out (15s limit reached).');
        setSyncError('Polar Gateway Timeout: Workspace synchronization is taking too long. This typically means the local database or gateway service is offline.')
        setIsHydrating(false)
      }
    }, 15000)

    const handleMasterCVRedirect = async () => {
      setIsHydrating(true)
      setSyncError(null)

      if (docParam !== 'master-cv') {
        clearTimeout(timeout)
        setHydrated(true)
        setIsHydrating(false)
        return
      }

      if (!isAuthenticated) {
        clearTimeout(timeout)
        setHydrated(true)
        setIsHydrating(false)
        return
      }

      try {
        const res = await fetch(`/api/cvs/master?userId=${user?.id}`)
        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`)
        }
        const result = await res.json()

        const currentParams = new URLSearchParams(searchParams.toString())
        currentParams.delete('doc')

        if (result.success && result.data?.masterCV?.id) {
          currentParams.set('cvId', result.data.masterCV.id)
          currentParams.set('mode', 'edit-master')
          if (!currentParams.has('improve')) currentParams.set('improve', 'true')
          router.replace(`/editor?${currentParams.toString()}`)
        } else {
          currentParams.set('mode', 'create')
          router.replace(`/editor?${currentParams.toString()}`)
        }
      } catch (error: any) {
        console.error('Error fetching master CV for redirect:', error)
        if (!cancelled) {
          setSyncError(`Polar Gateway Connection Error: Failed to synchronize workspace data. ${error.message || ''}`)
        }
      } finally {
        clearTimeout(timeout)
        if (!cancelled) {
          setHydrated(true)
          setIsHydrating(false)
        }
      }
    }

    handleMasterCVRedirect()
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [authLoading, isAuthenticated, user?.id, docParam, router, searchParams])

  const resolvedMode = isGuestMode
    ? (mode === 'edit-cover-letter' || mode === 'create-cover-letter' ? 'create-cover-letter' : 'create')
    : mode

  const container = hydrated ? (
    <ResumeEnhancerContainer
      userId={isGuestMode ? 'guest' : (user?.id || '')}
      mode={resolvedMode}
      cvId={cvId}
      clId={clId}
      journeyId={journeyId}
      isGuestMode={isGuestMode}
      restoreDraft={restoreDraft}
    />
  ) : (
    <div className="mt-8">
      <Skeleton className="h-[600px] w-full rounded-2xl" />
      <SyncIndicator visible />
    </div>
  )

  if (authLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-64" />
        <div className="mt-8">
          <Skeleton className="min-h-[400px] md:min-h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0c0f0a] flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-[420px] p-8 rounded-3xl bg-white dark:bg-[#12160f] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden group">
          {/* Glowing background light blobs */}
          <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-red-500/10 blur-3xl group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
          <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-amber-500/10 blur-3xl group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-500 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <WifiOff className="w-7 h-7 text-white animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              Polar Gateway Offline
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[320px] mx-auto">
              Mori is unable to establish a secure connection to the local database or payment gateway. Please ensure your development environment is running.
            </p>
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded-xl text-left">
              <span className="text-[10px] font-mono text-red-600 dark:text-red-400 break-words block">
                {syncError}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full pt-1">
            <button
              onClick={() => {
                setSyncError(null);
                setIsHydrating(true);
                // Trigger reload of the window to try a clean sync
                window.location.reload();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer border-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
            
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  setSyncError(null);
                  setHydrated(true);
                  setIsHydrating(false);
                }}
                className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold transition-all active:scale-98 cursor-pointer"
              >
                Offline Mode
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold transition-all active:scale-98 cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isGuestMode ? (
        <JobJourneyProvider>
          <ResumeEnhancerProvider>
            <ATSProvider>
              <DashboardDataProvider>
                {container}
              </DashboardDataProvider>
            </ATSProvider>
          </ResumeEnhancerProvider>
        </JobJourneyProvider>
      ) : (
        <RouteGuard requireAuth={true}>
          <JobJourneyProvider>
            <ResumeEnhancerProvider>
              <ATSProvider>
                <DashboardDataProvider>
                  {container}
                </DashboardDataProvider>
              </ATSProvider>
            </ResumeEnhancerProvider>
          </JobJourneyProvider>
        </RouteGuard>
      )}
      {isHydrating && <SyncIndicator visible />}
    </>
  )
}

export default function ResumeEnhancerPage() {
  return (
    <div className={`${geistFont.variable} geist-ui`}>
      <MobileSidebarProvider>
        <Suspense
          fallback={
            <div className="flex flex-col gap-4 p-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-64" />
              <div className="mt-8">
                <Skeleton className="min-h-[400px] md:min-h-[600px] w-full rounded-2xl" />
              </div>
            </div>
          }
        >
          <ResumeEnhancerPageContent />
        </Suspense>
      </MobileSidebarProvider>
    </div>
  )
}
