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
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'

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
    const handleMasterCVRedirect = async () => {
      setIsHydrating(true)

      if (docParam !== 'master-cv') {
        setHydrated(true)
        setIsHydrating(false)
        return
      }

      if (!isAuthenticated) {
        setHydrated(true)
        setIsHydrating(false)
        return
      }

      try {
        const res = await fetch(`/api/cvs/master?userId=${user?.id}`)
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
      } catch (error) {
        console.error('Error fetching master CV for redirect:', error)
        const currentParams = new URLSearchParams(searchParams.toString())
        currentParams.delete('doc')
        currentParams.set('mode', 'create')
        router.replace(`/editor?${currentParams.toString()}`)
      } finally {
        if (!cancelled) {
          setHydrated(true)
          setIsHydrating(false)
        }
      }
    }

    handleMasterCVRedirect()
    return () => {
      cancelled = true
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
