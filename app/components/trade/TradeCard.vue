<script setup lang="ts">
import { TrendingUp, TrendingDown, Target, ShieldAlert, Flame, Trash2 } from "lucide-vue-next";
import { type TradeLogEntry, useTradeguardStore } from "~/stores/tradeguard";
import { useFormatting } from "~/composables/useFormatting";
import { Input } from "~/components/ui/input";

const props = defineProps<{
  trade: TradeLogEntry;
  confirmDeleteTrade: (id: number) => void;
}>();

const store = useTradeguardStore();
const { formatNumber, formatMoney, formatRelativeTime } = useFormatting();

const getOutcomeClass = (outcome: string) => {
  switch (outcome) {
    case 'Win': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
    case 'Loss': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50';
    case 'Breakeven': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/50';
  }
};
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl border bg-card shadow-sm group">
    <div 
      class="flex transition-transform duration-300"
      :class="store.tradeToDelete === trade.id ? '-translate-x-[80px]' : ''"
    >
      <div class="min-w-full p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div 
              class="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
              :class="trade.direction === 'long' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-red-50 dark:bg-red-950/30 text-red-600'"
            >
              <component :is="trade.direction === 'long' ? TrendingUp : TrendingDown" class="h-5 w-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-black text-sm uppercase tracking-tight">{{ trade.symbol }}</h4>
                <span 
                  class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                  :class="getOutcomeClass(trade.outcome)"
                >
                  {{ trade.outcome }}
                </span>
              </div>
              <p class="text-[10px] font-bold text-muted-foreground">{{ formatRelativeTime(trade.createdAt) }} • {{ trade.leverage }}x Leverage</p>
            </div>
          </div>
          <div class="text-right">
            <p 
              v-if="trade.outcome === 'Win'" 
              class="text-sm font-black text-emerald-600 dark:text-emerald-400"
            >
              +{{ formatMoney(trade.actualRiskUsed * (trade.targetHitMultiple ?? 1)) }}
            </p>
            <p 
              v-else-if="trade.outcome === 'Loss'" 
              class="text-sm font-black text-red-600 dark:text-red-400"
            >
              -{{ formatMoney(trade.actualRiskUsed) }}
            </p>
            <p v-else class="text-sm font-black text-muted-foreground">$0.00</p>
            <p class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Realized PnL</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="space-y-1">
            <div class="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              <Target class="h-3 w-3" /> Entry
            </div>
            <p class="text-xs font-bold tabular-nums">{{ formatNumber(trade.entryPrice, 4) }}</p>
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-red-500/80">
              <ShieldAlert class="h-3 w-3" /> Stop Loss
            </div>
            <p class="text-xs font-bold tabular-nums">{{ formatNumber(trade.stopLoss, 4) }}</p>
          </div>
        </div>

        <!-- Action Row -->
        <div class="flex flex-col gap-3 pt-3 border-t border-dashed">
          <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button 
              v-for="status in ['Open', 'Win', 'Loss', 'Breakeven'] as const" 
              :key="status"
              class="px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border shrink-0"
              :class="trade.outcome === status ? getOutcomeClass(status) : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'"
              @click="store.setOutcome(trade.id, status)"
            >
              {{ status }}
            </button>
          </div>

          <div class="flex gap-3">
            <div class="flex items-center gap-2 flex-1">
              <span class="text-[10px] font-black text-muted-foreground uppercase">Actual Risk</span>
              <div class="relative flex-1 group">
                <Input
                  :model-value="trade.actualRiskUsed"
                  type="number"
                  step="0.01"
                  class="h-11 w-full text-[11px] font-bold pl-7 bg-background"
                  @update:model-value="store.updateActualRisk(trade.id, $event)"
                />
                <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-red-500">
                  <Flame class="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
            <div v-if="trade.outcome === 'Win'" class="flex items-center gap-2 flex-1">
              <span class="text-[10px] font-black text-muted-foreground uppercase">Hit R</span>
              <Input
                :value="trade.targetHitMultiple"
                type="number"
                step="0.1"
                class="h-11 w-full text-[11px] font-bold bg-background"
                @input="(e: Event) => store.setTargetHitMultiple(trade.id, Number((e.target as HTMLInputElement).value))"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Hidden Delete Button (Swipe Reveal) -->
      <button 
        class="w-[80px] flex-shrink-0 bg-red-600 flex items-center justify-center text-white active:bg-red-700"
        @click="confirmDeleteTrade(trade.id)"
      >
        <Trash2 class="h-8 w-8" />
      </button>
    </div>
  </div>
</template>
