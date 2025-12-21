/**
 * ATS Deep Dive Accessibility Utilities
 * Handles Cases 41-50: Color blindness, mobile, zoom, overlays, etc.
 */

export type ShapeCode = 'underline' | 'zigzag' | 'dashed' | 'dotted' | 'circle';

/**
 * Get shape code for accessibility (Case #41)
 * Color-blind users can distinguish by shape instead of color
 */
export function getShapeCode(type: 'exact' | 'semantic' | 'missing' | 'spam'): ShapeCode {
  const shapeMap: Record<string, ShapeCode> = {
    exact: 'underline',
    semantic: 'dashed',
    missing: 'dotted',
    spam: 'zigzag',
  };
  return shapeMap[type] || 'circle';
}

/**
 * Check if device is mobile (Case #42)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024;
}

/**
 * Get mobile layout mode (stacked tabs instead of 3 panels)
 */
export function getMobileLayoutMode(): 'stacked' | 'tabs' {
  return isMobileDevice() ? 'tabs' : 'stacked';
}

/**
 * Sync SVG coordinates with zoom level (Case #43)
 */
export function syncCoordinatesWithZoom(
  element: HTMLElement,
  svgElement: SVGSVGElement
): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {
  const rect = element.getBoundingClientRect();
  const svgRect = svgElement.getBoundingClientRect();

  // Get zoom level
  const zoom = window.devicePixelRatio || 1;

  const scaleX = (rect.width / svgRect.width) * zoom;
  const scaleY = (rect.height / svgRect.height) * zoom;
  const offsetX = rect.left - svgRect.left;
  const offsetY = rect.top - svgRect.top;

  return { scaleX, scaleY, offsetX, offsetY };
}

/**
 * Ensure overlay doesn't conflict with text (Case #45)
 * Timeline should be in gutter only
 */
export function getGutterPosition(element: HTMLElement): { x: number; width: number } {
  const rect = element.getBoundingClientRect();
  const gutterWidth = 60; // Fixed gutter width
  return {
    x: 20, // Left margin
    width: gutterWidth,
  };
}

/**
 * Show skeleton loading state (Case #46)
 */
export function createSkeletonLoader(count: number = 3): Array<{ width: number; height: number }> {
  return Array.from({ length: count }, () => ({
    width: Math.random() * 200 + 100,
    height: Math.random() * 20 + 15,
  }));
}

/**
 * Optimistic UI update (Case #48)
 * Client-side validation before server confirmation
 */
export function validateClientSide(change: any): { valid: boolean; error?: string } {
  // Basic validation
  if (!change) {
    return { valid: false, error: 'No change provided' };
  }

  // Add more validation as needed
  return { valid: true };
}

/**
 * Generate read-only link for export (Case #49)
 */
export function generateReadOnlyLink(cvId: string, analysisId: string): string {
  // In production, this would generate a secure, read-only link
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/ats-report/${cvId}/${analysisId}?readonly=true`;
}

/**
 * Version history for undo (Case #50)
 */
export interface VersionHistory {
  id: string;
  timestamp: Date;
  changes: any;
  description: string;
}

export class VersionHistoryManager {
  private static history: VersionHistory[] = [];
  private static maxHistory = 50;

  static addVersion(changes: any, description: string): string {
    const version: VersionHistory = {
      id: `v${Date.now()}`,
      timestamp: new Date(),
      changes,
      description,
    };

    this.history.push(version);

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return version.id;
  }

  static getVersion(versionId: string): VersionHistory | null {
    return this.history.find((v) => v.id === versionId) || null;
  }

  static getLatestVersion(): VersionHistory | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  static revertToVersion(versionId: string): VersionHistory | null {
    const version = this.getVersion(versionId);
    if (!version) return null;

    // Add revert as new version
    this.addVersion(version.changes, `Reverted to ${version.description}`);

    return version;
  }

  static clearHistory(): void {
    this.history = [];
  }
}

/**
 * Triage mode: Only show critical issues (Case #44)
 */
export function filterCriticalIssues<T extends { isCritical?: boolean; severity?: 'critical' | 'optimization' }>(
  issues: T[],
  showCriticalOnly: boolean
): T[] {
  if (!showCriticalOnly) return issues;
  return issues.filter((issue) => issue.isCritical || issue.severity === 'critical');
}

/**
 * Instant edit popover (Case #47)
 */
export interface EditPopoverConfig {
  x: number;
  y: number;
  field: string;
  currentValue: any;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function createEditPopover(config: EditPopoverConfig): HTMLElement {
  const popover = document.createElement('div');
  popover.className = 'ats-edit-popover';
  popover.style.position = 'fixed';
  popover.style.left = `${config.x}px`;
  popover.style.top = `${config.y}px`;
  popover.style.zIndex = '1000';
  popover.style.backgroundColor = '#1f2937';
  popover.style.border = '1px solid #374151';
  popover.style.borderRadius = '8px';
  popover.style.padding = '12px';
  popover.style.minWidth = '200px';

  // Add input field
  const input = document.createElement('input');
  input.type = 'text';
  input.value = config.currentValue || '';
  input.className = 'w-full px-3 py-2 bg-gray-700 text-white rounded';
  popover.appendChild(input);

  // Add buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-2 mt-2';

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'px-3 py-1 bg-lime-500 text-white rounded text-sm';
  saveButton.onclick = () => {
    config.onSave(input.value);
    popover.remove();
  };

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'px-3 py-1 bg-gray-600 text-white rounded text-sm';
  cancelButton.onclick = () => {
    config.onCancel();
    popover.remove();
  };

  buttonContainer.appendChild(saveButton);
  buttonContainer.appendChild(cancelButton);
  popover.appendChild(buttonContainer);

  return popover;
}

