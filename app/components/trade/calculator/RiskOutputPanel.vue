<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { ShieldAlert, TriangleAlert, Target, Clipboard, Plus } from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { useFormatting } from "~/composables/useFormatting";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";

const props = defineProps<{
  showToast: (msg: string) => void;
}>();

const store = useTradeguardStore();
const {
  accountBalance,
  leverage,
  riskMode,
  riskValue,
  hasInvalidInputs,
  hasInsufficientMargin,
  marginRequiredUSDT,
  targetRatios,
  targets,
  riskAmount,
  inputErrors,
} = storeToRefs(store);

const { formatNumber, formatMoney } = useFormatting();

const targetRatiosInput = computed({
  get: () => targetRatios.value.join(", "),
  set: (val: string) => {
    const newRatios = val
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
    
    if (newRatios.length > 0) {
      targetRatios.value = [...new Set(newRatios)].sort((a, b) => a - b);
    }
  },
});

const leverageSliderValue = computed({
  get: () => [leverage.value],
  set: (val: number[]) => { leverage.value = val[0] }
});

const getTargetColors = (multiple: number) => {
  if (multiple <= 1) return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' };
  if (multiple <= 2) return { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' };
  if (multiple <= 3) return { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' };
  if (multiple <= 5) return { bg: 'bg-fuchsia-500', text: 'text-fuchsia-600 dark:text-fuchsia-400' };
  return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };
};

const lastCopiedTarget = ref<number | null>(null);

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
    // Fail silently
  }
};

const logTrade = () => {
  store.logTradeSnapshot();
  props.showToast('Trade logged! ⚡');
};
</script>

<template>
  <div class="flex flex-col space-y-3 h-full">
    <Card class="overflow-hidden shadow-sm border-indigo-100 dark:border-indigo-900/50 flex flex-col h-full flex-1">
      <CardContent class="p-4 md:p-6 flex flex-col space-y-4 md:space-y-6 h-full flex-1">
        <div class="rounded-xl border bg-muted/10 p-3 md:p-5 space-y-3 md:space-y-4">
          <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert class="h-3.5 w-3.5 text-indigo-500" /> Risk Config
          </h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label for="balance-input" class="mb-1.5 block text-xs font-medium" :class="inputErrors.accountBalance ? 'text-red-500' : ''">Starting Balance (USDT)</Label>
              <Input id="balance-input" v-model="accountBalance" type="number" step="any" placeholder="1000" class="h-11 dark:text-white transition-all placeholder:font-normal placeholder:opacity-50" :class="inputErrors.accountBalance ? 'border-red-500 focus-visible:ring-red-500/20' : ''" />
              <p v-if="inputErrors.accountBalance" class="mt-1 text-[10px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1">{{ inputErrors.accountBalance }}</p>
            </div>
            <div>
              <Label class="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Leverage</span>
                <span class="text-indigo-600 dark:text-indigo-400 font-bold">{{ leverage }}x</span>
              </Label>
              <div class="flex flex-col gap-2.5">
                <div class="group relative flex h-6 items-center px-1">
                  <div class="absolute inset-x-1 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <Slider v-model="leverageSliderValue" :min="1" :max="100" :step="1" class="relative z-10 w-full cursor-pointer [&_[role=slider]]:bg-indigo-600 [&_[role=slider]]:border-indigo-600 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4" />
                </div>
                <div class="flex gap-1">
                  <button v-for="val in [1, 5, 10, 20, 50, 100]" :key="val" class="flex-1 rounded-lg border py-1 text-[10px] font-bold transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600" :class="leverage === val ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-muted/20 text-muted-foreground border-input'" @click="leverage = val">{{ val }}x</button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label for="risk-input" class="mb-1.5 block text-xs font-medium" :class="inputErrors.riskValue ? 'text-red-500' : ''">Risk Amount</Label>
            <div class="flex gap-2">
              <div class="flex-1">
                <Input id="risk-input" v-model="riskValue" type="number" min="0" step="any" placeholder="5" class="h-11 w-full dark:text-white transition-all placeholder:font-normal placeholder:opacity-50" :class="inputErrors.riskValue ? 'border-red-500 focus-visible:ring-red-500/20' : ''" />
                <p v-if="inputErrors.riskValue" class="mt-1 text-[10px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1">{{ inputErrors.riskValue }}</p>
              </div>
              <div class="flex rounded-lg border p-1 h-11">
                <Button size="sm" :variant="riskMode === 'percent' ? 'default' : 'ghost'" class="h-full w-10 text-xs dark:text-white" :class="riskMode === 'percent' ? 'bg-indigo-600 text-white' : ''" @click="riskMode = 'percent'">%</Button>
                <Button size="sm" :variant="riskMode === 'fixed' ? 'default' : 'ghost'" class="h-full w-10 text-xs dark:text-white" :class="riskMode === 'fixed' ? 'bg-indigo-600 text-white' : ''" @click="riskMode = 'fixed'">$</Button>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-muted/10 p-3 md:p-5 space-y-3 md:space-y-4 flex flex-col flex-1">
          <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target class="h-3.5 w-3.5 text-indigo-500" /> Output Config
          </h3>
          
          <!-- Validation Alerts -->
          <div v-if="hasInsufficientMargin" class="animate-bounce-short flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-600 dark:text-amber-400 font-bold shadow-sm">
            <TriangleAlert class="h-4 w-4 flex-shrink-0" />
            Insufficient margin! Required: {{ formatMoney(marginRequiredUSDT) }}
          </div>

          <div class="space-y-3">
            <div>
              <Label for="target-ratios-input" class="mb-1.5 block text-xs font-medium">Target Ratios (e.g. 1, 2, 3.5)</Label>
              <Input id="target-ratios-input" v-model="targetRatiosInput" type="text" placeholder="1, 2, 3" class="h-11 dark:text-white placeholder:font-normal placeholder:opacity-50" />
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
              <div class="absolute inset-0 transition-opacity duration-300 opacity-[0.1] group-hover:opacity-[0.15]" :class="getTargetColors(item.multiple).bg"></div>
              <div class="absolute bottom-0 left-0 right-0 h-1 transition-all duration-300" :class="getTargetColors(item.multiple).bg"></div>
              <div class="relative z-10 flex flex-col items-center justify-center">
                <span class="font-black text-[10px] uppercase tracking-tighter" :class="getTargetColors(item.multiple).text">{{ item.multiple }}R Target</span>
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
</template>
