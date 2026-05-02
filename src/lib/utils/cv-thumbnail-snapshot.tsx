'use client';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { toSvg } from 'html-to-image';
import CVSnapshotDocument, {
  CV_SNAPSHOT_A4_HEIGHT,
  CV_SNAPSHOT_A4_WIDTH,
} from '@/components/cv-builder-pro/CVSnapshotDocument';

const waitForRender = async () => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    } catch {
      // Ignore font readiness errors and continue with capture.
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 60));
};

export async function captureCvThumbnailSvgDataUrl({
  cvData,
  template,
}: {
  cvData: any;
  template: any;
}) {
  const mountNode = document.createElement('div');
  mountNode.style.position = 'fixed';
  mountNode.style.left = '-99999px';
  mountNode.style.top = '0';
  mountNode.style.width = `${CV_SNAPSHOT_A4_WIDTH}px`;
  mountNode.style.height = `${CV_SNAPSHOT_A4_HEIGHT}px`;
  mountNode.style.opacity = '0';
  mountNode.style.pointerEvents = 'none';
  mountNode.style.overflow = 'hidden';
  mountNode.style.background = '#ffffff';
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);

  try {
    root.render(
      <CVSnapshotDocument
        cvData={cvData}
        template={template}
        className="w-[794px] h-[1123px]"
      />
    );

    await waitForRender();

    const targetNode = mountNode.firstElementChild as HTMLElement | null;
    if (!targetNode) {
      throw new Error('Snapshot document failed to render');
    }

    return await toSvg(targetNode, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: '#ffffff',
      width: CV_SNAPSHOT_A4_WIDTH,
      height: CV_SNAPSHOT_A4_HEIGHT,
    });
  } finally {
    root.unmount();
    mountNode.remove();
  }
}

export async function saveCvThumbnailSnapshot({
  cvId,
  cvData,
  template,
  forceRegenerate = true,
}: {
  cvId: string;
  cvData: any;
  template: any;
  forceRegenerate?: boolean;
}) {
  if (!cvId || !cvData || !template) {
    return null;
  }

  const svgContent = await captureCvThumbnailSvgDataUrl({ cvData, template });
  const response = await fetch('/api/cv/thumbnail/generate-on-exit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cvId, svgContent, forceRegenerate }),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Failed to save thumbnail snapshot: HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.thumbnailUrl || null;
}

export function queueCvThumbnailSnapshotUpload({
  cvId,
  cvData,
  template,
  forceRegenerate = true,
}: {
  cvId: string;
  cvData: any;
  template: any;
  forceRegenerate?: boolean;
}) {
  if (!cvId || !cvData || !template || typeof navigator === 'undefined' || typeof window === 'undefined') {
    return;
  }

  window.setTimeout(async () => {
    try {
      const svgContent = await captureCvThumbnailSvgDataUrl({ cvData, template });
      const payload = JSON.stringify({ cvId, svgContent, forceRegenerate });

      if (typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/cv/thumbnail/generate-on-exit', blob);
        return;
      }

      await fetch('/api/cv/thumbnail/generate-on-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
    } catch (error) {
      console.warn('Failed to queue CV thumbnail snapshot upload', error);
    }
  }, 0);
}
