# Design System Migration Guide

## Overview

This document provides comprehensive guidance for migrating components to the new CV Circle Design System. The design system establishes a unified visual language across the application with consistent colors, typography, spacing, and component patterns.

---

## Design Tokens

### Color Palette

The design system uses CSS variables defined in `globals.css`:

**Light Theme:**
- Primary accent: `--accent-primary: #84cc16` (Lime green)
- Background primary: `--bg-primary: #ffffff`
- Background secondary: `--bg-secondary: #f9fafb`
- Text primary: `--text-primary: #111827`
- Text secondary: `--text-secondary: #6b7280`

**Dark Theme:**
- Primary accent: `--accent-primary: #99FF00`
- Background primary: `--bg-primary: #1a230f`
- Background secondary: `--bg-secondary: #141810`

### Usage

```tsx
// Using design tokens
import { tokens } from '@/lib/design-system';

<div className="text-[var(--accent-primary)]">
  Accent text
</div>

// Or directly from CSS
<div className="bg-[var(--bg-primary)]">
  Primary background
</div>
```

---

## Component Library

### Primitives

| Component | File | Description |
|-----------|------|-------------|
| Button | `components/Button.tsx` | Primary, secondary, outline, ghost, danger, success variants |
| Input | `components/Input.tsx` | Text input with label, error, hint |
| Textarea | `components/Textarea.tsx` | Multi-line input with character count |
| Select | `components/Select.tsx` | Dropdown with options |
| Card | `components/Card.tsx` | Card container with header/content/footer |
| Modal | `components/Modal.tsx` | Accessible modal dialog |
| Badge | `components/Badge.tsx` | Status badges |
| LoadingSpinner | `components/LoadingSpinner.tsx` | Loading indicator |

### Complex Components

| Component | File | Description |
|-----------|------|-------------|
| Toast | `components/Toast.tsx` | Notification system with provider |
| Tooltip | `components/Tooltip.tsx` | Hover tooltip with positioning |
| Accordion | `components/Accordion.tsx` | Collapsible sections |
| Tabs | `components/Tabs.tsx` | Tabbed interface |
| StepIndicator | `components/StepIndicator.tsx` | Multi-step progress indicator |
| Panel | `components/Panel.tsx` | Draggable panel container |
| Container | `components/Container.tsx` | Layout containers |

---

## Migration Checklist

### Phase 1: Primitives ✅ COMPLETE
- [x] Button
- [x] Input
- [x] Textarea
- [x] Select
- [x] Card
- [x] Modal
- [x] Badge
- [x] Spinner

### Phase 2: Complex Components ✅ COMPLETE
- [x] Toast/Notification system
- [x] Tooltip component
- [x] Accordion component
- [x] Tabs component
- [x] StepIndicator component
- [x] Panel component
- [x] Container utilities

### Phase 3: Resume Enhancer Integration (IN PROGRESS)
- [ ] Refactor container components
- [ ] Refactor navigation elements
- [ ] Refactor forms
- [ ] Refactor panels and overlays
- [ ] Refactor cards and lists

---

## Breaking Changes

### CSS Variables
- Renamed `--lime-500` to `--accent-primary`
- Dark mode accent is now `--accent-primary: #99FF00`

### Component Props

| Component | Old Prop | New Prop | Notes |
|-----------|----------|----------|-------|
| Button | `variant="lime"` | `variant="primary"` | Use new variant names |
| Button | `size="small"` | `size="sm"` | Use abbreviated sizes |
| Input | `errorText` | `error` | Simplified prop name |
| Card | `shadow` | `variant="elevated"` | Use variant prop |

### Color Migration

| Old Class | New Class/Token |
|-----------|-----------------|
| `bg-lime-500` | `bg-[var(--accent-primary)]` |
| `text-lime-600` | `text-[var(--accent-primary)]` |
| `border-lime-300` | `border-[var(--border-focus)]` |
| `hover:bg-lime-600` | `hover:bg-[var(--accent-hover)]` |

---

## Accessibility Compliance

All new components include:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance (WCAG 2.1 AA)

---

## Next Steps

1. **Audit existing components** - Review each component in resume-enhancer for design system compliance
2. **Refactor in batches** - Prioritize high-impact components (forms, navigation)
3. **Update documentation** - Document each component's API and usage
4. **Run tests** - Ensure all existing functionality works with new design system