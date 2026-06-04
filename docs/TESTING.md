# Testing Guide — Openbank Price Prediction

## Overview

The app uses two complementary testing strategies:

| Layer | Tool | What it tests | Files |
|---|---|---|---|
| **Unit tests** | Vitest | Pure JS functions — dates, stock logic, storage, hooks | `src/**/*.test.js` |
| **Component tests** | Vitest + React Testing Library | React components — render, user interaction, UI logic | `src/**/__tests__/*.test.jsx` |

---

## Running tests

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on file change)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

---

## Unit tests (existing — 107 tests)

These test pure JavaScript logic with no DOM or React involved.

| File | What it tests |
|---|---|
| `src/utils/dates.test.js` | Date formatting, horizon calculation, target dates |
| `src/utils/stocks.test.js` | Verdict evaluation (hit/miss/close), upside %, distance % |
| `src/hooks/computed.test.js` | Derived batch metrics (hit rate, avg upside) |
| `src/hooks/saveBatch.test.js` | Batch save logic and state updates |
| `src/hooks/restoreHistPrices.test.js` | Historical price restoration from cache |
| `src/services/storage.test.js` | Supabase URL construction, response parsing |

---

## Component tests — React Testing Library (v7.2.0+)

These test React components by simulating real user interactions.

### What is React Testing Library?

RTL renders components in a simulated browser (jsdom) and lets you interact with them the way a user would — by clicking buttons, pressing keys, reading text — rather than testing implementation details like state or props directly.

**Core principle:** test behaviour, not implementation.

```jsx
// ✅ Good — tests what the user sees and does
expect(screen.getByText('MU')).toBeInTheDocument()
fireEvent.click(screen.getByLabelText('Close chart'))
expect(onClose).toHaveBeenCalledOnce()

// ❌ Avoid — tests internal implementation
expect(component.state.showTV).toBe(false)
```

### Component tests in this app

#### `TradingViewModal.test.jsx`
Tests the TradingView chart modal component.

| Test | What it verifies |
|---|---|
| Renders ticker and company name | Modal shows the correct ticker and company |
| Renders TradingView label | "TradingView" badge is visible |
| Iframe has correct src for US ticker | `MU` → TradingView URL contains `MU` |
| European ticker exchange mapping | `NEM.DE` → URL contains `XETR:NEM` |
| ✕ button calls onClose | User can close the modal via button |
| Escape key calls onClose | User can close the modal via keyboard |
| Overlay click calls onClose | User can close by clicking outside |
| Modal content click does NOT close | Clicking inside modal doesn't dismiss it |

#### `ImportBox.test.jsx`
Tests the `normalizeTicker` function — the single normalisation point for CSV imports.

| Test | What it verifies |
|---|---|
| Strips `.US` from American tickers | `TER.US` → `TER` |
| Case-insensitive strip | `mu.us` → `MU` |
| Preserves `.DE` (Xetra) | `NEM.DE` → `NEM.DE` |
| Preserves `.AS` (Amsterdam) | `ASML.AS` → `ASML.AS` |
| Preserves `.PA` (Paris) | `AIR.PA` → `AIR.PA` |
| Preserves `.L` (London) | `SHEL.L` → `SHEL.L` |
| Preserves `.MC` (Madrid) | `ITX.MC` → `ITX.MC` |
| Bare tickers unchanged | `MU` → `MU` |
| Uppercase normalisation | `gen` → `GEN` |
| Whitespace trimmed | ` MU.US ` → `MU` |

#### `AllStocksPage.test.jsx`
Tests the Investment Score calculation and horizon key mapping — pure functions extracted from `AllStocksPage.jsx`.

| Test group | What it verifies |
|---|---|
| `calcScore` | Score for strong ticker (MU-like) = 94 |
| `calcScore` | EPS negative penalty = −20 points |
| `calcScore` | Score clamps to 0 minimum |
| `calcScore` | Handles null PEG/margin gracefully |
| `calcScore` | Returns null when no fundamentals |
| `horizon key mapping` | `1M→u1`, `3M→u3`, `6M→u6`, `12M→u12` |
| `horizon key mapping` | `12M` does NOT map to `u12m` (regression test for fixed bug) |
| `upsideScore` | Correct bucket for each threshold |
| `pegScore` | Peter Lynch scale: ≤0.5 → 100, ≤1.0 → 85, ≤2.0 → 30, >2 → 0 |

---

## Why testing matters — lessons from this project

Several bugs in v7.1.x would have been caught immediately by component tests:

| Bug | Version | How a test would have caught it |
|---|---|---|
| `hKey = 'u12m'` instead of `'u12'` | v7.1.1 | `expect(HORIZON_KEY['12M']).toBe('u12')` |
| `cn is not defined` in StockRow | v7.1.4 | Component render test would fail at setup |
| `fundamentals` only from active batch | v7.1.1 | Test with multi-batch props would show `--` |
| `colSpan={16}` breaking panel after new column | v7.1.4 | Snapshot test would detect column count change |

---

## Adding new tests

When adding a new component, create a corresponding test file in `src/components/__tests__/`.

**Template:**
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MyComponent from '../MyComponent.jsx'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop="value" />)
    expect(screen.getByText('expected text')).toBeInTheDocument()
  })

  it('calls handler on click', () => {
    const handler = vi.fn()
    render(<MyComponent onClick={handler} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledOnce()
  })
})
```

**Common RTL queries:**
```js
screen.getByText('text')           // exact text match
screen.getByRole('button')         // ARIA role
screen.getByLabelText('label')     // form label
screen.getByTitle('title')         // title attribute
screen.queryByText('text')         // returns null if not found (no throw)
```

**Common matchers (jest-dom):**
```js
expect(el).toBeInTheDocument()
expect(el).toHaveTextContent('text')
expect(el).toBeVisible()
expect(el).toBeDisabled()
expect(el).toHaveClass('classname')
```

---

## Test coverage targets (v7.2.0)

| Area | Current | Target |
|---|---|---|
| Pure utils (dates, stocks) | ~90% | 90%+ |
| Pure hook logic | ~80% | 80%+ |
| Component behaviour | 0% → **43 tests** | Growing |
| API calls (Finnhub, Supabase) | Not tested | Intentionally excluded |

API calls are excluded from unit tests because they require network mocking (MSW) which adds significant complexity. They are verified manually through the app.
