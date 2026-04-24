<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted, ref, watch, computed } from "vue";
import { useDark, useToggle } from "@vueuse/core";
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

useSeoMeta({
  title: "TradeGuard | Smart Risk Calculator",
  description:
    "Position sizing and execution planning for the 100-Trade Challenge.",
});

type Tab = "calculator" | "trades" | "stats";

const store = useTradeguardStore();
const {
  symbol,
  entryPrice,
  stopLoss,
  accountBalance,
  leverage,
  riskMode,
  riskValue,
  direction,
  signalText,
  parserMessage,
  outcomeFilter,
  filteredTrades,
  heatmapCells,
  riskAmount,
  hasInvalidInputs,
  hasInsufficientMargin,
  quantityToBuy,
  totalCostUSDT,
  marginRequiredUSDT,
  targets,
  currentBalance,
  realizedPnL,
  remainingBalance,
  survivalLossesRemaining,
  averageRiskPerTrade,
  riskComplianceScore,
  riskDrift,
  winsCount,
  lossesCount,
  breakevenCount,
  riskPerUnit,
  tradeLog,
  totalTradesCount,
  progressPercent,
  winRate,
  netR,
  targetRatios,
} = storeToRefs(store);

const targetRatiosInput = computed({
  get: () => targetRatios.value.join(", "),
  set: (val: string) => {
    const parsed = val
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (parsed.length > 0) {
      targetRatios.value = parsed;
    }
  },
});

const isDark = useDark();
const toggleDark = useToggle(isDark);

const activeTab = ref<Tab>("calculator");
const copyMessage = ref("");
const importFileInput = ref<HTMLInputElement | null>(null);
const showSignalParser = ref(false);
const showAllTrades = ref(false);

const showToast = (message: string, duration = 2000) => {
  copyMessage.value = message;
  setTimeout(() => {
    copyMessage.value = "";
  }, duration);
};

const logTrade = () => {
  store.logTradeSnapshot();
  showToast('Trade logged! ⚡');
};

const PRICE_DECIMALS = 6;
const QUANTITY_DECIMALS = 4;
const toFixedNumber = (value: number, decimals = PRICE_DECIMALS) =>
  Number(value.toFixed(decimals));
const formatNumber = (value: number, decimals = PRICE_DECIMALS) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const formatCompactMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const copyTarget = async (price: number) => {
  if (!process.client || hasInvalidInputs.value || hasInsufficientMargin.value) return;
  try {
    await navigator.clipboard.writeText(String(price));
    showToast(`Copied target: ${price}`);
  } catch {
    copyMessage.value = "Clipboard permission denied.";
  }
};

const exportSession = () => {
  if (!process.client) return;
  const payload = store.exportSessionData();
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const dateSuffix = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `tradeguard-session-${dateSuffix}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
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

const displayedTrades = computed(() => {
  if (showAllTrades.value) return filteredTrades.value;
  return filteredTrades.value.slice(0, 5);
});

const hasMoreTrades = computed(() => filteredTrades.value.length > 5);

const tradeToDelete = ref<number | null>(null);
const showClearConfirm = ref<'trades' | 'all' | null>(null);

const confirmDeleteTrade = (id: number) => {
  tradeToDelete.value = id;
};

const executeDeleteTrade = () => {
  if (tradeToDelete.value !== null) {
    store.removeTrade(tradeToDelete.value);
    tradeToDelete.value = null;
  }
};

const cancelDeleteTrade = () => {
  tradeToDelete.value = null;
};

const confirmClearAll = (type: 'trades' | 'all') => {
  showClearConfirm.value = type;
};

const executeClearAll = () => {
  if (showClearConfirm.value === 'all') {
    store.clearAllData();
  } else if (showClearConfirm.value === 'trades') {
    store.clearTradeLog();
  }
  showClearConfirm.value = null;
};

const cancelClearAll = () => {
  showClearConfirm.value = null;
};

const formatRelativeTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const getOutcomeColor = (outcome: string) => {
  switch (outcome) {
    case "Win":
      return "bg-emerald-500";
    case "Loss":
      return "bg-red-500";
    case "Breakeven":
      return "bg-amber-400";
    case "Open":
      return "bg-slate-400";
    default:
      return "bg-muted";
  }
};

const getOutcomeTextColor = (outcome: string) => {
  switch (outcome) {
    case "Win":
      return "text-emerald-600";
    case "Loss":
      return "text-red-600";
    case "Breakeven":
      return "text-amber-600";
    case "Open":
      return "text-slate-600";
    default:
      return "text-muted-foreground";
  }
};

const equityCurvePoints = computed(() => {
  const points: { x: number; y: number }[] = [];
  let cumulativePnl = 0;
  
  const reversedTrades = [...tradeLog.value].reverse();
  points.push({ x: 0, y: 0 });
  
  reversedTrades.forEach((trade, idx) => {
    let pnl = 0;
    if (trade.outcome === 'Win' && trade.targetHitMultiple) {
      pnl = trade.actualRiskUsed * trade.targetHitMultiple;
    } else if (trade.outcome === 'Loss') {
      pnl = -trade.actualRiskUsed;
    }
    
    cumulativePnl += pnl;
    points.push({ x: idx + 1, y: cumulativePnl });
  });
  
  return points;
});

const equityCurvePath = computed(() => {
  const points = equityCurvePoints.value;
  if (points.length < 2) return '';
  
  const width = 100;
  const height = 40;
  
  const maxX = points[points.length - 1].x;
  const ys = points.map(p => p.y);
  const maxY = Math.max(...ys, 0.01);
  const minY = Math.min(...ys, -0.01);
  const rangeY = (maxY - minY) || 1;
  
  return points.map(p => {
    const mapX = (p.x / maxX) * width;
    const mapY = height - ((p.y - minY) / rangeY) * height;
    return `${mapX},${mapY}`;
  }).join(' ');
});

const equityCurveArea = computed(() => {
  const points = equityCurvePoints.value;
  if (points.length < 2) return '';
  const path = equityCurvePath.value;
  const width = 100;
  const height = 40;
  const ys = points.map(p => p.y);
  const minY = Math.min(...ys, -0.01);
  const maxY = Math.max(...ys, 0.01);
  const rangeY = (maxY - minY) || 1;
  
  // Zero line Y coordinate
  const zeroY = height - ((0 - minY) / rangeY) * height;
  
  return `${path} ${width},${height} 0,${height}`;
});

onMounted(() => {
  store.hydrateFromStorage();
});

watch(
  () => store.$state,
  () => store.persistToStorage(),
  { deep: true },
);

watch(
  [entryPrice, stopLoss],
  ([newEntry, newSL]) => {
    const entry = Number(newEntry);
    const sl = Number(newSL);
    if (!Number.isNaN(entry) && !Number.isNaN(sl) && entry > 0 && sl > 0) {
      direction.value = entry > sl ? 'long' : 'short';
    }
  }
);
</script>

<template>
  <div
    class="min-h-screen text-foreground md:flex md:items-center md:justify-center relative overflow-hidden bg-muted/20 dark:bg-background"
  >
    <!-- Decorative Desktop Background -->
    <div class="hidden md:block absolute inset-0 pointer-events-none -z-10">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-background to-background dark:from-indigo-900/20 dark:via-background dark:to-background"></div>
      <div class="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px]"></div>
      <div class="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 dark:bg-violet-500/5 blur-[120px]"></div>
    </div>

    <!-- Mobile Container -->
    <main
      class="relative z-10 min-h-screen w-full max-w-[500px] bg-background pb-20 md:max-h-[90vh] md:min-h-0 md:rounded-2xl md:border md:shadow-2xl dark:md:shadow-indigo-900/20 md:overflow-y-auto md:pb-0"
    >
      <!-- Mobile Header -->
      <header class="sticky top-0 z-30 bg-background/95 backdrop-blur px-4 py-3 border-b">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600"
            >
              <Zap class="h-4 w-4 text-white" />
            </div>
            <span class="text-lg font-bold">TradeGuard</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="toggleDark()"
              class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Moon v-if="!isDark" class="h-4 w-4 text-muted-foreground" />
              <Sun v-else class="h-4 w-4 text-muted-foreground" />
            </button>
            <Badge variant="outline" class="text-xs">
              {{ totalTradesCount }}/100
            </Badge>
          </div>
        </div>

        <!-- Quick Stats Row -->
        <div
          class="mt-3 flex items-center justify-between text-xs text-muted-foreground"
        >
          <span
            >Balance:
            <strong :class="currentBalance >= accountBalance ? 'text-emerald-600' : 'text-gray-900 dark:text-white'">{{
              formatCompactMoney(currentBalance)
            }}</strong></span
          >
          <span
            >Risk:
            <strong class="text-gray-900 dark:text-white">{{
              formatCompactMoney(riskAmount)
            }}</strong></span
          >
          <span
            >Survival:
            <strong class="text-indigo-600">{{
              survivalLossesRemaining
            }}</strong></span
          >
        </div>
      </header>

      <!-- Tab Content Area -->
      <Transition name="fade-slide" mode="out-in">
        <!-- CALCULATOR TAB -->
        <section v-if="activeTab === 'calculator'" class="space-y-3 p-4">
        <!-- Results & Risk Row -->
        <div class="flex gap-2">
          <!-- Results Card -->
          <Card
            class="flex-[1.6] overflow-hidden relative border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background/50 shadow-sm"
          >
            <!-- Accent Line -->
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-500"></div>
            
            <CardContent class="p-3 pl-4">
              <div class="mb-1 flex items-center justify-between">
                <span
                  class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >QUANTITY TO BUY</span
                >
                <div
                  class="flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-300 shadow-sm"
                  :class="
                    direction === 'long' ? 'bg-emerald-100 shadow-emerald-500/20' : 'bg-red-100 shadow-red-500/20'
                  "
                >
                  <component
                    :is="direction === 'long' ? TrendingUp : TrendingDown"
                    class="h-3 w-3"
                    :class="
                      direction === 'long' ? 'text-emerald-600' : 'text-red-600'
                    "
                  />
                </div>
              </div>
              <div class="flex items-baseline gap-1">
                <p class="text-3xl font-black tabular-nums tracking-tight dark:text-white transition-all duration-300">
                  {{ hasInvalidInputs ? "---" : toFixedNumber(quantityToBuy, 6) }}
                </p>
              </div>
              <div class="mt-1 flex flex-col gap-0.5 text-[10px] font-medium text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span>Pos: <strong class="text-foreground/80 font-semibold">{{ hasInvalidInputs ? "---" : formatMoney(totalCostUSDT) }}</strong></span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                  <span>Margin: <strong class="text-foreground/80 font-semibold">{{ hasInvalidInputs ? "---" : formatMoney(marginRequiredUSDT) }}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Risk Summary Vertical -->
          <div class="flex flex-1 flex-col gap-2">
            <div
              class="flex-1 rounded-xl border bg-card/50 p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-center"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.02] pointer-events-none"></div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Risk/Unit
              </p>
              <p class="text-sm font-bold tabular-nums dark:text-white mt-0.5">
                {{ hasInvalidInputs ? "---" : toFixedNumber(riskPerUnit, 4) }}
              </p>
            </div>
            <div
              class="flex-1 rounded-xl border bg-card/50 p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-center"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.02] pointer-events-none"></div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Risk Amt
              </p>
              <p class="text-sm font-bold tabular-nums mt-0.5" :class="hasInvalidInputs ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'">
                {{ hasInvalidInputs ? "---" : formatMoney(riskAmount) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Signal Parser (Collapsible) -->
        <div class="rounded-xl bg-card border shadow-sm overflow-hidden transition-all duration-300">
          <button
            class="flex w-full items-center justify-between p-4 transition-colors"
            :class="showSignalParser ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-b' : 'hover:bg-muted/50'"
            @click="showSignalParser = !showSignalParser"
          >
            <div class="flex items-center gap-2">
              <div class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                <Wand2 class="h-3 w-3 text-indigo-600 dark:text-indigo-400" :class="{'animate-pulse': showSignalParser}" />
              </div>
              <span class="text-sm font-semibold tracking-tight">Smart Signal Parser</span>
            </div>
            <component
              :is="showSignalParser ? ChevronUp : ChevronDown"
              class="h-4 w-4 text-muted-foreground"
            />
          </button>
          <Transition name="fade-slide">
            <div v-if="showSignalParser" class="p-4 bg-gradient-to-b from-indigo-50/30 to-transparent dark:from-indigo-950/10">
              <textarea
                v-model="signalText"
                class="min-h-24 w-full rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-white/50 dark:bg-black/20 p-3 text-sm outline-none focus-visible:border-indigo-500 transition-colors placeholder:text-muted-foreground/60"
                placeholder="Paste signal (e.g., Buy BTCUSDT Entry 50000 SL 48000)"
              />
              <div class="mt-3 flex gap-2">
                <Button
                  size="sm"
                  class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  @click="store.parseSignal"
                >
                  <Wand2 class="h-3 w-3 mr-1.5" /> Parse Signal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="flex-1"
                  @click="store.resetCalculator"
                >
                  Clear Form
                </Button>
              </div>
              <p v-if="parserMessage" class="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium text-center">
                {{ parserMessage }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- Input Form Card -->
        <Card class="overflow-hidden shadow-sm border-indigo-100 dark:border-indigo-900/50">
          <CardContent class="p-4 space-y-4">
            
            <!-- SECTION 1: Trade Setup -->
            <div class="rounded-xl border bg-muted/10 p-3 space-y-3">
              <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target class="h-3.5 w-3.5 text-indigo-500" /> Trade Setup
              </h3>
              <!-- Symbol & Direction -->
              <div class="flex gap-2">
                <div class="flex-1">
                  <Label class="mb-1.5 block text-xs font-medium">Symbol</Label>
                  <Input
                    v-model="symbol"
                    type="text"
                    placeholder="e.g. BTCUSDT"
                    class="h-11 dark:text-white"
                  />
                </div>
                <div>
                  <Label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Side</Label>
                  <div class="relative flex h-[38px] rounded-xl border bg-muted/30 p-1 shadow-sm">
                    <!-- Sliding Background -->
                    <div
                      class="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300"
                      :class="direction === 'long' ? 'left-1 bg-emerald-500 shadow-emerald-500/20' : 'left-[calc(50%+2px)] bg-red-500 shadow-red-500/20'"
                    ></div>
                    
                    <button
                      class="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors duration-300"
                      :class="direction === 'long' ? 'text-white' : 'text-muted-foreground hover:text-foreground'"
                      @click="direction = 'long'"
                    >
                      <TrendingUp class="h-3.5 w-3.5" />
                      Long
                    </button>
                    <button
                      class="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors duration-300"
                      :class="direction === 'short' ? 'text-white' : 'text-muted-foreground hover:text-foreground'"
                      @click="direction = 'short'"
                    >
                      <TrendingDown class="h-3.5 w-3.5" />
                      Short
                    </button>
                  </div>
                </div>
              </div>

              <!-- Entry & Stop Loss -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <Label class="mb-1.5 block text-xs font-medium"
                    >Entry Price</Label
                  >
                  <Input
                    v-model="entryPrice"
                    type="number"
                    step="any"
                    class="h-11 dark:text-white"
                  />
                </div>
                <div>
                  <Label class="mb-1.5 block text-xs font-medium"
                    >Stop Loss</Label
                  >
                  <Input
                    v-model="stopLoss"
                    type="number"
                    step="any"
                    class="h-11 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <!-- SECTION 2: Risk Config -->
            <div class="rounded-xl border bg-muted/10 p-3 space-y-3">
              <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldAlert class="h-3.5 w-3.5 text-indigo-500" /> Risk Config
              </h3>

            <!-- Balance & Leverage -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="mb-1.5 block text-xs font-medium"
                  >Starting Balance (USDT)</Label
                >
                <Input
                  v-model="accountBalance"
                  type="number"
                  step="any"
                  class="h-11 dark:text-white"
                />
              </div>
              <div>
                <Label class="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Leverage</span>
                  <span class="text-indigo-600 dark:text-indigo-400 font-bold">{{ leverage }}x</span>
                </Label>
                <div class="flex flex-col gap-1.5">
                  <div class="flex h-6 items-center px-1">
                    <input
                      v-model.number="leverage"
                      type="range"
                      min="1"
                      max="100"
                      class="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div class="flex gap-1">
                    <button class="flex-1 rounded border border-input bg-muted/20 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="leverage = 1">1x</button>
                    <button class="flex-1 rounded border border-input bg-muted/20 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="leverage = 10">10x</button>
                    <button class="flex-1 rounded border border-input bg-muted/20 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="leverage = 50">50x</button>
                    <button class="flex-1 rounded border border-input bg-muted/20 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="leverage = 100">100x</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Risk Input -->
            <div>
              <Label class="mb-1.5 block text-xs font-medium"
                >Risk Amount</Label
              >
              <div class="flex gap-2">
                <Input
                  v-model="riskValue"
                  type="number"
                  min="0"
                  step="any"
                  class="h-11 flex-1 dark:text-white"
                />
                <div class="flex rounded-lg border p-1">
                  <Button
                    size="sm"
                    :variant="riskMode === 'percent' ? 'default' : 'ghost'"
                    class="h-8 w-10 text-xs dark:text-white"
                    :class="riskMode === 'percent' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''"
                    @click="riskMode = 'percent'"
                  >
                    %
                  </Button>
                  <Button
                    size="sm"
                    :variant="riskMode === 'fixed' ? 'default' : 'ghost'"
                    class="h-8 w-10 text-xs dark:text-white"
                    :class="riskMode === 'fixed' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''"
                    @click="riskMode = 'fixed'"
                  >
                    $
                  </Button>
                </div>
              </div>
            </div>

            </div>

            <!-- Target Ratios -->
            <div class="rounded-xl border bg-muted/10 p-3 space-y-3">
              <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target class="h-3.5 w-3.5 text-indigo-500" /> Output Config
              </h3>
              <div>
                <Label class="mb-1.5 block text-xs font-medium"
                  >Target Ratios (e.g. 1, 2, 3)</Label
                >
                <Input
                  v-model="targetRatiosInput"
                  type="text"
                  placeholder="1, 2, 3"
                  class="h-11 dark:text-white"
                />
              </div>

              <!-- Risk Reward Summary Bar -->
              <div v-if="targets.length > 0 && riskAmount > 0" class="mt-3">
                <p class="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex justify-between">
                  <span>Max Risk:Reward</span>
                  <span class="text-emerald-600 dark:text-emerald-400">1 : {{ formatNumber(targets[targets.length - 1].multiple, 1) }}</span>
                </p>
                <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                   <div class="h-full bg-red-500" :style="{ width: `${100 / (1 + targets[targets.length - 1].multiple)}%` }"></div>
                   <div class="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" :style="{ width: `${(targets[targets.length - 1].multiple * 100) / (1 + targets[targets.length - 1].multiple)}%` }"></div>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div
              v-if="hasInvalidInputs"
              class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <TriangleAlert class="h-4 w-4 flex-shrink-0" />
              Check inputs: Entry, SL, balance, and risk must be positive.
            </div>
            <div
              v-else-if="hasInsufficientMargin"
              class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <TriangleAlert class="h-4 w-4 flex-shrink-0" />
              Insufficient margin! Required margin exceeds account balance.
            </div>
          </CardContent>
        </Card>

        <!-- Target Buttons -->
        <div v-if="!hasInvalidInputs && !hasInsufficientMargin" class="grid grid-cols-3 gap-2">
          <Button
            v-for="item in targets"
            :key="item.multiple"
            variant="outline"
            size="sm"
            class="relative overflow-hidden border-indigo-200 dark:border-indigo-800 text-xs dark:text-white group hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 shadow-sm bg-background/50 hover:bg-background"
            @click="copyTarget(item.price)"
          >
            <div class="absolute inset-0 opacity-[0.08] dark:opacity-[0.15] transition-opacity group-hover:opacity-20 dark:group-hover:opacity-30" 
                 :class="item.multiple === 1 ? 'bg-blue-500' : item.multiple === 2 ? 'bg-indigo-500' : 'bg-violet-500'"></div>
            <span class="font-bold mr-1" :class="item.multiple === 1 ? 'text-blue-600 dark:text-blue-400' : item.multiple === 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-violet-600 dark:text-violet-400'">{{ item.multiple }}R</span>
            <span class="tabular-nums font-medium">{{ formatNumber(item.price, 4) }}</span>
          </Button>
        </div>

        <!-- Log Trade Button -->
        <Button
          :disabled="hasInvalidInputs || hasInsufficientMargin"
          class="relative w-full h-12 text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 dark:from-indigo-600 dark:to-violet-600 dark:text-white dark:hover:from-indigo-500 dark:hover:to-violet-500 border-0 shadow-lg shadow-indigo-500/25 overflow-hidden group transition-all duration-300 disabled:opacity-50 disabled:shadow-none"
          @click="logTrade()"
        >
          <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <Plus class="mr-2 h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
          Log Trade
        </Button>
      </section>

        <!-- TRADES TAB -->
        <section v-else-if="activeTab === 'trades'" class="space-y-3 p-4">
        <!-- Filter Chips -->
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            size="sm"
            :variant="outcomeFilter === 'All' ? 'default' : 'outline'"
            class="whitespace-nowrap rounded-full text-xs"
            :class="outcomeFilter === 'All' ? 'bg-indigo-600' : ''"
            @click="outcomeFilter = 'All'"
          >
            All
          </Button>
          <Button
            size="sm"
            :variant="outcomeFilter === 'Open' ? 'default' : 'outline'"
            class="whitespace-nowrap rounded-full text-xs"
            :class="outcomeFilter === 'Open' ? 'bg-slate-600' : ''"
            @click="outcomeFilter = 'Open'"
          >
            Open
          </Button>
          <Button
            size="sm"
            :variant="outcomeFilter === 'Win' ? 'default' : 'outline'"
            class="whitespace-nowrap rounded-full text-xs"
            :class="outcomeFilter === 'Win' ? 'bg-emerald-600' : ''"
            @click="outcomeFilter = 'Win'"
          >
            Wins
          </Button>
          <Button
            size="sm"
            :variant="outcomeFilter === 'Loss' ? 'default' : 'outline'"
            class="whitespace-nowrap rounded-full text-xs"
            :class="outcomeFilter === 'Loss' ? 'bg-red-600' : ''"
            @click="outcomeFilter = 'Loss'"
          >
            Losses
          </Button>
          <Button
            size="sm"
            :variant="outcomeFilter === 'Breakeven' ? 'default' : 'outline'"
            class="whitespace-nowrap rounded-full text-xs"
            :class="outcomeFilter === 'Breakeven' ? 'bg-amber-500' : ''"
            @click="outcomeFilter = 'Breakeven'"
          >
            BE
          </Button>
        </div>

        <!-- Import/Export -->
        <input
          ref="importFileInput"
          type="file"
          accept="application/json"
          class="hidden"
          @change="importSession"
        />
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            class="flex-1 text-xs"
            @click="exportSession"
          >
            <FileDown class="mr-1 h-3 w-3" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="flex-1 text-xs"
            @click="openImportSessionDialog"
          >
            <FileUp class="mr-1 h-3 w-3" />
            Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="text-xs"
            @click="confirmClearAll('trades')"
          >
            <Trash2 class="h-3 w-3" />
          </Button>
        </div>

        <!-- Trade Count -->
        <p class="text-xs text-muted-foreground">
          Showing {{ displayedTrades.length }} of
          {{ filteredTrades.length }} trades
        </p>

        <!-- Empty State -->
        <div
          v-if="tradeLog.length === 0"
          class="relative overflow-hidden rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background p-10 text-center shadow-sm"
        >
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl"></div>
          <div class="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl"></div>
          
          <div
            class="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400"
          >
            <BarChart3 class="h-8 w-8" />
          </div>
          <h3 class="mb-1 text-lg font-bold text-foreground">No trades logged</h3>
          <p class="text-sm text-muted-foreground">
            Your trading journey starts here. Head over to the Calculator to log your first setup.
          </p>
          <Button class="mt-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20" @click="activeTab = 'calculator'">
            Go to Calculator
          </Button>
        </div>

        <!-- Trade Cards -->
        <TransitionGroup name="list" tag="div" class="flex flex-col gap-3">
          <div
            v-for="trade in displayedTrades"
            :key="trade.id"
            class="overflow-hidden rounded-xl bg-card border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-800"
          >
          <!-- Trade Header -->
          <div class="p-4">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ trade.symbol }}</span>
                  <span
                    class="rounded px-1.5 py-0.5 text-xs font-medium"
                    :class="
                      trade.direction === 'long'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    "
                  >
                    {{ trade.direction.toUpperCase() }}
                  </span>
                  <span class="text-[10px] text-muted-foreground ml-1">{{ formatRelativeTime(trade.createdAt) }}</span>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  Entry: {{ formatNumber(trade.entryPrice) }} | SL:
                  {{ formatNumber(trade.stopLoss) }}
                </p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                :class="{
                  'bg-emerald-500 text-white': trade.outcome === 'Win',
                  'bg-red-500 text-white': trade.outcome === 'Loss',
                  'bg-amber-500 text-white': trade.outcome === 'Breakeven',
                  'bg-slate-500 text-white': trade.outcome === 'Open',
                  'bg-muted text-muted-foreground': !['Win', 'Loss', 'Breakeven', 'Open'].includes(trade.outcome)
                }"
              >
                {{ trade.outcome }}
              </span>
            </div>

            <!-- Trade Details -->
            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-muted/50 p-2">
                <p class="text-xs text-muted-foreground">Qty</p>
                <p class="font-medium tabular-nums">{{ formatNumber(trade.quantity, 4) }}</p>
              </div>
              <div class="rounded-lg bg-muted/50 p-2">
                <p class="text-xs text-muted-foreground">Size ({{ trade.leverage }}x)</p>
                <p class="font-medium">
                  {{ formatCompactMoney(trade.positionSizeUSDT) }}
                </p>
              </div>
              <div class="rounded-lg bg-muted/50 p-2">
                <p class="text-xs text-muted-foreground">Risk</p>
                <p class="font-medium">
                  {{ formatCompactMoney(trade.riskAmount) }}
                </p>
              </div>
            </div>

            <!-- Targets -->
            <div class="mt-3 flex gap-1">
              <div
                v-for="target in trade.targets"
                :key="target.multiple"
                class="flex-1 rounded-lg py-1.5 text-center text-xs"
                :class="
                  trade.targetHitMultiple === target.multiple
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{ target.multiple }}R: {{ formatNumber(target.price, 3) }}
              </div>
            </div>
          </div>

          <!-- Trade Actions -->
          <div class="border-t bg-muted/30 p-3">
            <div class="mb-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                class="flex-1 text-xs"
                :class="
                  trade.outcome === 'Open'
                    ? 'border-indigo-500 text-indigo-600'
                    : ''
                "
                @click="store.setOutcome(trade.id, 'Open')"
              >
                Open
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="flex-1 text-xs"
                :class="
                  trade.outcome === 'Win'
                    ? 'border-emerald-500 text-emerald-600'
                    : ''
                "
                @click="store.setOutcome(trade.id, 'Win')"
              >
                Win
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="flex-1 text-xs"
                :class="
                  trade.outcome === 'Loss' ? 'border-red-500 text-red-600' : ''
                "
                @click="store.setOutcome(trade.id, 'Loss')"
              >
                Loss
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="flex-1 text-xs"
                :class="
                  trade.outcome === 'Breakeven'
                    ? 'border-amber-500 text-amber-600'
                    : ''
                "
                @click="store.setOutcome(trade.id, 'Breakeven')"
              >
                BE
              </Button>
            </div>

            <!-- R-Multiple Selector (Only for Wins) -->
            <div v-if="trade.outcome === 'Win'" class="flex items-center gap-2 mt-2">
              <span class="text-xs text-muted-foreground">Earned R:</span>
              <Input
                :value="trade.targetHitMultiple"
                @input="(e: Event) => store.setTargetHitMultiple(trade.id, Number((e.target as HTMLInputElement).value))"
                type="number"
                step="0.1"
                class="h-8 w-20 text-xs text-center font-medium"
              />
              <div class="flex flex-1 gap-1">
                <Button
                  v-for="target in trade.targets"
                  :key="target.multiple"
                  size="sm"
                  variant="outline"
                  class="flex-1 px-1 h-8 text-[10px]"
                  :class="trade.targetHitMultiple === target.multiple ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''"
                  @click="store.setTargetHitMultiple(trade.id, target.multiple)"
                >
                  {{ target.multiple }}R
                </Button>
              </div>
            </div>

            <!-- Actual Risk Input -->
            <div class="mt-2 flex items-center gap-2">
              <span class="text-xs text-muted-foreground">Actual Risk:</span>
              <Input
                :model-value="trade.actualRiskUsed"
                type="number"
                min="0"
                step="0.01"
                size="sm"
                class="h-8 flex-1 text-xs"
                @update:model-value="store.updateActualRisk(trade.id, $event)"
              />
              <Button
                size="sm"
                variant="ghost"
                class="h-8 px-2 text-red-500"
                @click="confirmDeleteTrade(trade.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        </TransitionGroup>

        <!-- Show More Button -->
        <Button
          v-if="hasMoreTrades"
          variant="outline"
          class="w-full text-xs"
          @click="showAllTrades = !showAllTrades"
        >
          {{
            showAllTrades
              ? "Show Less"
              : `Show All (${filteredTrades.length} trades)`
          }}
        </Button>
      </section>

        <!-- STATS TAB -->
        <section v-else-if="activeTab === 'stats'" class="space-y-3 p-4">
        <!-- Progress Card -->
        <Card
          class="relative overflow-hidden border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md"
        >
          <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <CardContent class="p-4 relative z-10">
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Trophy class="h-5 w-5 text-indigo-100" />
                <span class="font-bold tracking-wide">100-Trade Challenge</span>
              </div>
              <span class="text-2xl font-black tabular-nums tracking-tight"
                >{{ formatNumber(progressPercent, 0) }}%</span
              >
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-black/20 shadow-inner">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-1000 ease-out relative overflow-hidden"
                :style="{ width: `${progressPercent}%` }"
              >
                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            <p class="mt-2 text-xs font-medium text-indigo-100">
              {{ totalTradesCount }} of 100 trades completed
            </p>
          </CardContent>
        </Card>

        <!-- Quick Stats Grid -->
        <div class="grid grid-cols-3 gap-2">
          <div class="relative overflow-hidden rounded-xl bg-card border p-3 text-center shadow-sm">
            <div class="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent dark:from-emerald-500/10 pointer-events-none"></div>
            <div
              class="relative mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50"
            >
              <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">W</span>
            </div>
            <p class="relative text-xl font-black tabular-nums tracking-tight dark:text-white">{{ winsCount }}</p>
            <p class="relative text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Wins</p>
          </div>
          <div class="relative overflow-hidden rounded-xl bg-card border p-3 text-center shadow-sm">
            <div class="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent dark:from-red-500/10 pointer-events-none"></div>
            <div
              class="relative mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50"
            >
              <span class="text-sm font-bold text-red-600 dark:text-red-400">L</span>
            </div>
            <p class="relative text-xl font-black tabular-nums tracking-tight dark:text-white">{{ lossesCount }}</p>
            <p class="relative text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Losses</p>
          </div>
          <div class="relative overflow-hidden rounded-xl bg-card border p-3 text-center shadow-sm">
            <div class="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent dark:from-amber-500/10 pointer-events-none"></div>
            <div
              class="relative mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50"
            >
              <span class="text-sm font-bold text-amber-600 dark:text-amber-400">BE</span>
            </div>
            <p class="relative text-xl font-black tabular-nums tracking-tight dark:text-white">{{ breakevenCount }}</p>
            <p class="relative text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Breakeven</p>
          </div>
        </div>

        <!-- Equity Curve Chart -->
        <Card class="overflow-hidden">
          <CardContent class="p-4">
            <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
              <LineChart class="h-4 w-4 text-indigo-600" />
              Equity Curve (PnL)
            </h3>
            
            <div class="h-32 w-full pt-4 relative">
              <div v-if="equityCurvePoints.length < 2" class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                Not enough data to plot
              </div>
              <svg v-else viewBox="0 0 100 40" class="w-full h-full overflow-visible" preserveAspectRatio="none">
                <!-- Zero line (Breakeven) -->
                <line x1="0" :y1="40 - ((0 - Math.min(...equityCurvePoints.map(p => p.y), -0.01)) / ((Math.max(...equityCurvePoints.map(p => p.y), 0.01) - Math.min(...equityCurvePoints.map(p => p.y), -0.01)) || 1)) * 40" x2="100" :y2="40 - ((0 - Math.min(...equityCurvePoints.map(p => p.y), -0.01)) / ((Math.max(...equityCurvePoints.map(p => p.y), 0.01) - Math.min(...equityCurvePoints.map(p => p.y), -0.01)) || 1)) * 40" stroke="currentColor" stroke-width="0.5" class="text-muted-foreground/30 stroke-dasharray-2" stroke-dasharray="2" />
                
                <polygon :points="equityCurveArea" class="fill-indigo-500/10 dark:fill-indigo-500/20" />
                <polyline :points="equityCurvePath" fill="none" class="stroke-indigo-600 dark:stroke-indigo-400" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            
            <div class="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <span>Start</span>
              <span :class="equityCurvePoints[equityCurvePoints.length - 1]?.y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                Current: {{ formatNumber(equityCurvePoints[equityCurvePoints.length - 1]?.y || 0, 2) }}
              </span>
            </div>
          </CardContent>
        </Card>

        <!-- Win Rate & Net R -->
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-card border p-4 shadow-sm flex flex-col justify-center">
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Win Rate</p>
            <p
              class="text-3xl font-black tabular-nums tracking-tight mt-1"
              :class="winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'"
            >
              {{ formatNumber(winRate, 1) }}%
            </p>
          </div>
          <div class="rounded-xl bg-card border p-4 shadow-sm flex flex-col justify-center">
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net R</p>
            <p
              class="text-3xl font-black tabular-nums tracking-tight mt-1"
              :class="netR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ formatNumber(netR, 1) }}R
            </p>
          </div>
        </div>

        <!-- Risk Metrics -->
        <Card class="overflow-hidden">
          <CardContent class="p-4">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Target class="h-4 w-4 text-indigo-600" />
              Risk Consistency
            </h3>
            
            <div class="flex items-center gap-4 mb-4">
              <!-- Gauge -->
              <div class="relative w-24 h-12 overflow-hidden flex-shrink-0">
                <div class="absolute inset-0 rounded-t-full border-[12px] border-muted dark:border-muted/50 border-b-0"></div>
                <div 
                  class="absolute inset-0 rounded-t-full border-[12px] border-emerald-500 border-b-0 origin-bottom transition-transform duration-1000 ease-out" 
                  :style="{ transform: `rotate(${riskComplianceScore * 1.8 - 180}deg)` }"
                  :class="riskComplianceScore >= 80 ? 'border-emerald-500' : (riskComplianceScore >= 50 ? 'border-amber-500' : 'border-red-500')"
                ></div>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Compliance</span>
                <span class="text-3xl font-black tabular-nums tracking-tight" :class="riskComplianceScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : (riskComplianceScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')">
                  {{ formatNumber(riskComplianceScore, 0) }}%
                </span>
              </div>
            </div>

            <div class="space-y-3 pt-3 border-t">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground"
                  >Avg Risk/Trade</span
                >
                <span class="font-semibold dark:text-white">{{
                  formatMoney(averageRiskPerTrade)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground">Risk Drift</span>
                <span
                  class="font-semibold tabular-nums"
                  :class="
                    Math.abs(riskDrift) <= 10
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  "
                >
                  {{ formatNumber(riskDrift, 1) }}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Survival Heatmap -->
        <Card class="overflow-hidden">
          <CardContent class="p-4">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Flame class="h-4 w-4 text-indigo-600" />
              100-Trade Heatmap
            </h3>
            <div class="grid grid-cols-10 gap-1">
              <div
                v-for="cell in heatmapCells"
                :key="cell.id"
                class="relative aspect-square rounded-md transition-all duration-300 hover:scale-[1.15] hover:shadow-md cursor-crosshair z-10 hover:z-20"
                :class="{
                  'bg-muted hover:bg-muted/80': cell.outcome === 'Pending',
                  'bg-emerald-500 shadow-emerald-500/20': cell.outcome === 'Win',
                  'bg-red-500 shadow-red-500/20': cell.outcome === 'Loss',
                  'bg-amber-400 shadow-amber-500/20': cell.outcome === 'Breakeven',
                  'bg-slate-400 shadow-slate-500/20': cell.outcome === 'Open',
                }"
                :title="`Trade ${cell.id}: ${cell.outcome}`"
              />
            </div>
            <div class="mt-3 flex flex-wrap gap-3 text-xs">
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded bg-emerald-500" />
                <span>Win</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded bg-red-500" />
                <span>Loss</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded bg-amber-400" />
                <span>BE</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded bg-slate-400" />
                <span>Open</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="h-3 w-3 rounded bg-muted" />
                <span>Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Clear Data -->
        <Button
          variant="outline"
          class="w-full text-destructive"
          @click="confirmClearAll('all')"
        >
          Clear All App Data
        </Button>
        </section>
      </Transition>

      <!-- Bottom Navigation -->
      <nav
        class="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur md:sticky md:bottom-0 md:rounded-b-2xl pb-safe"
      >
        <div class="mx-auto flex h-16 max-w-lg items-center px-2">
          <button
            class="relative flex flex-1 flex-col items-center justify-center gap-1 h-full rounded-xl transition-all duration-300"
            :class="activeTab === 'calculator' ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
            @click="activeTab = 'calculator'"
          >
            <div class="absolute inset-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 transition-opacity duration-300" :class="activeTab === 'calculator' ? 'opacity-100' : 'opacity-0 scale-95'"></div>
            <Calculator class="relative z-10 h-5 w-5" :stroke-width="activeTab === 'calculator' ? 2.5 : 2" />
            <span class="relative z-10 text-[10px] font-bold">Calc</span>
          </button>
          
          <button
            class="relative flex flex-1 flex-col items-center justify-center gap-1 h-full rounded-xl transition-all duration-300"
            :class="activeTab === 'trades' ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
            @click="activeTab = 'trades'"
          >
            <div class="absolute inset-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 transition-opacity duration-300" :class="activeTab === 'trades' ? 'opacity-100' : 'opacity-0 scale-95'"></div>
            <List class="relative z-10 h-5 w-5" :stroke-width="activeTab === 'trades' ? 2.5 : 2" />
            <span class="relative z-10 text-[10px] font-bold">Trades</span>
            <span
              v-if="tradeLog.length > 0"
              class="absolute top-2 right-[calc(50%-18px)] z-20 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white shadow-sm ring-2 ring-background"
            >
              {{ tradeLog.length }}
            </span>
          </button>
          
          <button
            class="relative flex flex-1 flex-col items-center justify-center gap-1 h-full rounded-xl transition-all duration-300"
            :class="activeTab === 'stats' ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
            @click="activeTab = 'stats'"
          >
            <div class="absolute inset-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 transition-opacity duration-300" :class="activeTab === 'stats' ? 'opacity-100' : 'opacity-0 scale-95'"></div>
            <BarChart3 class="relative z-10 h-5 w-5" :stroke-width="activeTab === 'stats' ? 2.5 : 2" />
            <span class="relative z-10 text-[10px] font-bold">Stats</span>
          </button>
        </div>
      </nav>

      <!-- Modals -->
      <Transition name="fade-slide">
        <div v-if="tradeToDelete !== null || showClearConfirm !== null" class="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div class="w-full max-w-xs rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-card p-5 shadow-xl">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <TriangleAlert class="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 class="mb-2 text-center text-lg font-bold">Are you sure?</h3>
            <p class="mb-5 text-center text-sm text-muted-foreground">
              {{ tradeToDelete !== null ? 'This will permanently delete this trade from your log.' : (showClearConfirm === 'all' ? 'This will permanently clear ALL app data and reset the calculator.' : 'This will permanently clear your entire trade log and reset stats.') }}
            </p>
            <div class="flex gap-2">
              <Button variant="outline" class="flex-1" @click="tradeToDelete !== null ? cancelDeleteTrade() : cancelClearAll()">Cancel</Button>
              <Button variant="destructive" class="flex-1" @click="tradeToDelete !== null ? executeDeleteTrade() : executeClearAll()">Delete</Button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Global Toast Notification -->
      <div
        class="fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 transform items-center gap-2 rounded-full bg-gray-900/90 px-4 py-2 text-sm font-medium text-white shadow-xl backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        :class="copyMessage ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-90 pointer-events-none'"
      >
        <Zap class="h-4 w-4 text-emerald-400" />
        {{ copyMessage }}
      </div>
    </main>
  </div>
</template>
