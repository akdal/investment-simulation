# Product Requirements Document (PRD)

## Project Overview
**Title:** Investment Simulation Web App
**Goal:** Create a simple, local-first web application to simulate startup investment rounds, manage cap tables, and visualize ownership dilution. The app focuses on ease of use and instant visual feedback.

## Implemented Features

### 1. Round Management
- Create/edit/delete multiple funding rounds (Founding, Angel, Series A, etc.)
- Define Pre-Money Valuation per round
- Input share price directly per round
- Add investment amounts for investors
- Handle "Founding" round specially (initial share issuance)

### 2. Investor Management
- Add new investors to rounds
- Select existing investors for follow-on investments
- Investor types: FOUNDER, INVESTOR, EMPLOYEE
- View investor list per round

### 3. Cap Table Calculation
- Automatic share calculation based on investment amount and share price
- Post-Money Valuation calculation
- Total shares and ownership percentage tracking across rounds
- **Secondary Transactions:** Model secondary sales (existing shareholder → buyer) affecting ownership

### 4. Data Persistence
- Browser localStorage for data persistence
- Debounced auto-save (300ms)
- Save status indicator ("Saving...", "Saved")
- Last modified timestamp display

### 5. Multi-Simulation Support
- Create/delete/switch between multiple simulations
- Rename simulations via double-click
- Each simulation has independent rounds and investors

### 6. UI/UX Features

#### Layout
- Split-panel design: RoundEditor (left) + RoundTable (right)
- Horizontal scrollable round table
- Sticky first column for investor names

#### Round Table Display
- Round summary rows: Pre-Money, Investment Amount, Post-Money
- Cumulative investment total in summary column
- Share price and total shares display
- Pre-Money multiple indicator (compared to previous round)
  - Green: Up-round (>1x)
  - Gray: Flat (1x)
  - Red: Down-round (<1x)

#### Investor Rows
- Ownership percentage (bold, prominent)
- Post-valuation holdings and share count
- Transaction details: Investment/Buy/Sell with amounts and shares
- Color-coded transactions:
  - Green (emerald): New investment
  - Amber: Secondary buy
  - Violet: Secondary sell

#### Summary Column
- Per-investor summary: Total invested, bought, sold, current holdings
- Cumulative investment total

### 7. Input Features
- Number formatting with comma separators
- Inline editing for round names
- Dropdown selection for existing investors
- Secondary transaction toggle with seller selection

## Technical Stack
- **Framework:** Vite + React 19 + TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **Icons:** lucide-react
- **Utilities:** clsx + tailwind-merge
- **Data Storage:** localStorage (no backend)

## UX/UI Design Guidelines
- Clean, modern aesthetic with slate/gray scales
- Clear accent colors for actions
- Inline editing where possible
- Responsive horizontal scrolling for rounds
- Visual feedback for interactions (hover states, selection highlights)

## Future Scope (Not in MVP)
- Export to Excel/PDF
- Complex convertible notes (SAFE/KISS)
- Employee Option Pool management (scenarios)
- Custom reset dialog styling
