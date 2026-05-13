<script setup lang="ts">
import { watch } from "vue";
import { storeToRefs } from "pinia";
import { Target, TrendingUp, TrendingDown, ShieldAlert } from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

const store = useTradeguardStore();
const { symbol, direction, entryPrice, stopLoss, inputErrors } = storeToRefs(store);

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
</script>

<template>
  <Card class="overflow-hidden shadow-sm border-indigo-100 dark:border-indigo-900/50 flex flex-col flex-1">
    <CardContent class="p-4 md:p-6 flex flex-col flex-1">
      <div class="rounded-xl border bg-muted/10 p-3 md:p-5 space-y-3 md:space-y-4 h-full flex flex-col justify-center">
        <h3 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Target class="h-3.5 w-3.5 text-indigo-500" /> Trade Setup
        </h3>
        <div class="flex gap-2">
          <div class="flex-1">
            <Label for="symbol-input" class="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-widest">Symbol</Label>
            <div class="relative group">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-indigo-500 transition-colors">
                <component :is="direction === 'long' ? TrendingUp : TrendingDown" class="h-4 w-4" />
              </div>
              <Input id="symbol-input" v-model="symbol" type="text" placeholder="BTCUSDT" class="h-12 pl-10 font-black dark:text-white border-2 focus-visible:border-indigo-500/50 shadow-sm transition-all placeholder:font-normal placeholder:opacity-50" />
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
            <Label for="entry-input" class="mb-1.5 block text-xs font-bold uppercase tracking-widest" :class="inputErrors.entryPrice ? 'text-red-500' : 'text-muted-foreground'">Entry Price</Label>
            <div class="relative group">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" :class="inputErrors.entryPrice ? 'text-red-500' : 'text-muted-foreground/50 group-focus-within:text-indigo-500'">
                <Target class="h-4 w-4" />
              </div>
              <Input id="entry-input" v-model="entryPrice" type="number" step="any" placeholder="80000" class="h-12 pl-10 font-bold dark:text-white border-2 transition-all placeholder:font-normal placeholder:opacity-50" :class="inputErrors.entryPrice ? 'border-red-500 focus-visible:ring-red-500/20' : 'focus-visible:border-indigo-500/50 shadow-sm'" />
            </div>
            <p v-if="inputErrors.entryPrice" class="mt-1 text-[10px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1">{{ inputErrors.entryPrice }}</p>
          </div>
          <div class="relative">
            <Label for="sl-input" class="mb-1.5 block text-xs font-bold uppercase tracking-widest" :class="inputErrors.stopLoss ? 'text-red-500' : 'text-muted-foreground'">Stop Loss</Label>
            <div class="relative group">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" :class="inputErrors.stopLoss ? 'text-red-500' : 'text-muted-foreground/50 group-focus-within:text-red-500'">
                <ShieldAlert class="h-4 w-4" />
              </div>
              <Input id="sl-input" v-model="stopLoss" type="number" step="any" placeholder="75000" class="h-12 pl-10 font-bold dark:text-white border-2 transition-all placeholder:font-normal placeholder:opacity-50" :class="inputErrors.stopLoss ? 'border-red-500 focus-visible:ring-red-500/20' : 'focus-visible:border-red-500/50 shadow-sm'" />
            </div>
            <p v-if="inputErrors.stopLoss" class="mt-1 text-[10px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1">{{ inputErrors.stopLoss }}</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
