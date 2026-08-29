# BuildAIResume Global UI Design System

Authoritative design system specification and component reference for BuildAIResume (`cvcircle_app`).

The **Jobs Hub dashboard** serves as the visual source of truth for spacing, typography, control sizing, rounded corners, green accent usage, and interaction style.

---

## 1. Design Tokens & CSS Variables

Centralized in `src/app/globals.css` and configured in `tailwind.config.js`.

### Colors & Accents

| Token | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#013f2e` | `#84cc16` (Lime) | Main Action & Brand CTA |
| `--color-primary-hover` | `#02523c` | `#a3e635` | Hover state on Primary CTA |
| `--color-primary-active` | `#012e22` | `#65a30d` | Active / Press state on CTA |
| `--color-primary-soft` | `rgba(1, 63, 46, 0.08)` | `rgba(132, 204, 22, 0.15)` | Background tint for soft badges/chips |
| `--color-surface` | `#ffffff` | `#141810` | Main card & container background |
| `--color-surface-subtle` | `#f9fafb` | `#191c1b` | Secondary panel surfaces |
| `--color-border` | `#e5e7eb` | `rgba(255, 255, 255, 0.1)` | Standard container & input borders |
| `--color-text-primary` | `#111827` | `#ffffff` | Headings & primary labels |
| `--color-text-secondary` | `#4b5563` | `#9ca3af` | Subheadings & descriptions |
| `--color-text-muted` | `#9ca3af` | `#6b7280` | Placeholders & subtle captions |

### Status Colors

| Semantic Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `--status-success` | `#10b981` / `#34d399` | Success notifications, connected states, high match scores |
| `--status-warning` | `#f59e0b` / `#fbbf24` | Beta tags, notices, medium match scores |
| `--status-danger` | `#ef4444` / `#f87171` | Delete actions, errors, destructive operations |
| `--status-info` | `#0ea5e9` / `#38bdf8` | Informational badges & icons |

### 3-Tier Sizing Rhythm

| Sizing Tier | Height | Target Use |
| :--- | :--- | :--- |
| `sm` | `2rem` (32px) | Table row actions, compact chips, small filters |
| `md` | `2.5rem` (40px) | **Default** - Buttons, inputs, dropdowns, toggles |
| `lg` | `2.875rem` (46px) | Hero primary actions, wide search bars |

### Border Radii

- `--radius-sm`: `6px` (`rounded-md`)
- `--radius-md`: `10px` (`rounded-xl` / controls default)
- `--radius-lg`: `16px` (`rounded-2xl` / subcards)
- `--radius-xl`: `24px` (`rounded-3xl` / main dashboard containers & modals)
- `--radius-full`: `9999px` (`rounded-full` / pills, badges, chips)

---

## 2. Interaction & Motion Rules

1. **No Slide-Up Hover Jumps**:
   - `transform: translateY(-2px)` is strictly disallowed on buttons and cards.
2. **Subtle Scale & Transitions**:
   - Micro-interaction: `hover:scale-[1.015]` and `active:scale-[0.985]`.
   - Duration: `150ms ease-out` (`--motion-fast`).
3. **Layout-Stable Loading**:
   - Buttons maintain their exact width and height during `isLoading`.
   - Replaces content with an inline `<Loader2 className="animate-spin" />` without shifting neighboring elements.

---

## 3. UI Primitives (`src/components/ui`)

### `Button`
```tsx
import { Button } from '@/components/ui';

// Primary CTA
<Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
  Create Document
</Button>

// Secondary Action
<Button variant="secondary" size="md" onClick={onOpenSettings}>
  Edit Preferences
</Button>

// Loading Button
<Button variant="primary" size="md" isLoading={isSaving} loadingText="Saving...">
  Save Changes
</Button>
```

### `IconButton`
```tsx
import { IconButton } from '@/components/ui';

<IconButton variant="secondary" size="sm" aria-label="Edit CV" tooltip="Edit CV" onClick={handleEdit}>
  <Edit2 className="w-3.5 h-3.5" />
</IconButton>

<IconButton variant="danger" size="sm" aria-label="Delete" tooltip="Delete" onClick={handleDelete}>
  <Trash2 className="w-3.5 h-3.5" />
</IconButton>
```

### `Pill` (Interactive Filter Chips)
```tsx
import { Pill } from '@/components/ui';

<Pill
  selected={easyApplyOnly}
  onClick={() => setEasyApplyOnly(!easyApplyOnly)}
  leftIcon={<Zap className="w-3.5 h-3.5" />}
>
  Auto-Apply supported
</Pill>
```

### `Toggle` / `Switch`
```tsx
import { Toggle } from '@/components/ui';

<Toggle
  checked={autoApply}
  onCheckedChange={setAutoApply}
  label="Auto-Apply"
  description="Automatically submit matched applications daily"
  isLoading={isSaving}
/>
```

### `SearchInput`
```tsx
import { SearchInput } from '@/components/ui';

<SearchInput
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onClear={() => setQuery('')}
  placeholder="Search jobs, skills, companies..."
  size="lg"
/>
```

### `Dropdown`
```tsx
import { Dropdown } from '@/components/ui';

<Dropdown
  options={[
    { id: 'all', label: 'All time' },
    { id: '24h', label: 'Past 24 hours' },
    { id: '7d', label: 'Past 7 days' },
  ]}
  value={selectedDate}
  onChange={(val) => setSelectedDate(val)}
  size="md"
/>
```

### `Tabs`
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList variant="line">
    <TabsTrigger value="discover" icon={<Sparkles className="w-4 h-4" />}>
      Discover
    </TabsTrigger>
    <TabsTrigger value="applications" icon={<Briefcase className="w-4 h-4" />}>
      Applications
    </TabsTrigger>
  </TabsList>
  <TabsContent value="discover">...</TabsContent>
</Tabs>
```

### `PageHeader` & `SectionHeader`
```tsx
import { PageHeader, Badge, Button } from '@/components/ui';

<PageHeader
  title="Jobs Hub"
  description="AI-powered job matching and automation"
  badge={<Badge variant="beta">BETA</Badge>}
  actions={<Button variant="primary">Apply All</Button>}
/>
```
