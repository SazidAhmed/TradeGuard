<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted, ref, watch, computed } from "vue";
import { useDark, useToggle, useScroll, watchDebounced } from "@vueuse/core";
import {
  Clipboard,
  TriangleAlert,
  Calculator,
  List,
  BarChart3,
  Zap,
  TrendingUp,
  TrendingDown,
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileUp,
  FileDown,
  Trophy,
  Target,
  Flame,
  Sun,
  Moon,
  Wand2,
  ShieldAlert,
  LineChart,
} from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { useFormatting } from "~/composables/useFormatting";
import CalculatorTab from "~/components/trade/CalculatorTab.vue";
import TradesTab from "~/components/trade/TradesTab.vue";
import StatsTab from "~/components/trade/StatsTab.vue";
import { Button } from "~/components/ui/button";

useSeoMeta({
  title: "TradeGuard | Smart Risk Calculator",
  description:
    "Position sizing and execution planning for the 100-Trade Challenge.",
});

type Tab = "calculator" | "trades" | "stats";

const store = useTradeguardStore();
const {
  accountBalance,
  riskAmount,
  currentBalance,
  survivalLossesRemaining,
  tradeLog,
  parserMessage,
} = storeToRefs(store);

const { formatCompactMoney } = useFormatting();

const isDark = useDark();
const toggleDark = useToggle(isDark);

const activeTab = ref<Tab>("calculator");
const copyMessage = ref("");
const importFileInput = ref<HTMLInputElement | null>(null);

const scrollTarget = ref<HTMLElement | null>(null);
const { y: scrollY } = useScroll(scrollTarget);

const isRefreshing = ref(false);

const showToast = (message: string, duration = 2000) => {
  copyMessage.value = message;
  setTimeout(() => {
    copyMessage.value = "";
  }, duration);
};

const openImportSessionDialog = () => {
  importFileInput.value?.click();
};

const importSession = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    store.importSessionData(JSON.parse(text) as unknown);
  } catch {
    parserMessage.value = "Import failed: invalid session JSON file.";
  } finally {
    input.value = "";
  }
};

const showClearConfirm = ref<"trades" | "all" | null>(null);

const confirmClearAll = (type: "trades" | "all") => {
  showClearConfirm.value = type;
};

const executeClearAll = () => {
  if (showClearConfirm.value === "all") {
    store.clearAllData();
  } else if (showClearConfirm.value === "trades") {
    store.clearTradeLog();
  }
  showClearConfirm.value = null;
};

onMounted(() => {
  store.hydrateFromStorage();
});

watchDebounced(
  () => store.$state,
  () => store.persistToStorage(),
  { deep: true, debounce: 500 },
);
</script>

<template>
  <div
    class="relative min-h-screen font-sans transition-colors duration-500"
    :class="
      isDark ? 'dark bg-[#0a0a0c] text-slate-100' : 'bg-slate-50 text-slate-900'
    "
  >
    <!-- Hidden File Input for Import -->
    <input
      ref="importFileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="importSession"
    />

    <!-- Main Container -->
    <div
      ref="scrollTarget"
      class="mx-auto flex h-screen w-full flex-col overflow-y-auto overflow-x-hidden scrollbar-hide md:max-w-6xl md:px-6"
    >
      <!-- Pull-to-refresh Visual -->
      <div
        class="flex flex-col items-center justify-center transition-all duration-300 pointer-events-none"
        :style="{
          height: isRefreshing ? '80px' : '0px',
          opacity: isRefreshing ? 1 : 0,
        }"
      >
        <div
          class="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg animate-spin"
        >
          <Zap class="h-5 w-5" />
        </div>
        <span
          class="text-[10px] font-black uppercase tracking-widest mt-2 text-indigo-600"
          >Refreshing...</span
        >
      </div>

      <!-- HEADER -->
      <header
        class="sticky top-0 z-50 p-4 pb-2 transition-all duration-300 border-b border-transparent"
        :class="
          scrollY > 20
            ? 'bg-background/80 backdrop-blur-xl border-border/50 shadow-sm'
            : 'bg-transparent'
        "
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
            >
              <Zap class="h-6 w-6" />
            </div>
            <div>
              <h1
                class="text-xl font-black tracking-tight uppercase md:text-2xl"
              >
                Trade<span class="text-indigo-600">Guard</span>
              </h1>
              <div class="flex items-center gap-1.5">
                <span
                  class="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                ></span>
                <span
                  class="text-[10px] font-black text-muted-foreground uppercase tracking-widest"
                  >System Online</span
                >
              </div>
            </div>
          </div>

          <!-- Desktop Navigation -->
          <div
            class="hidden md:flex items-center gap-4 bg-muted/30 p-1.5 rounded-2xl border border-border/50"
          >
            <button
              v-for="tab in ['calculator', 'trades', 'stats'] as const"
              :key="tab"
              class="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300"
              :class="
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = tab"
            >
              {{ tab }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              class="rounded-xl h-10 w-10 transition-transform active:scale-90"
              @click="toggleDark()"
            >
              <component :is="isDark ? Sun : Moon" class="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="rounded-xl h-10 w-10 transition-transform active:scale-90"
            >
              <Settings class="h-5 w-5" />
            </Button>
          </div>
        </div>

        <!-- Quick Stats Row (Collapsing) -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 -translate-y-2 max-h-0"
          enter-to-class="opacity-100 translate-y-0 max-h-20"
          leave-from-class="opacity-100 translate-y-0 max-h-20"
          leave-to-class="opacity-0 -translate-y-2 max-h-0"
        >
          <div
            v-if="scrollY <= 50"
            class="mt-3 flex items-center justify-between text-xs text-muted-foreground overflow-hidden"
          >
            <span
              >Balance:
              <strong
                :class="
                  currentBalance >= accountBalance
                    ? 'text-emerald-600'
                    : 'text-gray-900 dark:text-white'
                "
                >{{ formatCompactMoney(currentBalance) }}</strong
              ></span
            >
            <span
              >Trades:
              <strong class="text-gray-900 dark:text-white"
                >{{ tradeLog.length }}/100</strong
              ></span
            >
            <span
              >Survival:
              <strong class="text-indigo-600">{{
                survivalLossesRemaining
              }}</strong></span
            >
          </div>
        </Transition>
      </header>

      <!-- Tab Content Area / Dashboard Grid -->
      <main class="flex-1 pb-32 pt-2">
        <!-- Unified Tab View -->
        <div class="w-full max-w-5xl mx-auto">
          <Transition name="fade-slide" mode="out-in">
            <div key="calculator" v-if="activeTab === 'calculator'">
              <h2
                class="hidden md:flex px-4 mb-4 text-xs font-black uppercase tracking-[0.2em] text-indigo-600/60 items-center gap-2"
              >
                <Calculator class="h-4 w-4" /> Position Calculator
              </h2>
              <CalculatorTab :show-toast="showToast" />
            </div>

            <div key="trades" v-else-if="activeTab === 'trades'">
              <div
                class="hidden md:flex items-center justify-between px-4 mb-4"
              >
                <h2
                  class="text-xs font-black uppercase tracking-[0.2em] text-indigo-600/60 flex items-center gap-2"
                >
                  <List class="h-4 w-4" /> Recent Executions
                </h2>
              </div>
              <TradesTab
                :show-toast="showToast"
                :open-import-dialog="openImportSessionDialog"
                @clear-trades="confirmClearAll('trades')"
              />
            </div>

            <div key="stats" v-else-if="activeTab === 'stats'">
              <h2
                class="hidden md:flex px-4 mb-4 text-xs font-black uppercase tracking-[0.2em] text-indigo-600/60 items-center gap-2"
              >
                <BarChart3 class="h-4 w-4" /> Performance Metrics
              </h2>
              <StatsTab />
            </div>
          </Transition>
        </div>
      </main>

      <!-- BOTTOM NAVIGATION (Mobile Only) -->
      <nav class="md:hidden fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md p-4">
        <div
          class="flex h-18 items-center justify-around rounded-[24px] bg-background/80 border border-indigo-100 dark:border-indigo-900/40 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] px-2"
        >
          <button
            v-for="tab in ['calculator', 'trades', 'stats'] as const"
            :key="tab"
            class="relative flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-300 h-16"
            :class="
              activeTab === tab
                ? 'text-indigo-600 scale-110'
                : 'text-muted-foreground hover:text-indigo-500'
            "
            @click="activeTab = tab"
          >
            <!-- Active Indicator Pill -->
            <div
              v-if="activeTab === tab"
              class="absolute inset-x-2 -inset-y-1 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 -z-10 animate-in fade-in zoom-in-90 duration-300"
            ></div>

            <component
              :is="
                tab === 'calculator'
                  ? Calculator
                  : tab === 'trades'
                    ? List
                    : BarChart3
              "
              class="h-5 w-5"
              :class="activeTab === tab ? 'animate-bounce-short' : ''"
            />
            <span class="text-[9px] font-black uppercase tracking-widest">{{
              tab
            }}</span>

            <!-- Tab Badge (for trades) -->
            <div
              v-if="tab === 'trades' && tradeLog.length > 0"
              class="absolute -top-1 right-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white shadow-lg shadow-red-500/40 border border-white dark:border-black"
            >
              {{ tradeLog.length }}
            </div>

            <!-- Dot Indicator -->
            <div
              v-if="activeTab === tab"
              class="absolute -bottom-2 h-1 w-1 rounded-full bg-indigo-600"
            ></div>
          </button>
        </div>
      </nav>

      <!-- Global Toast Notification -->
      <div
        class="fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 transform items-center gap-3 rounded-2xl bg-gray-950/90 dark:bg-indigo-950/90 px-5 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-xl border border-white/10 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        :class="
          copyMessage
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        "
      >
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40"
        >
          <Zap class="h-3.5 w-3.5 text-white" />
        </div>
        <span>{{ copyMessage }}</span>
      </div>

      <!-- Modals -->
      <Transition name="fade-slide">
        <div
          v-if="showClearConfirm !== null"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <div
            class="w-full max-w-xs rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-card p-5 shadow-xl"
          >
            <div
              class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20"
            >
              <TriangleAlert class="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 class="mb-2 text-center text-lg font-bold">Are you sure?</h3>
            <p class="mb-5 text-center text-sm text-muted-foreground">
              {{
                showClearConfirm === "all"
                  ? "This will permanently clear ALL app data and reset the calculator."
                  : "This will permanently clear your entire trade log and reset stats."
              }}
            </p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                class="flex-1"
                @click="showClearConfirm = null"
                >Cancel</Button
              >
              <Button
                variant="destructive"
                class="flex-1"
                @click="executeClearAll()"
                >Delete</Button
              >
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.9) opacity-0;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.glow-emerald {
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}
.glow-red {
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
}

@keyframes success-bounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes bounce-short {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.animate-bounce-short {
  animation: bounce-short 1s ease-in-out infinite;
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stagger-1 {
  animation-delay: 0.1s;
}
.stagger-2 {
  animation-delay: 0.2s;
}
.stagger-3 {
  animation-delay: 0.3s;
}
.stagger-4 {
  animation-delay: 0.4s;
}
.stagger-5 {
  animation-delay: 0.5s;
}
</style>
