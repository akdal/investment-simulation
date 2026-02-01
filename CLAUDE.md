# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Investment Simulation is a React-based interactive web application for modeling startup funding rounds and cap tables. It's a client-side only application with localStorage persistence (no backend).

## Development Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript compile + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

## Tech Stack

- **React 19** with TypeScript (strict mode)
- **Vite 7** for build tooling
- **Tailwind CSS 4** for styling
- **lucide-react** for icons
- **clsx + tailwind-merge** for className utilities

## Architecture

### State Management
- Centralized state in `App.tsx` using React hooks (useState, useEffect)
- Two main state objects: `rounds` and `investors`
- Auto-persisted to localStorage on every change

### Data Flow
1. User modifies round/investor data in UI
2. `calculateRoundMetrics()` computes share prices, new shares, post-money valuations
3. `calculateCapTable()` aggregates all rounds into current shareholdings
4. State saved to localStorage and UI re-renders

### Key Source Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app component, state management, localStorage persistence |
| `src/components/RoundColumn.tsx` | Individual funding round editor (valuation, investments) |
| `src/lib/calc.ts` | Financial calculations (round metrics, cap table aggregation) |
| `src/types.ts` | TypeScript type definitions for domain model |
| `src/components/ui/` | Reusable UI primitives (Button, Card, Input, Label) |
| `src/lib/utils.ts` | Utility functions (`cn` for className merging) |

### Domain Model

```typescript
Investor { id, name, type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' }
Investment { id, investorId, amount, shares, isSecondary, sellerId? }
Round { id, name, date, preMoneyValuation, postMoneyValuation, sharePrice, totalNewShares, investmentAmount, investments[] }
```

- **Primary investments**: New share issuance (increases total shares)
- **Secondary investments**: Share transfers between existing shareholders

### Calculation Logic (`src/lib/calc.ts`)

- `calculateRoundMetrics()`: Given pre-money valuation and existing shares, computes share price, new shares from investments, and post-money valuation
- `calculateCapTable()`: Iterates through all rounds chronologically, tracks share transfers (primary and secondary), returns current shareholdings per investor

## Data Persistence

- Uses browser `localStorage` with keys: `rounds`, `investors`
- No backend API - all data is client-side only
- Default: Creates a "Founder" investor on first load

## Deployment

Static site build outputs to `dist/`. Compatible with any static hosting (Vercel, Netlify, GitHub Pages, etc.).
