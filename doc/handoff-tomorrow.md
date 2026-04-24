# TradeGuard Handoff Notes (For Tomorrow)

## 1) Project Direction (Locked)
- App is **local-only**.
- No backend, no Laravel API, no external database.
- State management is **Pinia**.
- Persistence is browser **localStorage**.
- User can clear data directly from app UI.

## 2) Current Architecture
- Nuxt + Vue + Pinia frontend.
- Main store: `app/stores/tradeguard.ts`
- Main UI page: `app/pages/index.vue`
- Docs:
  - Plan: `doc/plan.md`
  - Implemented features: `doc/Features.md`

## 3) Implemented Features Snapshot
- Smart calculator (entry, SL, balance, risk mode/value, direction).
- Risk switch `%` / `$`, real-time outputs, validation guards.
- Target generation (1R/2R/3R) + clipboard copy actions.
- Signal parser with regex (entry, range, SL, targets, multiline fallback).
- Local trade log with outcomes and editable actual risk.
- Analytics:
  - Avg risk/trade
  - Compliance score
  - Risk drift
  - W/L/BE
  - Win rate
  - Net R
- 100-trade heatmap and progress tracking.
- Session tools:
  - Export/Import JSON
  - Clear log
  - Clear all app data
  - Reset calculator inputs

## 4) Important Files to Check First Tomorrow
- `app/stores/tradeguard.ts`
- `app/pages/index.vue`
- `doc/Features.md`
- `doc/plan.md`

## 5) Last Verified State
- Diagnostics were clean on edited files.
- `npm run build` passed successfully.
- No backend integration in scope.

## 6) Recommended Next Implementation Steps
- Add internal view mode switching in UI:
  - `Calculator` / `Journal` / `Analytics` focused tabs.
- Split `index.vue` into smaller components:
  - `CalculatorPanel`
  - `ExecutionCard`
  - `AnalyticsPanel`
  - `TradeLogPanel`
- Add safer import validation:
  - schema/version check before applying imported JSON.
- Add small UX polish:
  - confirmation dialog before `Clear All App Data`.

## 7) Resume Prompt (Suggested)
Use this tomorrow:

"Continue from `doc/handoff-tomorrow.md`. Keep local-only Pinia architecture. Start by implementing focused view mode tabs and component-splitting without changing existing calculations."
