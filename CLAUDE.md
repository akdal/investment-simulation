# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Investment Simulation is a React-based interactive web application for modeling startup funding rounds and cap tables.

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
- **Upstash Redis** for data persistence
- **Vercel** for deployment and serverless API
- **lucide-react** for icons

## Data Persistence

**IMPORTANT: Use Upstash Redis for ALL user data - NOT localStorage!**

- User simulation data must be stored in Upstash Redis via API
- localStorage should only be used for client-side preferences (display settings, etc.)
- API endpoints are in `/api/` directory
- Redis keys: `sim:{id}` for shared simulations, `user:{userId}:simulations` for user data

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login` | Password authentication |
| `POST /api/auth/verify` | Token verification |
| `POST /api/sim/save` | Save simulation to Redis |
| `GET /api/sim/[id]` | Load shared simulation from Redis |

## Architecture

### Key Source Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Desktop app, state management |
| `src/components/mobile/MobileApp.tsx` | Mobile view-only app |
| `src/components/RoundTable.tsx` | Cap table display |
| `src/lib/calc.ts` | Financial calculations |
| `src/types.ts` | TypeScript type definitions |
| `api/sim/save.ts` | Redis save API |
| `api/sim/[id].ts` | Redis load API |

### Domain Model

```typescript
Investor { id, name, type: 'FOUNDER' | 'INVESTOR' | 'EMPLOYEE' }
Investment { id, investorId, amount, shares, isSecondary, sellerId? }
Round { id, name, date, preMoneyValuation, postMoneyValuation, sharePrice, totalNewShares, investmentAmount, investments[] }
Simulation { id, name, rounds[], investors[], investorGroups[], createdAt, updatedAt }
```

## Deployment

- **Platform**: Vercel
- **API**: Vercel Serverless Functions (`/api/`)
- **Database**: Upstash Redis (env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
