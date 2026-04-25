# 🛡️ TradeGuard

**TradeGuard** is a premium risk management dashboard designed for disciplined traders pursuing the **100-Trade Challenge**. It combines advanced position sizing, real-time equity tracking, and psychological state management into a sleek, mobile-first experience.

![Dashboard Preview](https://via.placeholder.com/800x450/4f46e5/ffffff?text=TradeGuard+Dashboard)

## ✨ Core Features

- **🎯 Smart Risk Calculator**: Dynamic position sizing with support for leverage, percentage risk, and custom target multiples.
- **⚡ AI Signal Parser**: Paste a raw signal from Telegram or Discord, and let TradeGuard extract Entry, Stop Loss, and Leverage automatically.
- **📈 Real-time Equity Curve**: Visualize your growth with a live SVG chart that updates as you log trades.
- **🛡️ 100-Trade Heatmap**: Track your progress through the 100-trade challenge with a visual grid.
- **🌓 Adaptive Dark Mode**: High-contrast, premium aesthetic with glassmorphism and smooth micro-animations.
- **💾 Persistent State**: Your data is automatically saved to LocalStorage with Zod-validated schema protection.
- **📱 PWA Ready**: Optimized for mobile with touch-friendly targets, bottom-sheet interactions, and scroll-driven header compression.

## 🛠️ Technology Stack

- **Framework**: [Nuxt 3](https://nuxt.com/) (Vue.js 3)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn-vue](https://www.shadcn-vue.com/)
- **Validation**: [Zod](https://zod.dev/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **Utilities**: [VueUse](https://vueuse.org/)

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- npm / pnpm / yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SazidAhmed/TradeGuard.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📂 Architecture

The project follows a modular architecture for better maintainability:

```text
/app
  /components
    /trade        # Feature-specific components (Calculator, Trades, Stats)
    /ui           # Base UI components (Buttons, Cards, Inputs)
  /composables    # Shared logic (Formatting, Analytics)
  /stores         # Global state with persistence (Pinia)
  /assets         # Global styles and animations
```

## 📝 License
MIT License. Created by Sazid Ahmed.
