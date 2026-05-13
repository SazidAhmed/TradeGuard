<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref, watch, computed } from "vue";
import {
  TrendingUp,
  TrendingDown,
  Wand2,
  ChevronDown,
  ChevronUp,
  Target,
  ShieldAlert,
  Plus,
  Clipboard,
  TriangleAlert,
} from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { useFormatting } from "~/composables/useFormatting";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

const props = defineProps<{
  showToast: (msg: string) => void;
}>();

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
  riskAmount,
  hasInvalidInputs,
  hasInsufficientMargin,
  quantityToBuy,
  totalCostUSDT,
  marginRequiredUSDT,
  targets,
  riskPerUnit,
  targetRatios,
} = storeToRefs(store);

const { formatNumber, formatMoney } = useFormatting();

const targetRatiosInput = computed({
  get: () => targetRatios.value.length > 0 ? String(Math.max(...targetRatios.value)) : "",
  set: (val: string) => {
    const maxVal = Number(val);
    if (!Number.isNaN(maxVal) && maxVal > 0) {
      const newRatios = [];
      for (let i = 1; i <= Math.floor(maxVal); i++) {
        newRatios.push(i);
      }
      if (maxVal > Math.floor(maxVal)) {
        newRatios.push(maxVal);
      }
      targetRatios.value = newRatios;
    }
  },
});

const isQuantityPulsing = ref(false);
const lastCopiedTarget = ref<number | null>(null);
const showSignalParser = ref(false);

watch(quantityToBuy, () => {
  isQuantityPulsing.value = true;
  setTimeout(() => {
    isQuantityPulsing.value = false;
  }, 1000);
});

watch(
  [entryPrice, stopLoss],
  ([newEntry, newSL]) => {
    const entry = Number(newEntry);
    const sl = Number(newSL);
    if (!Number.isNaN(entry) && !Number.isNaN(sl) && entry > 0 && sl > 0 && entry !== sl) {
      direction.value = entry > sl ? 'long' : 'short';
    }
  }
);

const copyTarget = async (price: number, multiple: number) => {
  if (!process.client || hasInvalidInputs.value || hasInsufficientMargin.value) return;
  try {
    await navigator.clipboard.writeText(String(price));
    lastCopiedTarget.value = multiple;
    props.showToast(`Copied target: ${price}`);
    setTimeout(() => {
      lastCopiedTarget.value = null;
    }, 1500);
  } catch {
    // Fail silently or handle error
  }
};

const logTrade = () => {
  store.logTradeSnapshot();
  props.showToast('Trade logged! ⚡');
};
</script>

<template>
  <section class="p-4 md:grid md:grid-cols-2 md:gap-6 items-stretch space-y-3 md:space-y-0">
    <!-- Left Column -->
    <div class="flex flex-col space-y-3">
      <!-- Results & Risk Row -->
    <Transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="opacity-0 -translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-4 scale-95"
    >
      <div v-if="!hasInvalidInputs" class="flex gap-2">
      <!-- Results Card -->
      <Card
        class="animate-fade-in-up flex-[1.6] overflow-hidden relative border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background/50 shadow-sm"
      >
        <!-- Accent Line -->
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-500"></div>
        
        <CardContent class="p-3 pl-4">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">QUANTITY TO BUY</span>
            <div
              class="flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-300 shadow-sm"
              :class="direction === 'long' ? 'bg-emerald-100 shadow-emerald-500/20' : 'bg-red-100 shadow-red-500/20'"
            >
              <component
                :is="direction === 'long' ? TrendingUp : TrendingDown"
                class="h-3 w-3"
                :class="direction === 'long' ? 'text-emerald-600' : 'text-red-600'"
              />
            </div>
          </div>
          <div class="flex items-baseline gap-1">
            <p 
              class="text-4xl font-black tabular-nums tracking-tight dark:text-white transition-all duration-500"
              :class="{ 'scale-105 text-indigo-600 dark:text-indigo-400': isQuantityPulsing }"
            >
              {{ hasInvalidInputs ? "---" : formatNumber(quantityToBuy, 4) }}
            </p>
            <span v-if="!hasInvalidInputs" class="text-xs font-bold text-muted-foreground/60 ml-1">Units</span>
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
        <div class="animate-fade-in-up stagger-1 flex-1 rounded-xl border bg-card/50 p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div class="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.02] pointer-events-none"></div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Risk/Unit</p>
          <p class="text-sm font-bold tabular-nums dark:text-white mt-0.5">
            {{ hasInvalidInputs ? "---" : formatNumber(riskPerUnit, 4) }}
          </p>
        </div>
        <div class="animate-fade-in-up stagger-2 flex-1 rounded-xl border bg-card/50 p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div class="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.02] pointer-events-none"></div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Risk Amt</p>
          <p class="text-sm font-bold tabular-nums mt-0.5" :class="hasInvalidInputs ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'">
            {{ hasInvalidInputs ? "---" : formatMoney(riskAmount) }}
          </p>
        </div>
      </div>
      </div>
    </Transition>

    <!-- Signal Parser -->
    <div class="md:block">
      <button
        class="flex w-full items-center justify-between p-4 rounded-2xl bg-card border shadow-md transition-all duration-300 border-indigo-100 dark:border-indigo-900/30 group hover:shadow-lg active:scale-[0.99]"
        :class="showSignalParser && 'md:bg-indigo-600 md:text-white'"
        @click="showSignalParser = !showSignalParser"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-500" 
               :class="showSignalParser ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/50'">
            <Wand2 class="h-4 w-4 transition-transform duration-500" :class="showSignalParser ? 'rotate-12 scale-110 text-white animate-pulse' : 'text-indigo-600 dark:text-indigo-400'" />
          </div>
          <div class="flex flex-col items-start">
            <span class="text-sm font-black tracking-tight uppercase">Smart Signal Parser</span>
            <span class="text-[10px] opacity-70 font-bold">AI-Powered Extraction</span>
          </div>
        </div>
        <component
          :is="showSignalParser ? ChevronUp : ChevronDown"
          class="h-5 w-5 transition-transform duration-500 hidden md:block"
          :class="showSignalParser ? 'text-white' : 'text-muted-foreground'"
        />
        <div class="md:hidden flex h-8 items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 px-2.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50">
          Open Tool
        </div>
      </button>
      
      <!-- Desktop Inline Expander -->
      <Transition 
        @enter="(el) => { (el as any).style.height = '0'; (el as any).offsetHeight; (el as any).style.height = el.scrollHeight + 'px'; }"
        @leave="(el) => { (el as any).style.height = el.scrollHeight + 'px'; (el as any).offsetHeight; (el as any).style.height = '0'; }"
        class="hidden md:block overflow-hidden transition-[height] duration-500 ease-in-out"
      >
        <div v-if="showSignalParser" class="p-4 mt-2 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
          <div class="relative">
            <textarea
              v-model="signalText"
              class="min-h-32 w-full rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-white/50 dark:bg-black/20 p-4 text-sm font-medium outline-none focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 transition-all placeholder:text-muted-foreground/60 shadow-inner"
              placeholder="Paste signal (e.g., Buy BTCUSDT Entry 50000 SL 48000)"
            />
            <div class="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>
          </div>
          <div class="mt-4 flex gap-3">
            <Button size="lg" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-500/25 active:scale-95 transition-all" @click="store.parseSignal">
              <Wand2 class="h-4 w-4 mr-2" /> EXTRACT DATA
            </Button>
            <Button size="lg" variant="outline" class="flex-1 font-bold border-2 hover:bg-muted/50 active:scale-95 transition-all" @click="store.resetCalculator">RESET</Button>
          </div>
          <p v-if="parserMessage" class="mt-4 text-xs text-indigo-600 dark:text-indigo-400 font-black text-center uppercase tracking-widest animate-fade-in">⚡ {{ parserMessage }}</p>
        </div>
      </Transition>
    </div>

    <!-- Mobile Bottom Sheet for Signal Parser -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        leave-active-class="transition-all duration-300 ease-in"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div v-if="showSignalParser" class="md:hidden fixed inset-x-0 bottom-0 z-[100] rounded-t-[32px] bg-card p-6 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)] border-t border-indigo-100 dark:border-indigo-900/50">
          <div class="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-muted-foreground/20" @click="showSignalParser = false"></div>
          <div class="mt-2 flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <Wand2 class="h-5 w-5" />
              </div>
              <h2 class="text-xl font-black uppercase tracking-tight">Signal Parser</h2>
            </div>
            <button @click="showSignalParser = false" class="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <ChevronDown class="h-4 w-4" />
            </button>
          </div>
          <div class="relative">
            <textarea
              v-model="signalText"
              class="min-h-48 w-full rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-muted/30 p-4 text-base font-bold outline-none focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 transition-all placeholder:text-muted-foreground/60 shadow-inner"
              placeholder="Paste signal (e.g., Buy BTCUSDT Entry 50000 SL 48000)"
            />
          </div>
          <div class="mt-6 flex flex-col gap-3">
            <Button size="lg" class="h-14 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-500/30 active:scale-[0.98] transition-all" @click="store.parseSignal; showSignalParser = false">
              <Wand2 class="h-5 w-5 mr-3" /> PARSE SIGNAL
            </Button>
            <Button size="lg" variant="ghost" class="h-12 w-full font-bold text-muted-foreground" @click="showSignalParser = false">CLOSE TOOL</Button>
          </div>
          <p v-if="parserMessage" class="mt-4 text-xs text-indigo-600 dark:text-indigo-400 font-black text-center uppercase tracking-widest">⚡ {{ parserMessage }}</p>
          <div class="h-6"></div>
        </div>
      </Transition>
      <Transition
        enter-active-class="transition-opacity duration-300 ease-linear"
        leave-active-class="transition-opacity duration-200 ease-linear"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showSignalParser" class="md:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" @click="showSignalParser = false"></div>
      </Transition>
    </Teleport>

    <!-- Trade Setup -->
    <Card class="overflow-hidden shadow-sm border-indigo-100 dark:border-indigo-900/50 flex flex-col flex-1">
      <CardContent class="p-4 md:p-6 flex flex-col flex-1">
        <div class="rounded-xl border bg-muted/10 p-3 md:p-5 space-y-3 md:space-y-4 h-full flex flex-col justify-center">
          <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target class="h-3.5 w-3.5 text-indigo-500" /> Trade Setup
          </h3>
          <div class="flex gap-2">
            <div class="flex-1">
              <Label class="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-widest">Symbol</Label>
              <div class="relative group">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-indigo-500 transition-colors">
                  <component :is="direction === 'long' ? TrendingUp : TrendingDown" class="h-4 w-4" />
                </div>
                <Input v-model="symbol" type="text" placeholder="BTCUSDT" class="h-12 pl-10 font-black dark:text-white border-2 focus-visible:border-indigo-500/50 shadow-sm transition-all placeholder:font-normal placeholder:opacity-50" />
              </div>
            </div>
            <div>
              <div class="relative flex h-[44px] w-40 rounded-xl border bg-muted/30 p-1 shadow-inner mt-6">
                <div class="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg shadow-md transition-all duration-500 ease-out" :class="direction === 'long' ? 'left-1 bg-emerald-500 glow-emerald' : 'left-[calc(50%+2px)] bg-red-500 glow-red'"></div>
                <button class="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all duration-300" :class="direction === 'long' ? 'text-white' : 'text-muted-foreground hover:text-foreground'" @click="direction = 'long'">
                  <TrendingUp class="h-3.5 w-3.5" :class="direction === 'long' ? 'animate-bounce-short' : ''" /> Long
                </button>
                <button class="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all duration-300" :class="direction === 'short' ? 'text-white' : 'text-muted-foreground hover:text-foreground'" @click="direction = 'short'">
                  <TrendingDown class="h-3.5 w-3.5" :class="direction === 'short' ? 'animate-bounce-short' : ''" /> Short
                </button>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="relative">
              <Label class="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-widest">Entry Price</Label>
              <div class="relative group">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-indigo-500 transition-colors">
                  <Target class="h-4 w-4" />
                </div>
                <Input v-model="entryPrice" type="number" step="any" placeholder="80000" class="h-12 pl-10 font-bold dark:text-white border-2 focus-visible:border-indigo-500/50 shadow-sm transition-all placeholder:font-normal placeholder:opacity-50" />
              </div>
            </div>
            <div class="relative">
              <Label class="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-widest">Stop Loss</Label>
              <div class="relative group">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-red-500 transition-colors">
                  <ShieldAlert class="h-4 w-4" />
                </div>
                <Input v-model="stopLoss" type="number" step="any" placeholder="75000" class="h-12 pl-10 font-bold dark:text-white border-2 focus-visible:border-red-500/50 shadow-sm transition-all placeholder:font-normal placeholder:opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>

    <!-- Right Column: Risk & Output Config -->
    <div class="flex flex-col space-y-3 h-full">
      <Card class="overflow-hidden shadow-sm border-indigo-100 dark:border-indigo-900/50 flex flex-col h-full flex-1">
        <CardContent class="p-4 md:p-6 flex flex-col space-y-4 md:space-y-6 h-full flex-1">
          <div class="rounded-xl border bg-muted/10 p-3 md:p-5 space-y-3 md:space-y-4">
            <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert class="h-3.5 w-3.5 text-indigo-500" /> Risk Config
          </h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="mb-1.5 block text-xs font-medium">Starting Balance (USDT)</Label>
              <Input v-model="accountBalance" type="number" step="any" placeholder="1000" class="h-11 dark:text-white placeholder:font-normal placeholder:opacity-50" />
            </div>
            <div>
              <Label class="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Leverage</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-bold">{{ leverage }}x</span>
              </Label>
              <div class="flex flex-col gap-2.5">
                <div class="group relative flex h-6 items-center px-1">
                  <div class="absolute inset-x-1 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <input v-model.number="leverage" type="range" min="1" max="100" class="relative z-10 w-full accent-indigo-600 cursor-pointer bg-transparent appearance-none" />
                </div>
                <div class="flex gap-1">
                  <button v-for="val in [1, 5, 10, 20, 50, 100]" :key="val" class="flex-1 rounded-lg border py-1 text-[10px] font-bold transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600" :class="leverage === val ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-muted/20 text-muted-foreground border-input'" @click="leverage = val">{{ val }}x</button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label class="mb-1.5 block text-xs font-medium">Risk Amount</Label>
            <div class="flex gap-2">
              <Input v-model="riskValue" type="number" min="0" step="any" placeholder="5" class="h-11 flex-1 dark:text-white placeholder:font-normal placeholder:opacity-50" />
              <div class="flex rounded-lg border p-1">
                <Button size="sm" :variant="riskMode === 'percent' ? 'default' : 'ghost'" class="h-8 w-10 text-xs dark:text-white" :class="riskMode === 'percent' ? 'bg-indigo-600 text-white' : ''" @click="riskMode = 'percent'">%</Button>
                <Button size="sm" :variant="riskMode === 'fixed' ? 'default' : 'ghost'" class="h-8 w-10 text-xs dark:text-white" :class="riskMode === 'fixed' ? 'bg-indigo-600 text-white' : ''" @click="riskMode = 'fixed'">$</Button>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-muted/10 p-3 md:p-5 space-y-3 md:space-y-4 flex flex-col flex-1">
          <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target class="h-3.5 w-3.5 text-indigo-500" /> Output Config
          </h3>
          
          <!-- Validation Alerts -->
          <div v-if="hasInvalidInputs" class="animate-bounce-short flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-600 dark:text-red-400 font-bold shadow-sm">
            <ShieldAlert class="h-4 w-4 flex-shrink-0" />
            Check inputs: Entry, SL, balance, and risk must be positive.
          </div>
          <div v-else-if="hasInsufficientMargin" class="animate-bounce-short flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-600 dark:text-amber-400 font-bold shadow-sm">
            <TriangleAlert class="h-4 w-4 flex-shrink-0" />
            Insufficient margin! Required: {{ formatMoney(marginRequiredUSDT) }}
          </div>

          <div class="space-y-3">
            <div>
              <Label class="mb-1.5 block text-xs font-medium">Max Target Ratio (e.g. 3)</Label>
              <Input v-model="targetRatiosInput" type="number" step="any" min="1" placeholder="3" class="h-11 dark:text-white placeholder:font-normal placeholder:opacity-50" aria-label="Max Target Ratio" />
            </div>
            <div v-if="targetRatios.length > 0" class="space-y-1.5 px-1">
              <div class="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Max Risk:Reward</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-black">1:{{ Math.max(...targetRatios) }}</span>
              </div>
              <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/20">
                <div class="bg-red-500 transition-all duration-500" :style="{ flex: 1 }"></div>
                <div class="bg-emerald-500 transition-all duration-500" :style="{ flex: Math.max(...targetRatios) }"></div>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <Button v-for="item in targets" :key="item.multiple" variant="outline" size="sm" class="relative h-16 overflow-hidden border-0 text-xs dark:text-white group transition-all duration-300 shadow-md bg-card hover:shadow-lg active:scale-95" :class="[lastCopiedTarget === item.multiple ? 'animate-[success-bounce_0.5s_ease-in-out]' : '']" @click="copyTarget(item.price, item.multiple)">
              <div class="absolute inset-0 transition-opacity duration-300 opacity-[0.1] group-hover:opacity-[0.15]" :class="[item.multiple <= 1 ? 'bg-blue-500' : item.multiple <= 2 ? 'bg-indigo-500' : item.multiple <= 3 ? 'bg-violet-500' : item.multiple <= 5 ? 'bg-fuchsia-500' : 'bg-rose-500']"></div>
              <div class="absolute bottom-0 left-0 right-0 h-1 transition-all duration-300" :class="[item.multiple <= 1 ? 'bg-blue-500' : item.multiple <= 2 ? 'bg-indigo-500' : item.multiple <= 3 ? 'bg-violet-500' : item.multiple <= 5 ? 'bg-fuchsia-500' : 'bg-rose-500']"></div>
              <div class="relative z-10 flex flex-col items-center justify-center">
                <span class="font-black text-[10px] uppercase tracking-tighter" :class="[item.multiple <= 1 ? 'text-blue-600 dark:text-blue-400' : item.multiple <= 2 ? 'text-indigo-600 dark:text-indigo-400' : item.multiple <= 3 ? 'text-violet-600 dark:text-violet-400' : item.multiple <= 5 ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-rose-600 dark:text-rose-400']">{{ item.multiple }}R Target</span>
                <span class="tabular-nums font-bold text-[13px] mt-0.5">{{ formatNumber(item.price, 4) }}</span>
                <span class="text-[9px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">+{{ formatMoney(riskAmount * item.multiple) }}</span>
              </div>
              <div v-if="lastCopiedTarget === item.multiple" class="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/90 text-white">
                <Clipboard class="h-5 w-5 animate-bounce" />
              </div>
            </Button>
            </div>
            
            <div class="flex-1 hidden md:block"></div>
            
            <Button :disabled="hasInvalidInputs || hasInsufficientMargin" class="relative w-full h-14 text-lg font-black bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] text-white hover:bg-right transition-all duration-500 border-0 shadow-xl shadow-indigo-500/20 overflow-hidden group disabled:opacity-50 disabled:shadow-none active:scale-[0.98] mt-auto" @click="logTrade()">
              <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shimmer_1s_infinite]"></div>
              <div class="relative z-10 flex items-center justify-center gap-2">
                <Plus class="h-6 w-6 transition-transform group-hover:rotate-180 duration-500" />
                <span>LOG EXECUTION</span>
              </div>
              <div class="absolute inset-0 opacity-0 group-active:opacity-20 bg-white transition-opacity duration-300"></div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
