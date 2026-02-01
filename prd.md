# Product Requirements Document (PRD)

## Project Overview
**Title:** Investment Simulation Web App
**Goal:** Create a simple, local-first web application to simulate startup investment rounds, manage cap tables, and visualize ownership dilution. The app focuses on ease of use and instant visual feedback.

## User Stories
1. **Manage Rounds:**
   - User can create multiple funding rounds (e.g., Founding, Angel, Series A).
   - User can define Pre-Money Valuation for each round.
   - User can input investment amounts for new investors.
   - User handles "Round 1" specially (e.g., Founding round) where Pre-Money might be zero or effectively just initial issuance.

2. **Manage Investors:**
   - User can add new investors to a round.
   - User can select existing investors to make follow-on investments.
   - User can view the list of investors in each round.

3. **Cap Table Calculation:**
   - App automatically calculates Shares Issued based on Investment Amount and Share Price.
   - App calculates Post-Money Valuation.
   - App tracks total shares and ownership percentages across rounds.
   - **Secondary Transactions:** User can model simple secondary sales (Old Investor sells to New/Existing Investor) which affects ownership but not necessarily the company's cash-in (unless mixed).

4. **Persistence:**
   - Data is saved locally in the browser (LocalStorage) so the user doesn't lose progress on refresh.

5. **Visualization:**
   - A Cap Table summary view showing current ownership shares and percentage.
   - Visual cards for each round with inputs and summary metrics.

## Technical Requirements
- **Stack:** Vite + React + TypeScript.
- **Styling:** Tailwind CSS for rapid, clean 2D UI.
- **Data Storage:** LocalStorage.
- **No Backend:** Fully client-side logic.

## UX/UI Design Guidelines
- **Layout:** Horizontal scrolling or grid layout for Rounds.
- **Interactions:** Inline editing where possible. "Add" buttons clearly visible.
- **Aesthetics:** Clean, modern, using slate/gray scales with clear accent colors for actions.

## Future Scope (Not in MVP)
- Export to Excel/PDF.
- Complex convertible notes (SAFE/KISS).
- Employee Option Pool management (scenarios).
