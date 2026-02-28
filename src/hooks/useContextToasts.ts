import { useEffect, useRef, useState, createElement } from 'react';
import { Issue } from '@/lib/pill-engine/types';
import { toast } from '@/hooks/use-toast';
import { ContextIssueToast } from '@/components/resume-enhancer/notifications/ContextIssueToast';

interface UseContextToastsConfig {
    onFix: (issue: Issue) => void;
    onDismiss?: (issueId: string) => void;
    onAiAssist?: (issue: Issue) => void;
    enabled?: boolean;
    maxDismissedItems?: number; // Limit for dismissed issues to prevent memory leak
}

// Default max dismissed items to prevent unbounded memory growth
const DEFAULT_MAX_DISMISSED = 100;

export function useContextToasts(
    issues: Issue[],
    config: UseContextToastsConfig
) {
    const { 
        onFix, 
        onDismiss, 
        onAiAssist, 
        enabled = true,
        maxDismissedItems = DEFAULT_MAX_DISMISSED 
    } = config;
    
    const [dismissedIssueIds, setDismissedIssueIds] = useState<Set<string>>(new Set());
    const previousIssuesRef = useRef<Map<string, Issue>>(new Map());
    const toastIdsRef = useRef<Map<string, { id: string, dismiss: () => void }>>(new Map());

    useEffect(() => {
        if (!enabled) return;

        // Create a map of current issues for easy lookup
        const currentIssuesMap = new Map(issues.map(issue => [issue.id, issue]));

        // Find new issues (exist in current but not in previous)
        const newIssues = issues.filter(issue => {
            const isNew = !previousIssuesRef.current.has(issue.id);
            const notDismissed = !dismissedIssueIds.has(issue.id);
            const notAlreadyToasted = !toastIdsRef.current.has(issue.id);
            return isNew && notDismissed && notAlreadyToasted;
        });

        // Show toast for each new issue
        newIssues.forEach((issue) => {
            const handleToastDismiss = (issueId: string) => {
                // Dismiss the toast
                const toastRef = toastIdsRef.current.get(issueId);
                if (toastRef) {
                    toastRef.dismiss();
                    toastIdsRef.current.delete(issueId);
                }

                // Mark as dismissed with max limit to prevent memory leak
                setDismissedIssueIds(prev => {
                    const newSet = new Set(prev);
                    newSet.add(issueId);
                    // Enforce max limit by removing oldest entries
                    if (newSet.size > maxDismissedItems) {
                        const entries = Array.from(newSet);
                        return new Set(entries.slice(-maxDismissedItems));
                    }
                    return newSet;
                });

                // Call external dismiss handler if provided
                onDismiss?.(issueId);
            };

            // Create toast with custom component using createElement
            const toastResult = toast({
                duration: 10000, // 10 seconds auto-dismiss
                description: createElement(ContextIssueToast, {
                    issue,
                    onFix: (issue: Issue) => {
                        onFix(issue);
                        handleToastDismiss(issue.id);
                    },
                    onDismiss: handleToastDismiss,
                    onAiAssist
                }),
            });

            toastIdsRef.current.set(issue.id, toastResult);
        });

        // Update previous issues map
        previousIssuesRef.current = currentIssuesMap;

        // Clean up toasts for issues that no longer exist
        const currentIssueIds = new Set(issues.map(i => i.id));
        Array.from(toastIdsRef.current.keys()).forEach(issueId => {
            if (!currentIssueIds.has(issueId)) {
                const toastRef = toastIdsRef.current.get(issueId);
                if (toastRef) {
                    toastRef.dismiss();
                    toastIdsRef.current.delete(issueId);
                }
            }
        });

    }, [issues, enabled, onFix, onDismiss, onAiAssist, dismissedIssueIds]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Dismiss all active toasts
            toastIdsRef.current.forEach(({ dismiss }) => dismiss());
            toastIdsRef.current.clear();
        };
    }, []);

    return {
        dismissedIssueIds,
        clearDismissed: () => setDismissedIssueIds(new Set()),
    };
}
