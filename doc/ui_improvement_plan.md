### 🏗️ Technical & Architectural

- [x] **Component Refactoring:** Break up `index.vue` into smaller tab-level and card-level components for better maintainability.
- [x] **Logic Separation:** Move business logic, chart shaping, and formatting helpers into dedicated composables or store helpers.
- [x] **Persistence Fix:** Add `targetRatios` to `PersistedState` in `tradeguard.ts` to ensure custom targets persist across sessions.
- [x] **Import Validation:** Implement schema validation (e.g., Zod) for imported JSON files to prevent app crashes.
- [ ] **Automated Testing:** Add unit tests for risk math, target calculations, and PnL logic.
- [x] **State Hardening:** Prevent invalid trade transitions (e.g., locking outcomes to specific target multiples) and harden the Signal Parser regex.
- [x] **Storage Optimization:** Debounce localStorage writes and persist only essential fields.
- [ ] **Routing:** Implement a proper route structure for tabs if the app complexity continues to grow.

### 📐 Advanced UX & Layout

- [x] **Desktop Layout:** Move beyond a centered mobile shell to a wide desktop-first layout with higher info density.
- [x] **Accessibility:** Add ARIA labels, focus handling, and keyboard support to icon-only controls.
- [x] **Clarity & Hierarchy:** Reduce visual complexity by refining gradients and improving the hierarchy of the calculator form.
- [ ] **Explanatory Stats:** Add tooltips or definitions to stats like "Survival" and "Risk Compliance" to make the underlying assumptions clear.
- [x] **Error Handling:** Implement stronger visual feedback for import failures, invalid parser input, and insufficient margin.
- [x] **Project Documentation:** Update the README with actual product setup, features, and technical architecture.
