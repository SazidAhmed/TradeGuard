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
    copyMessage.value = `Copied target ${price}`;
    setTimeout(() => {
      copyMessage.value = "";
    }, 1500);
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
        <div class="rounded-xl bg-card border shadow-sm">
          <button
            class="flex w-full items-center justify-between p-4"
            @click="showSignalParser = !showSignalParser"
          >
            <div class="flex items-center gap-2">
              <Zap class="h-4 w-4 text-indigo-600" />
              <span class="text-sm font-medium">Signal Parser</span>
            </div>
            <component
              :is="showSignalParser ? ChevronUp : ChevronDown"
              class="h-4 w-4 text-muted-foreground"
            />
          </button>
          <div v-if="showSignalParser" class="border-t px-4 pb-4">
            <textarea
              v-model="signalText"
              class="mt-3 min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:border-indigo-500"
              placeholder="Paste your signal text here..."
            />
            <div class="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                class="flex-1"
                @click="store.parseSignal"
              >
                Parse
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="flex-1"
                @click="store.resetCalculator"
              >
                Reset
              </Button>
            </div>
            <p v-if="parserMessage" class="mt-2 text-xs text-muted-foreground">
              {{ parserMessage }}
            </p>
          </div>
        </div>

        <!-- Input Form Card -->
        <Card class="overflow-hidden">
          <CardContent class="space-y-4 p-4">
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

            <!-- Target Ratios -->
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
          @click="() => { store.logTradeSnapshot(); copyMessage = 'Trade logged!'; setTimeout(() => copyMessage = '', 2000); }"
        >
          <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <Plus class="mr-2 h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
          Log Trade
        </Button>
      </section>

      <!-- TRADES TAB -->
      <section v-if="activeTab === 'trades'" class="space-y-3 p-4">
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
            @click="store.clearTradeLog"
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
          class="rounded-xl border border-dashed bg-card p-8 text-center"
        >
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted"
          >
            <List class="h-6 w-6 text-muted-foreground" />
          </div>
          <p class="text-sm text-muted-foreground">No trades yet</p>
          <p class="text-xs text-muted-foreground">
            Log a trade from the Calculator tab
          </p>
        </div>

        <!-- Trade Cards -->
        <div
          v-for="trade in displayedTrades"
          :key="trade.id"
          class="overflow-hidden rounded-xl bg-card border shadow-sm"
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
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  Entry: {{ formatNumber(trade.entryPrice) }} | SL:
                  {{ formatNumber(trade.stopLoss) }}
                </p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-medium"
                :class="
                  getOutcomeColor(trade.outcome)
                    .replace('bg-', 'bg-opacity-20 text-')
                    .replace('500', '700')
                    .replace('400', '600') +
                  ' ' +
                  getOutcomeColor(trade.outcome)
                    .replace('bg-', 'bg-opacity-20 ')
                    .replace('bg-muted', 'bg-gray-200')
                "
              >
                {{ trade.outcome }}
              </span>
            </div>

            <!-- Trade Details -->
            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-muted/50 p-2">
                <p class="text-xs text-muted-foreground">Qty</p>
                <p class="font-medium">{{ formatNumber(trade.quantity, 2) }}</p>
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
                v-for="(target, idx) in trade.targets"
                :key="idx"
                class="flex-1 rounded-lg py-1.5 text-center text-xs"
                :class="
                  trade.targetHitMultiple === idx + 1
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{ idx + 1 }}R: {{ formatNumber(target, 3) }}
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
                  size="sm"
                  variant="outline"
                  class="flex-1 px-1 h-8 text-[10px]"
                  :class="trade.targetHitMultiple === 1 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''"
                  @click="store.setTargetHitMultiple(trade.id, 1)"
                >
                  1R
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="flex-1 px-1 h-8 text-[10px]"
                  :class="trade.targetHitMultiple === 2 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''"
                  @click="store.setTargetHitMultiple(trade.id, 2)"
                >
                  2R
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="flex-1 px-1 h-8 text-[10px]"
                  :class="trade.targetHitMultiple === 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''"
                  @click="store.setTargetHitMultiple(trade.id, 3)"
                >
                  3R
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
                @click="store.removeTrade(trade.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

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
      <section v-if="activeTab === 'stats'" class="space-y-3 p-4">
        <!-- Progress Card -->
        <Card
          class="overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-700 text-white"
        >
          <CardContent class="p-4">
            <div class="mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Trophy class="h-5 w-5" />
                <span class="font-semibold">100-Trade Challenge</span>
              </div>
              <span class="text-2xl font-bold"
                >{{ formatNumber(progressPercent, 0) }}%</span
              >
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-white/20">
              <div
                class="h-full rounded-full bg-white transition-all"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
            <p class="mt-2 text-sm text-white/80">
              {{ totalTradesCount }} of 100 trades completed
            </p>
          </CardContent>
        </Card>

        <!-- Quick Stats Grid -->
        <div class="grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-card border p-3 text-center shadow-sm">
            <div
              class="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50"
            >
              <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">W</span>
            </div>
            <p class="text-xl font-bold dark:text-white">{{ winsCount }}</p>
            <p class="text-xs text-muted-foreground">Wins</p>
          </div>
          <div class="rounded-xl bg-card border p-3 text-center shadow-sm">
            <div
              class="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50"
            >
              <span class="text-sm font-bold text-red-600 dark:text-red-400">L</span>
            </div>
            <p class="text-xl font-bold dark:text-white">{{ lossesCount }}</p>
            <p class="text-xs text-muted-foreground">Losses</p>
          </div>
          <div class="rounded-xl bg-card border p-3 text-center shadow-sm">
            <div
              class="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50"
            >
              <span class="text-sm font-bold text-amber-600 dark:text-amber-400">BE</span>
            </div>
            <p class="text-xl font-bold dark:text-white">{{ breakevenCount }}</p>
            <p class="text-xs text-muted-foreground">Breakeven</p>
          </div>
        </div>

        <!-- Win Rate & Net R -->
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-card border p-3 shadow-sm">
            <p class="text-xs text-muted-foreground">Win Rate</p>
            <p
              class="text-2xl font-bold"
              :class="winRate >= 50 ? 'text-emerald-600' : 'text-gray-900 dark:text-white'"
            >
              {{ formatNumber(winRate, 1) }}%
            </p>
          </div>
          <div class="rounded-xl bg-card border p-3 shadow-sm">
            <p class="text-xs text-muted-foreground">Net R</p>
            <p
              class="text-2xl font-bold"
              :class="netR >= 0 ? 'text-emerald-600' : 'text-red-600'"
            >
              {{ formatNumber(netR, 1) }}R
            </p>
          </div>
        </div>

        <!-- Risk Metrics -->
        <Card class="overflow-hidden">
          <CardContent class="p-4">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Target class="h-4 w-4 text-indigo-600" />
              Risk Consistency
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground"
                  >Avg Risk/Trade</span
                >
                <span class="font-semibold dark:text-white">{{
                  formatMoney(averageRiskPerTrade)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground"
                  >Compliance Score</span
                >
                <span
                  class="font-semibold"
                  :class="
                    riskComplianceScore >= 80
                      ? 'text-emerald-600'
                      : riskComplianceScore >= 50
                        ? 'text-amber-600'
                        : 'text-red-600'
                  "
                >
                  {{ formatNumber(riskComplianceScore, 0) }}%
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground">Risk Drift</span>
                <span
                  class="font-semibold"
                  :class="
                    Math.abs(riskDrift) <= 10
                      ? 'text-emerald-600'
                      : 'text-amber-600'
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
                class="aspect-square rounded-sm"
                :class="{
                  'bg-muted': cell.outcome === 'Pending',
                  'bg-emerald-500': cell.outcome === 'Win',
                  'bg-red-500': cell.outcome === 'Loss',
                  'bg-amber-400': cell.outcome === 'Breakeven',
                  'bg-slate-400': cell.outcome === 'Open',
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
          @click="store.clearAllData"
        >
          Clear All App Data
        </Button>
      </section>

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
      <!-- Global Toast Notification -->
      <div
        class="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-2 rounded-full bg-gray-900/90 px-4 py-2 text-sm font-medium text-white shadow-xl backdrop-blur-md transition-all duration-300"
        :class="copyMessage ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'"
      >
        <Zap class="h-4 w-4 text-emerald-400" />
        {{ copyMessage }}
      </div>
    </main>
  </div>
</template>
