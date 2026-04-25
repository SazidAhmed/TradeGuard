# TradeGuard Improvement List

1. Break up the giant page component.  
   `app/pages/index.vue` holds nearly the entire app UI and interaction logic. Split it into tab-level and card-level components first. That is the biggest maintainability problem.

2. Separate business logic from UI formatting.  
   The page is doing calculations, chart shaping, toast state, modal state, and rendering in one place. Move chart prep, formatting helpers, and interaction flows into composables or store helpers.

3. Fix session persistence for custom target ratios.  
   `targetRatios` exists in state and is imported in `importSessionData()`, but it is missing from `PersistedState` and `buildPersistedState()` in `app/stores/tradeguard.ts`. Custom targets will not persist correctly.

4. Add schema validation for imported session files.  
   `importSessionData()` trusts the JSON shape too much. A malformed file can leave the app in a bad state. Use a validator and reject partial or invalid payloads cleanly.

5. Add automated tests for core calculator logic.  
   There are no tests in the repo. The risk math, target calculation, PnL, win rate, and persistence flows should have unit tests before more features are added.

6. Normalize and harden the signal parser.  
   `parseSignal()` is regex-heavy and brittle. It should normalize pasted text, support common Telegram and Discord formatting, and avoid encoding issues like the mojibake visible in the entry-range regex.

7. Rework persistence strategy.  
   The page deep-watches the entire store and writes to localStorage on every state change. Debounce it and persist only the fields that matter.

8. Improve accessibility on icon-only controls and dialogs.  
   The dark-mode toggle, copy buttons, nav buttons, and confirmation modal need proper labels, focus handling, and keyboard support. Right now the app is visually usable, but not accessibility-safe.

9. Make the stats model more explicit.  
   `currentBalance`, `realizedPnL`, `riskComplianceScore`, and `survivalLossesRemaining` are useful, but the assumptions are hidden. Add definitions or tooltips and make it clear whether values are based on planned risk, actual risk, or realized outcomes.

10. Prevent invalid trade state transitions.  
    The trade log allows combinations that are logically weak, like setting target hit multiple independently from outcome. Tighten the state model so `Win`, `Loss`, `Breakeven`, and `Open` behave consistently.

11. Improve the desktop layout beyond a centered mobile shell.  
    The app is still essentially a phone UI stretched onto desktop. Use a wider desktop layout with better information density, especially for calculator inputs and stats.

12. Reduce visual complexity in the calculator tab.  
    The app has a lot of gradients, decorative surfaces, and small text. The next UI pass should improve scan speed: clearer hierarchy, fewer competing accents, and less compression in the form.

13. Add stronger empty and error states.  
    Import failure, invalid parser input, insufficient margin, and no-trade states should be more visible and actionable. Right now most feedback is small or easy to miss.

14. Add route structure if the app grows.  
    Tabs are local state only via `activeTab` in the page. If this becomes a real product, move calculator, trade log, and stats into routeable views so state is bookmarkable and easier to maintain.

15. Add documentation that matches the product.  
    The README is still the Nuxt starter. Replace it with actual setup, features, storage behavior, and test instructions.

## Suggested Order

Start with items `3`, `4`, `5`, `1`, and `7`. Those give the biggest quality gain with the least wasted effort.
