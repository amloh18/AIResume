'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  JOB_SOURCE_DESCRIPTORS,
  JobSourceConnectionView,
  JobSourceProvider,
  formatConnectedDateLong,
} from '@/lib/portals/connection-state';
import { useDisconnectJobSource } from '@/hooks/useJobSourceConnections';

interface PortalManageDialogProps {
  provider: JobSourceProvider;
  /** The current view of this source, so the dialog never shows stale detail. */
  connection: JobSourceConnectionView | undefined;
  isOpen: boolean;
  onClose: () => void;
  /** Closes this dialog and opens the connect flow again. */
  onReconnect: () => void;
}

/**
 * Manage a connected account: see what is stored, reconnect, or disconnect.
 *
 * Disconnect is two-step, and the confirmation states explicitly that jobs and
 * application history survive — because "disconnect" reads like "delete my data"
 * and the alternative is users avoiding the button out of fear.
 */
export const PortalManageDialog: React.FC<PortalManageDialogProps> = ({
  provider,
  connection,
  isOpen,
  onClose,
  onReconnect,
}) => {
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const disconnect = useDisconnectJobSource();
  const descriptor = JOB_SOURCE_DESCRIPTORS[provider];

  useEffect(() => {
    if (isOpen) setConfirmingDisconnect(false);
  }, [isOpen, provider]);

  if (!descriptor) return null;

  const connectedOn = formatConnectedDateLong(connection?.connectedAt);
  const needsAttention = connection?.state === 'attention_required';

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync(provider);
      onClose();
    } catch {
      // Leave the dialog open so the user can retry; the mutation error is
      // already surfaced by the caller's toast if it wants to.
      setConfirmingDisconnect(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        {confirmingDisconnect ? (
          <>
            <DialogHeader>
              <DialogTitle>Disconnect {descriptor.name}?</DialogTitle>
              <DialogDescription>
                AIResume will no longer have access to your connected {descriptor.name}{' '}
                account. Your existing jobs and application history will not be deleted.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(false)}
                disabled={disconnect.isPending}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
                className="px-4 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {disconnect.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Disconnect
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{descriptor.name}</DialogTitle>
              <DialogDescription>
                {needsAttention ? 'This connection needs attention' : 'Connected'}
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-3 text-xs">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Connected</dt>
                <dd className="font-semibold text-gray-900 dark:text-white text-right">
                  {connectedOn || '—'}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Account</dt>
                <dd className="font-semibold text-gray-900 dark:text-white text-right break-all">
                  {/* Shown only when the user actually supplied one. We do not
                      synthesise a placeholder to fill this row. */}
                  {connection?.accountIdentifier || 'Not provided'}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Connection status</dt>
                <dd
                  className={`font-semibold text-right ${
                    needsAttention
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {needsAttention ? 'Needs attention' : 'Active'}
                </dd>
              </div>

              {needsAttention && connection?.lastError && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300">
                  {connection.lastError}
                </div>
              )}
            </dl>

            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReconnect();
                }}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 transition-colors"
              >
                Reconnect
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(true)}
                className="px-4 py-2.5 text-xs font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/40 transition-colors"
              >
                Disconnect
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PortalManageDialog;
