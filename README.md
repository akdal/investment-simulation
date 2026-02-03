# Investment Simulation (Cap Table Management)

A local web application for simulating and managing investment rounds, cap tables, and secondary transactions. Built with React, TypeScript, Vite, and Tailwind CSS.

## Features

### Core Capabilities
- **Cap Table Engine**: real-time calculation of ownership percentages, post-money valuation, and dilution.
- **Round Management**: Add/Edit funding rounds (Seed, Series A, etc.), set pre-money/post-money valuations.
- **Investment Handling**: Support for primary issuance and secondary transactions (buying/selling existing shares).
- **Multiple Simulations**: Create and switch between different scenarios to compare outcomes.
- **Data Persistence**: All changes are automatically saved to `localStorage`.
- **Export Options**: Export cap table as JSON or high-resolution PDF (A4 landscape).

### User Interface
- **Desktop Dashboard**: Split view with Round Editor panel and Cap Table visualization.
- **Mobile View-Only Mode**: Responsive mobile interface (<768px) with:
  - Login/logout support with password authentication
  - Simulation selector for authenticated users
  - Shared link support (`?id=xxx`) for read-only access
  - Tab navigation between rounds and investors
  - Expandable round cards with detailed investment breakdowns
- **Interactive**: Drag-and-drop ordering (future), inline editing for amounts and names.
- **Localization**: Full Korean language support for all UI elements and investment terms.

## Tech Stack
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4)
- **Icons**: Lucide React
- **State/Storage**: Local React state + LocalStorage

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Status
- [x] Core Logic & Calculation
- [x] UI Implementation & Polish
- [x] Secondary Transaction Support
- [x] Mobile View-Only Mode
- [x] Authentication & Shared Links
- [x] Export to PDF
- [ ] Export to Excel (Planned)
- [ ] Option Pool Management (Planned)
