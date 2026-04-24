<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted, ref, watch, computed } from "vue";
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
    class="min-h-screen bg-gray-50 text-foreground md:flex md:justify-center md:bg-gray-100"
  >
    <!-- Mobile Container -->
    <main
      class="relative min-h-screen w-full max-w-md bg-gray-50 pb-20 md:min-h-[800px] md:rounded-2xl md:shadow-2xl"
    >
      <!-- Mobile Header -->
      <header class="sticky top-0 z-30 bg-white px-4 py-3 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600"
            >
              <Zap class="h-4 w-4 text-white" />
            </div>
            <span class="text-lg font-bold text-gray-900">TradeGuard</span>
          </div>
          <div class="flex items-center gap-2">
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
            <strong class="text-gray-900">{{
              formatCompactMoney(remainingBalance)
            }}</strong></span
          >
          <span
            >Risk:
            <strong class="text-gray-900">{{
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
            class="flex-[1.6] overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 to-white"
          >
            <CardContent class="p-3">
              <div class="mb-1 flex items-center justify-between">
                <span
                  class="text-[10px] font-semibold text-muted-foreground tracking-tight"
                  >QUANTITY TO BUY</span
                >
                <div
                  class="flex h-5 w-5 items-center justify-center rounded-full"
                  :class="
                    direction === 'long' ? 'bg-emerald-100' : 'bg-red-100'
                  "
                >
                  <component
                    :is="direction === 'long' ? TrendingUp : TrendingDown"
                    class="h-2.5 w-2.5"
                    :class="
                      direction === 'long' ? 'text-emerald-600' : 'text-red-600'
                    "
                  />
                </div>
              </div>
              <p class="text-2xl font-bold text-gray-900">
                {{ hasInvalidInputs ? "---" : toFixedNumber(quantityToBuy, 6) }}
              </p>
              <p class="mt-0.5 text-[10px] text-muted-foreground">
                Pos: {{ hasInvalidInputs ? "---" : formatMoney(totalCostUSDT) }} &bull; Margin: {{ hasInvalidInputs ? "---" : formatMoney(marginRequiredUSDT) }}
              </p>
            </CardContent>
          </Card>

          <!-- Risk Summary Vertical -->
          <div class="flex flex-1 flex-col gap-2">
            <div
              class="flex-1 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm"
            >
              <p class="text-[10px] font-medium text-muted-foreground">
                Risk/Unit
              </p>
              <p class="text-sm font-bold text-gray-900">
                {{ hasInvalidInputs ? "---" : toFixedNumber(riskPerUnit, 4) }}
              </p>
            </div>
            <div
              class="flex-1 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm"
            >
              <p class="text-[10px] font-medium text-muted-foreground">
                Risk Amount
              </p>
              <p class="text-sm font-bold text-gray-900">
                {{ hasInvalidInputs ? "---" : formatMoney(riskAmount) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Signal Parser (Collapsible) -->
        <div class="rounded-xl bg-white shadow-sm">
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
                  class="h-11"
                />
              </div>
              <div>
                <Label class="mb-1.5 block text-xs font-medium">Side</Label>
                <div class="flex rounded-lg border p-1">
                  <Button
                    size="sm"
                    :variant="direction === 'long' ? 'default' : 'ghost'"
                    class="h-8 px-3 text-xs"
                    :class="
                      direction === 'long'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : ''
                    "
                    @click="direction = 'long'"
                  >
                    Long
                  </Button>
                  <Button
                    size="sm"
                    :variant="direction === 'short' ? 'default' : 'ghost'"
                    class="h-8 px-3 text-xs"
                    :class="
                      direction === 'short' ? 'bg-red-600 hover:bg-red-700' : ''
                    "
                    @click="direction = 'short'"
                  >
                    Short
                  </Button>
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
                  class="h-11"
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
                  class="h-11"
                />
              </div>
            </div>

            <!-- Balance & Leverage -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="mb-1.5 block text-xs font-medium"
                  >Account Balance (USDT)</Label
                >
                <Input
                  v-model="accountBalance"
                  type="number"
                  step="any"
                  class="h-11"
                />
              </div>
              <div>
                <Label class="mb-1.5 flex justify-between text-xs font-medium">
                  <span>Leverage</span>
                  <span class="text-indigo-600">{{ leverage }}x</span>
                </Label>
                <div class="flex h-11 items-center px-1">
                  <input
                    v-model.number="leverage"
                    type="range"
                    min="1"
                    max="100"
                    class="w-full accent-indigo-600"
                  />
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
                  class="h-11 flex-1"
                />
                <div class="flex rounded-lg border p-1">
                  <Button
                    size="sm"
                    :variant="riskMode === 'percent' ? 'default' : 'ghost'"
                    class="h-8 w-10 text-xs"
                    @click="riskMode = 'percent'"
                  >
                    %
                  </Button>
                  <Button
                    size="sm"
                    :variant="riskMode === 'fixed' ? 'default' : 'ghost'"
                    class="h-8 w-10 text-xs"
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
                class="h-11"
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
            class="border-indigo-200 text-xs"
            @click="copyTarget(item.price)"
          >
            <Clipboard class="mr-1 h-3 w-3" />
            {{ item.multiple }}R: {{ formatNumber(item.price, 4) }}
          </Button>
        </div>

        <!-- Copy Message -->
        <p v-if="copyMessage" class="text-center text-xs text-indigo-600">
          {{ copyMessage }}
        </p>

        <!-- Log Trade Button -->
        <Button
          :disabled="hasInvalidInputs || hasInsufficientMargin"
          class="w-full h-12 text-base font-medium"
          @click="store.logTradeSnapshot"
        >
          <Plus class="mr-2 h-5 w-5" />
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
          class="rounded-xl border border-dashed bg-white p-8 text-center"
        >
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"
          >
            <List class="h-6 w-6 text-gray-400" />
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
          class="overflow-hidden rounded-xl bg-white shadow-sm"
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
              <div class="rounded-lg bg-gray-50 p-2">
                <p class="text-xs text-muted-foreground">Qty</p>
                <p class="font-medium">{{ formatNumber(trade.quantity, 2) }}</p>
              </div>
              <div class="rounded-lg bg-gray-50 p-2">
                <p class="text-xs text-muted-foreground">Size ({{ trade.leverage }}x)</p>
                <p class="font-medium">
                  {{ formatCompactMoney(trade.positionSizeUSDT) }}
                </p>
              </div>
              <div class="rounded-lg bg-gray-50 p-2">
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
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-muted-foreground'
                "
              >
                {{ idx + 1 }}R: {{ formatNumber(target, 3) }}
              </div>
            </div>
          </div>

          <!-- Trade Actions -->
          <div class="border-t bg-gray-50/50 p-3">
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
            <div v-if="trade.outcome === 'Win'" class="flex gap-2">
              <span class="text-xs text-muted-foreground py-1">Hit:</span>
              <Button
                size="sm"
                :variant="trade.targetHitMultiple === 1 ? 'default' : 'outline'"
                class="flex-1 text-xs"
                @click="store.setTargetHitMultiple(trade.id, 1)"
              >
                1R
              </Button>
              <Button
                size="sm"
                :variant="trade.targetHitMultiple === 2 ? 'default' : 'outline'"
                class="flex-1 text-xs"
                @click="store.setTargetHitMultiple(trade.id, 2)"
              >
                2R
              </Button>
              <Button
                size="sm"
                :variant="trade.targetHitMultiple === 3 ? 'default' : 'outline'"
                class="flex-1 text-xs"
                @click="store.setTargetHitMultiple(trade.id, 3)"
              >
                3R
              </Button>
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
          <div class="rounded-xl bg-white p-3 text-center shadow-sm">
            <div
              class="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100"
            >
              <span class="text-sm font-bold text-emerald-600">W</span>
            </div>
            <p class="text-xl font-bold">{{ winsCount }}</p>
            <p class="text-xs text-muted-foreground">Wins</p>
          </div>
          <div class="rounded-xl bg-white p-3 text-center shadow-sm">
            <div
              class="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-100"
            >
              <span class="text-sm font-bold text-red-600">L</span>
            </div>
            <p class="text-xl font-bold">{{ lossesCount }}</p>
            <p class="text-xs text-muted-foreground">Losses</p>
          </div>
          <div class="rounded-xl bg-white p-3 text-center shadow-sm">
            <div
              class="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100"
            >
              <span class="text-sm font-bold text-amber-600">BE</span>
            </div>
            <p class="text-xl font-bold">{{ breakevenCount }}</p>
            <p class="text-xs text-muted-foreground">Breakeven</p>
          </div>
        </div>

        <!-- Win Rate & Net R -->
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-white p-3 shadow-sm">
            <p class="text-xs text-muted-foreground">Win Rate</p>
            <p
              class="text-2xl font-bold"
              :class="winRate >= 50 ? 'text-emerald-600' : 'text-gray-900'"
            >
              {{ formatNumber(winRate, 1) }}%
            </p>
          </div>
          <div class="rounded-xl bg-white p-3 shadow-sm">
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
                <span class="font-semibold">{{
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
                  'bg-gray-200': cell.outcome === 'Pending',
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
                <div class="h-3 w-3 rounded bg-gray-200" />
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
        class="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:absolute md:rounded-b-2xl"
      >
        <div class="mx-auto flex max-w-md">
          <button
            class="flex flex-1 flex-col items-center gap-1 py-3 transition-colors"
            :class="
              activeTab === 'calculator' ? 'text-indigo-600' : 'text-gray-400'
            "
            @click="activeTab = 'calculator'"
          >
            <Calculator
              class="h-5 w-5"
              :stroke-width="activeTab === 'calculator' ? 2.5 : 2"
            />
            <span class="text-xs font-medium">Calc</span>
          </button>
          <button
            class="flex flex-1 flex-col items-center gap-1 py-3 transition-colors"
            :class="
              activeTab === 'trades' ? 'text-indigo-600' : 'text-gray-400'
            "
            @click="activeTab = 'trades'"
          >
            <List
              class="h-5 w-5"
              :stroke-width="activeTab === 'trades' ? 2.5 : 2"
            />
            <span class="text-xs font-medium">Trades</span>
            <span
              v-if="tradeLog.length > 0"
              class="absolute top-2 ml-6 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white"
            >
              {{ tradeLog.length }}
            </span>
          </button>
          <button
            class="flex flex-1 flex-col items-center gap-1 py-3 transition-colors"
            :class="activeTab === 'stats' ? 'text-indigo-600' : 'text-gray-400'"
            @click="activeTab = 'stats'"
          >
            <BarChart3
              class="h-5 w-5"
              :stroke-width="activeTab === 'stats' ? 2.5 : 2"
            />
            <span class="text-xs font-medium">Stats</span>
          </button>
        </div>
      </nav>
    </main>
  </div>
</template>
