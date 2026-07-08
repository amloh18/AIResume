'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export interface ChecklistItemProgress {
  completed: boolean;
  completedAt?: string;
}

export interface EditorChecklistProgress {
  layout?: ChecklistItemProgress;
  design?: ChecklistItemProgress;
  aiChat?: ChecklistItemProgress;
  review?: ChecklistItemProgress;
}

const DEFAULT_PROGRESS: EditorChecklistProgress = {};

const EVENT_IDS: Record<keyof EditorChecklistProgress, string> = {
  layout: 'checklist:layout-completed',
  design: 'checklist:design-completed',
  aiChat: 'checklist:ai-completed',
  review: 'checklist:review-completed',
};

function buildOnboardingPatch(prev: EditorChecklistProgress, id: keyof EditorChecklistProgress): EditorChecklistProgress {
  return {
    ...prev,
    [id]: {
      completed: true,
      completedAt: new Date().toISOString(),
    },
  };
}

async function patchOnboarding(userId: string, checklist: EditorChecklistProgress) {
  const res = await fetch('/api/user/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ editor_checklist: checklist }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to update checklist');
  }

  return res.json();
}

export function useEditorChecklist() {
  const { data: session } = useSession();
  const userId = session?.user?.id || session?.user?.email;
  const queryClient = useQueryClient();

  const { data: progress = DEFAULT_PROGRESS, isLoading } = useQuery<EditorChecklistProgress>({
    queryKey: ['editor', 'checklist', userId],
    queryFn: async () => {
      const res = await fetch('/api/user/onboarding');
      if (!res.ok) throw new Error('Failed to load onboarding');
      const json = await res.json();
      return (json?.data?.onboarding?.editor_checklist as EditorChecklistProgress) || DEFAULT_PROGRESS;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (id: keyof EditorChecklistProgress) => {
      if (!userId) throw new Error('Missing user id');
      const next = buildOnboardingPatch(progress || DEFAULT_PROGRESS, id);
      await patchOnboarding(userId, next);
      return next;
    },
    onMutate: async (id: keyof EditorChecklistProgress) => {
      await queryClient.cancelQueries({ queryKey: ['editor', 'checklist', userId] });
      const previous = queryClient.getQueryData<EditorChecklistProgress>(['editor', 'checklist', userId]);
      const next = buildOnboardingPatch(previous || DEFAULT_PROGRESS, id);
      queryClient.setQueryData(['editor', 'checklist', userId], next);
      return { previous: previous || DEFAULT_PROGRESS };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['editor', 'checklist', userId], context.previous);
      }
      toast.error('Could not save checklist progress');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['editor', 'checklist', userId] });
    },
  });

  useEffect(() => {
    if (!userId) return;

    const handlers: Record<string, EventListener> = {};

    (Object.keys(EVENT_IDS) as Array<keyof EditorChecklistProgress>).forEach((key) => {
      const eventName = EVENT_IDS[key];
      handlers[eventName] = () => {
        mutation.mutate(key);
      };
      window.addEventListener(eventName, handlers[eventName] as EventListener);
    });

    return () => {
      (Object.keys(EVENT_IDS) as Array<keyof EditorChecklistProgress>).forEach((key) => {
        const eventName = EVENT_IDS[key];
        window.removeEventListener(eventName, handlers[eventName] as EventListener);
      });
    };
  }, [userId, mutation]);

  const markComplete = useCallback((id: keyof EditorChecklistProgress) => {
    if (!userId) return;
    if ((progress || DEFAULT_PROGRESS)[id]?.completed) return;
    mutation.mutate(id);
  }, [mutation, progress, userId]);

  const completedCount = useMemo(() => {
    if (!progress) return 0;
    return Object.values(progress).filter(item => item?.completed).length;
  }, [progress]);

  const isComplete = completedCount === 4;

  return {
    progress: progress || DEFAULT_PROGRESS,
    isLoading,
    markComplete,
    completedCount,
    isComplete,
    isMutating: mutation.isPending,
  };
}
