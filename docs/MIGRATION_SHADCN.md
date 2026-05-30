# Migration to shadcn/ui + Tailwind — Complete Guide

**Project:** Openbank Price Prediction  
**Migration started:** v6.9.0  
**Author:** Alex (alpyengine)  
**Stack before:** React 18 + Vite + Tailwind 3 + inline styles  
**Stack after:** React 18 + Vite + Tailwind 3 + shadcn/ui + Tailwind classes  

---

## Why migrate?

### The problem with inline styles

The app was built incrementally — each feature added `style={{}}` props directly to JSX elements. By v6.8.1, there were **332 inline style blocks** across 16 components. This created several problems:

1. **Maintainability** — changing a color (e.g. border radius globally) required editing 15+ files
2. **Consistency** — the same visual element (a card, a badge, a button) was implemented differently in different components
3. **Readability** — JSX files mixed layout logic with business logic, making both harder to understand
4. **Dark mode** — color overrides for dark mode were duplicated in every component instead of being centralized
5. **Future-proofing** — adding authentication (v7.0.0) requires polished UI components (forms, inputs, dialogs) that are painful to build from scratch

### Why shadcn/ui specifically?

[shadcn/ui](https://ui.shadcn.com) is not a traditional component library — it's a collection of **copy-paste components** built on top of Radix UI primitives and styled with Tailwind. This means:

- **No black box** — the component code lives in your repo (`src/components/ui/`), you own it completely
- **No version lock** — updating shadcn doesn't break your app; you update individual components manually
- **Accessible by default** — Radix UI handles keyboard navigation, ARIA attributes, focus management
- **Tailwind-native** — components use Tailwind classes, not CSS-in-JS or inline styles
- **Already partially set up** — the project already had Radix UI, clsx, tailwind-merge, and lucide-react installed

### Why now?

The v7.0.0 authentication feature requires:
- Login / signup forms
- User profile in sidebar
- Role-based UI states (admin vs. read-only)

These are all much easier to build with shadcn/ui components already in place. Doing the migration after auth would mean retrofitting styles twice.

---

## Pre-migration audit (v6.8.1 baseline)

### Dependencies already present

| Package | Version | Role |
|---|---|---|
| `tailwindcss` | ^3.4.17 | CSS utility framework |
| `@radix-ui/react-dialog` | ^1.1.15 | Modal primitives |
| `@radix-ui/react-tabs` | ^1.1.13 | Tab primitives |
| `@radix-ui/react-select` | ^2.2.6 | Select primitives |
| `@radix-ui/react-tooltip` | ^1.2.8 | Tooltip primitives |
| `@radix-ui/react-slot` | ^1.2.4 | Component composition |
| `class-variance-authority` | ^0.7.1 | Variant-based class generation |
| `clsx` | ^2.1.1 | Conditional class names |
| `tailwind-merge` | ^3.3.1 | Merge Tailwind classes safely |
| `lucide-react` | ^0.564.0 | Icon library |
| `recharts` | ^2.15.0 | Chart library (unchanged) |

**Conclusion:** all shadcn/ui dependencies were already installed. No new npm packages required for the base setup.

### Style usage count

```
Inline style={{}} blocks:  332
Tailwind className= usage:   2
```

### Component inventory

```
src/components/
  AccuracyChart.jsx   — Accuracy stats page with batch table and chart
  BatchSimple.jsx     — Batch overview page (simple table)
  EmailPreview.jsx    — Email report modal
  FetchBar.jsx        — Top action bar with fetch buttons and batch selector
  FundamentalsBar.jsx — Fundamentals display bar
  Header.jsx          — App header
  HorizonTabs.jsx     — 1M / 3M / 6M / 12M / Best tab selector
  ImportBox.jsx       — CSV import textarea and file upload
  ImportPage.jsx      — Import page wrapper
  MarketBar.jsx       — Market data display
  PriceChart.jsx      — Weekly price chart modal
  SectorControls.jsx  — Sector filter controls
  Sidebar.jsx         — Left navigation sidebar
  StockRow.jsx        — Individual stock row (most complex component)
  StockTable.jsx      — Full stock table with grouping and sorting
  SummaryCards.jsx    — Hit/Close/Miss/Awaiting summary boxes
```

---

## Migration phases

### Phase 0 — Preparation (v6.9.0)

**Goal:** rename CSS variables to shadcn standard, update Tailwind config, add path alias, create shadcn config file. No visual changes. All 107 tests must still pass.

#### CSS variable renaming

shadcn/ui expects a specific set of CSS variable names. Our existing variables used a `--tw-` prefix. This phase renames them to the shadcn standard:

| Old name | New name | Role |
|---|---|---|
| `--tw-bg` | `--background` | Page background |
| `--tw-fg` | `--foreground` | Default text |
| `--tw-card` | `--card` | Card background |
| `--tw-card-fg` | `--card-foreground` | Card text |
| `--tw-border` | `--border` | Border color |
| `--tw-input` | `--input` | Input background |
| `--tw-ring` | `--ring` | Focus ring |
| `--tw-primary` | `--primary` | Primary action color |
| `--tw-primary-fg` | `--primary-foreground` | Text on primary |
| `--tw-secondary` | `--secondary` | Secondary background |
| `--tw-secondary-fg` | `--secondary-foreground` | Text on secondary |
| `--tw-muted` | `--muted` | Muted background |
| `--tw-muted-fg` | `--muted-foreground` | Muted text |
| `--tw-accent` | `--accent` | Accent background |
| `--tw-accent-fg` | `--accent-foreground` | Text on accent |
| `--tw-sidebar` | `--sidebar` | Sidebar background |
| `--tw-sidebar-fg` | `--sidebar-foreground` | Sidebar text |
| `--tw-sidebar-border` | `--sidebar-border` | Sidebar border |
| `--tw-sidebar-accent` | `--sidebar-accent` | Sidebar hover |
| `--tw-sidebar-accent-fg` | `--sidebar-accent-foreground` | Sidebar hover text |
| `--tw-sidebar-primary` | `--sidebar-primary` | Sidebar active item |
| `--tw-sidebar-primary-fg` | `--sidebar-primary-foreground` | Sidebar active text |
| `--tw-success` | `--success` | Success green |
| `--tw-warning` | `--warning` | Warning amber |
| `--tw-danger` | `--destructive` | Danger red (shadcn name) |

**Strategy:** to avoid breaking all 332 inline styles in one go, we add CSS aliases in `global.css` — the new names point to the same values, and the old names also remain pointing to the new names. This allows a gradual migration where both `var(--background)` and `var(--tw-bg)` work simultaneously during the transition.

```css
/* New shadcn names (primary) */
:root {
  --background: #f9f9fb;
  ...
}

/* Legacy aliases — removed once all components are migrated */
:root {
  --tw-bg: var(--background);
  --tw-fg: var(--foreground);
  ...
}
```

#### Files changed in Phase 0

- `src/styles/global.css` — rename variables, add legacy aliases
- `tailwind.config.js` — update to use new variable names
- `vite.config.js` — add `@/` path alias for clean imports
- `docs/MIGRATION_SHADCN.md` — this file (created)
- `README.md` — link to this file

#### Verification

```bash
npm run test:run   # must show 107 passed
npm run dev        # app must look identical to v6.8.1
```

---

### Phase 1 — shadcn/ui base components (v6.9.1)

**Goal:** install the shadcn/ui component files into `src/components/ui/`. These are the building blocks used in all subsequent phases.

#### Components to install

```
button       — Primary action element throughout the app
card         — Container for summary boxes, panels, modals
badge        — Verdict labels (HIT / CLOSE / MISS / AWAITING)
separator    — Visual dividers
tooltip      — Column help tooltips in StockTable
tabs         — HorizonTabs (1M / 3M / 6M / 12M / Best)
select       — Batch selector dropdown, filter dropdowns
dialog       — Description modal, PriceChart modal
table        — StockTable, AccuracyChart batch table
input        — Notes input, CSV textarea
textarea     — CSV import textarea
label        — Form labels
```

#### Installation method

shadcn components are not installed via npm — they are generated as source files in your project:

```bash
npx shadcn@latest init          # creates components.json config
npx shadcn@latest add button    # copies src/components/ui/button.tsx
npx shadcn@latest add card      # copies src/components/ui/card.tsx
# etc.
```

Since this project uses `.jsx` not `.tsx`, the generated files will be converted to `.jsx` during installation (configured in `components.json`).

#### What gets created

```
src/components/ui/
  button.jsx
  card.jsx
  badge.jsx
  separator.jsx
  tooltip.jsx
  tabs.jsx
  select.jsx
  dialog.jsx
  table.jsx
  input.jsx
  textarea.jsx
  label.jsx
```

Each file is self-contained and fully owned by the project. shadcn never touches these files again after generation — updates are manual.

---

### Phase 2 — Simple components (v6.9.2)

**Goal:** migrate the simplest components first, establish patterns used in later phases.

Components: `SummaryCards`, `HorizonTabs`, `ImportBox`, `FetchBar`

#### Code pattern established in this phase

```jsx
// Before — inline styles
function Card({ label, value }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 20px 18px',
    }}>
      <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
        {label}
      </span>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

// After — shadcn/ui + Tailwind
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function SummaryCard({ label, value }) {
  return (
    <Card>
      <CardHeader>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
```

#### Dynamic color pattern with cn()

Verdict-based colors use `cn()` with conditional classes instead of ternary expressions:

```jsx
// Before
const color = verdict === 'hit' ? '#15803d' : verdict === 'close' ? '#a16207' : '#b91c1c'
<span style={{ color }}>{verdict}</span>

// After
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

<Badge className={cn({
  'bg-green-50 text-green-700 border-green-200':  verdict === 'hit',
  'bg-amber-50 text-amber-700 border-amber-200':  verdict === 'close',
  'bg-red-50 text-red-700 border-red-200':        verdict === 'miss',
  'bg-muted text-muted-foreground':               verdict === 'awaiting',
})}>
  {verdict.toUpperCase()}
</Badge>
```

---

### Phase 3 — Medium components (v6.9.3)

Components: `Sidebar`, `BatchSimple`, `AccuracyChart`, `PriceChart`

**Notable changes:**
- `Sidebar` uses shadcn navigation pattern
- `PriceChart` modal uses shadcn `Dialog` component
- `AccuracyChart` batch table uses shadcn `Table`

---

### Phase 4 — Complex components (v6.9.4)

Components: `StockTable`, `StockRow`

These are the most complex because:
- `StockRow` has dynamic styles based on verdict, distance, and horizon state
- `StockTable` has grouping, sorting, filtering, and 16+ columns
- Both use `cn()` extensively for conditional styling

After this phase, all 332 inline `style={{}}` blocks will be replaced.

---

### Phase 5 — Documentation and code comments (v6.9.5)

**Goal:** every important function, hook, and component gets:

1. **Block comment** explaining what it does and why
2. **JSDoc** for props and parameters
3. **Inline comments** for non-obvious logic

Example:

```jsx
/**
 * SummaryCards
 *
 * Displays 5 KPI boxes at the top of the Batch Overview Detail page:
 * Total stocks | Hit target | Close (±N%) | Miss | Awaiting
 *
 * Each box shows the count and the average distance to target (±%).
 * Colors match the verdict system used throughout the app:
 *   - Hit   → green
 *   - Close → amber
 *   - Miss  → red
 *   - Awaiting → neutral
 *
 * All evaluations use evaluatePrediction() as single source of truth.
 *
 * @param {Object[]} stocks         — array of stock objects from CSV
 * @param {string}   horizon        — selected horizon: '1M'|'3M'|'6M'|'12M'|'all'|'best'
 * @param {Object}   autoPrices     — current prices { [ticker]: price }
 * @param {Object}   histPrices     — historical prices { [ticker_horizon]: { price } }
 * @param {Object}   overrides      — manual price overrides { [ticker]: price }
 * @param {boolean}  horizonExpired — whether the selected horizon's target date has passed
 * @param {number}   hitMargin      — hit tolerance in % (default 5)
 */
export default function SummaryCards({ ... }) {
```

---

## Code conventions

### Import order (enforced throughout migration)

```jsx
// 1. React
import { useState, useEffect, useCallback, memo } from 'react'

// 2. Third-party libraries
import { TrendingUp } from 'lucide-react'

// 3. shadcn/ui components (always @/ alias)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// 4. Internal hooks and services
import { evaluatePrediction, getTarget } from '@/utils/stocks'
import { loadWeeklyPrices } from '@/services/storage'

// 5. Internal components
import PriceChart from './PriceChart'
```

### Tailwind class ordering (Prettier plugin enforced)

Classes follow the order: layout → spacing → sizing → typography → color → border → effects

```jsx
// Correct order
<div className="flex items-center gap-3 px-4 py-2 w-full text-sm font-medium text-foreground bg-card border border-border rounded-lg shadow-sm">
```

### No mixing of styles

After migration, **no component should contain both `style={{}}` and `className`** for layout/visual properties. The only exception is Chart.js canvas dimensions which must use inline styles.

---

## Rollback strategy

Each phase is a separate git commit and tag. If a phase introduces a regression:

```bash
# Rollback to previous phase
git revert HEAD
# or
git checkout v6.9.x -- src/components/ComponentName.jsx
```

The 107 tests act as the safety net — if they pass after each phase, the logic is intact.

---

## Progress tracker

| Phase | Version | Status | Tests |
|---|---|---|---|
| 0 — Preparation | v6.9.0 | ✅ Complete | 107/107 |
| 1 — Base components | v6.9.1 | ✅ Complete | 107/107 |
| 2 — Simple components | v6.9.2 | ✅ Complete | 107/107 |
| 3 — Medium components | v6.9.3 | ✅ Complete | 107/107 |
| 4 — Complex components | v6.9.4 | ✅ Complete | 107/107 |
| 5 — Documentation | v6.9.5 | ⏳ Pending | — |

---

## References

- [shadcn/ui documentation](https://ui.shadcn.com)
- [Tailwind CSS v3 documentation](https://v3.tailwindcss.com)
- [Radix UI primitives](https://www.radix-ui.com)
- [class-variance-authority](https://cva.style/docs)
- [Lucide icons](https://lucide.dev)
