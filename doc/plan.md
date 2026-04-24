# TradeGuard Implementation Plan (Local-Only Architecture)

## 1. Project Goal
Build a web app (`TradeGuard`, a.k.a. `The 100-Trade Challenge`) that converts trading signals into exact execution parameters while enforcing strict risk control per trade.

Primary outcomes:
- Real-time calculation of quantity and position size from Entry, SL, and risk settings.
- Consistent risk enforcement with a toggle between `% risk` and `$ fixed risk`.
- Trade journaling and survival tracking across 100 trades.
- Signal paste parsing to reduce manual input.

This project is intentionally local-first. No backend/database integration will be added.

## 2. Scope Definition
### In Scope
- Vue.js frontend for calculator, journal, analytics views.
- Smart calculator with dynamic risk switch (`percent` or `fixed`).
- Survival stats and compliance-focused analytics.
- Signal parser (regex-based quick paste).
- Pinia state management with browser `localStorage` persistence.
- In-app controls to clear stored data.

### Out of Scope (for initial implementation)
- Direct live order placement on exchange.
- Full OCR pipeline from image screenshots.
- Advanced portfolio-level multi-asset risk netting.
- Any backend API, Laravel service, or external database.

## 3. Product Modules
### 3.1 Smart Calculator Engine
Inputs:
- Entry Price
- Stop Loss Price
- Account Balance
- Risk Mode (`percent` or `fixed`)
- Risk Value (e.g., `1` for 1% or $1)
- Direction (`long` or `short`)

Real-time outputs:
- Risk Amount
- Risk Per Unit
- Quantity to Buy/Sell
- Total Position Size (USDT)
- Target prices for 1R, 2R, 3R

Core formulas:
- `riskAmount = riskMode === "percent" ? balance * (riskValue / 100) : riskValue`
- `riskPerUnit = abs(entryPrice - stopLoss)`
- `quantity = riskAmount / riskPerUnit`
- `positionSizeUSDT = quantity * entryPrice`
- Long targets: `entry + N * riskPerUnit`
- Short targets: `entry - N * riskPerUnit`

Validation rules:
- Block calculation when `entryPrice <= 0`, `stopLoss <= 0`, `riskValue <= 0`, or `riskPerUnit == 0`.
- Enforce numeric precision and safe rounding display.

### 3.2 Risk Input Group
- Numeric input (default: `1`).
- Unit toggle (`%` / `$`) as segmented control.
- Live helper label: `You are risking $X.XX on this trade.`
- Immediate recalculation when value/mode changes.

### 3.3 Execution Card
- Prominent display:
  - Quantity
  - Position size in USDT
  - Risk amount
  - 1R/2R/3R targets
- Buttons:
  - `Set 1:1 Target`
  - `Set 1:2 Target`
  - `Set 1:3 Target`
- Each button copies the corresponding target to clipboard with feedback.

### 3.4 Signal Parser (Quick Paste)
Input:
- Free-text signal from Telegram/Discord/etc.

Parsing:
- Entry (single): `/(?:entry|at|price)[:\s]*([\d.]+)/i`
- Entry (range): `/(?:entry|at|price)[:\s]*([\d.]+)\s*[-–]\s*([\d.]+)/i`
- SL: `/(?:sl|stop|stop loss)[:\s]*([\d.]+)/i`
- Targets: `/(?:tp|target|targets?)[:\s]*([^\n]+)/i`, then extract numbers with `/[\d.]+/g`

Behavior:
- If entry range exists, store min/max and default execution entry to midpoint.
- Prefill extracted values into form.
- Show non-blocking warning when partial parse occurs.

### 3.5 Trade Journal (100-Trade Tracker)
- Create trade record when opened.
- Store planned risk and calculated execution details.
- Log final outcome: `Win`, `Loss`, `Breakeven`.
- Keep open vs closed trade separation.

### 3.6 Analytics and Survival Dashboard
Top bar:
- Current balance
- Losses remaining

Metrics:
- Average Risk Per Trade
- Risk Compliance Score
- Risk Drift over time
- Win/Loss/Breakeven counts

Visualization:
- 100-cell heatmap:
  - Gray: not taken
  - Red: loss
  - Green: win

## 4. UI/UX Structure
### Layout
- Sidebar navigation:
  - Calculator
  - Journal
  - Analytics
- Sticky top bar with survival stats.
- Main calculator split:
  - Left column: inputs (mobile-first, large touch targets)
  - Right column: execution card
- Bottom action row for target copy buttons.

### UX Principles
- Real-time updates with clear validation.
- No hidden risk assumptions; always show computed risk amount.
- Fast mobile interaction and readable typography.
- Error messages should be precise and actionable.

## 5. Technical Architecture
### Phase 1 Architecture (Frontend-only MVP)
- Vue 3 + Composition API
- Pinia state management (required)
- Browser `localStorage` persistence
- Utility module for formulas and validation

### Phase 2 Architecture (Local Persistence Hardening)
- Pinia store modularization
- Import/export session JSON
- Data reset and clear controls
- Schema versioning for persisted local state

### Phase 3 Architecture (Automation)
- Parser service/module in frontend (or backend validation endpoint if needed)
- Parser confidence flags and parse diagnostics

### Phase 4 Architecture (Execution Integration)
- Optional microservice (Go/Rust) for exchange connectivity
- Secure key management and dry-run mode before live mode

## 6. Data Model (Initial Draft)
### Trade
- `id`
- `symbol`
- `direction` (`long|short`)
- `entryPrice`
- `entryMin` (nullable)
- `entryMax` (nullable)
- `stopLoss`
- `targets` (array)
- `riskMode` (`percent|fixed`)
- `riskValue`
- `riskAmountPlanned`
- `riskPerUnit`
- `quantity`
- `positionSizeUSDT`
- `status` (`open|closed`)
- `outcome` (`win|loss|breakeven|null`)
- `realizedR` (nullable)
- `openedAt`
- `closedAt` (nullable)

### Account Snapshot
- `id`
- `balance`
- `timestamp`

## 7. API Plan (Phase 2)
No API endpoints in scope for this project.
All data storage is local in browser `localStorage`, managed by Pinia.

## 8. Roadmap and Milestones
### Phase 1: MVP Calculator
Deliverables:
- Risk switch + input group
- Real-time calculator
- Execution card + clipboard actions
- Base validation and mobile layout

Acceptance criteria:
- Correct quantity/USDT output for valid inputs
- Correct target values for long/short
- Invalid states blocked with clear feedback

### Phase 2: Persistence
Deliverables:
- Pinia store for calculator, journal, and analytics state
- Browser persistence with hydration on reload
- In-app data management controls (clear/reset/import/export)

Acceptance criteria:
- Trade lifecycle saved and reloaded accurately from local storage
- Journal and stats remain consistent after refresh
- User can clear app data directly from the UI

### Phase 3: Signal Parser
Deliverables:
- Quick paste box
- Regex extraction + field prefill
- Parse warning handling for partial matches

Acceptance criteria:
- Supported signal formats parse reliably
- Manual correction flow remains quick and clear

### Phase 4: Advanced Execution
Deliverables:
- Exchange integration prototype
- Dry-run and risk guardrails
- Optional microservice layer

Acceptance criteria:
- Orders only place when explicit validation passes
- Safe fallback and error handling in all failure paths

## 9. Quality and Validation Plan
- Unit tests for risk formulas and target calculations.
- Parser tests with representative signal samples.
- Frontend component tests for input/validation behavior.
- Manual QA checklist for mobile and desktop UX.

## 10. Risks and Mitigations
- Parsing ambiguity:
  - Mitigation: confidence checks + editable prefill.
- Rounding/precision mistakes:
  - Mitigation: centralized numeric utility + test coverage.
- User over-risking through wrong mode:
  - Mitigation: persistent visible risk preview and mode highlight.
- Scope creep in Phase 1:
  - Mitigation: strict MVP acceptance gate before API/exchange work.

## 11. Definition of Done (Per Release)
- Features match approved scope.
- Validation and error states implemented.
- Core calculations covered by tests.
- No blocking UI defects in key user flows.
- Basic documentation updated.

## 12. Approval Gate
Status: `Approved`

Planned next action after approval:
- Continue implementation with Pinia-only local persistence.
- Keep backend/database items out of scope unless explicitly re-approved.
