<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import {
  Trophy,
  Zap,
  Flame,
  Target,
  ShieldAlert,
  TrendingUp,
} from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { useFormatting } from "~/composables/useFormatting";
import { Card, CardContent } from "~/components/ui/card";

const store = useTradeguardStore();
const {
  winsCount,
  lossesCount,
  breakevenCount,
  winRate,
  netR,
  riskComplianceScore,
  riskDrift,
  currentBalance,
  accountBalance,
  tradeLog,
  heatmapCells,
  progressPercent,
  totalTradesCount,
  averageRiskPerTrade,
} = storeToRefs(store);

const { formatMoney, formatCompactMoney } = useFormatting();

const equityCurvePoints = computed(() => {
  let cumulativePnl = 0;
  const points = [{ x: 0, y: 0 }];
  
  // Sort by date to ensure proper timeline
  const sortedTrades = [...tradeLog.value].reverse();
  
  sortedTrades.forEach((trade, idx) => {
    let pnl = 0;
    if (trade.outcome === 'Win') {
      pnl = trade.actualRiskUsed * (trade.targetHitMultiple ?? 1);
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
  return `${path} ${width},${height} 0,${height}`;
});
</script>

<template>
  <section class="space-y-4 p-4">
    <!-- 100-Trade Challenge Banner -->
    <div class="rounded-[20px] bg-gradient-to-br from-[#7C3AED] to-[#6366F1] p-5 text-white shadow-md animate-fade-in-up relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
      <div class="relative z-10">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <Trophy class="h-5 w-5 opacity-90" />
            <h2 class="font-black text-sm tracking-tight">100-Trade Challenge</h2>
          </div>
          <span class="text-2xl font-black">{{ progressPercent.toFixed(0) }}%</span>
        </div>
        <div class="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mb-2">
          <div class="h-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-all duration-1000" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <p class="text-[10px] font-bold opacity-90">{{ totalTradesCount }} of 100 trades completed</p>
      </div>
    </div>

    <!-- Win/Loss/BE Counters -->
    <div class="grid grid-cols-3 gap-3 animate-fade-in-up stagger-1">
      <Card class="border shadow-sm">
        <CardContent class="p-3 flex flex-col items-center justify-center">
          <div class="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center mb-1.5">
            <span class="text-[10px] font-black">W</span>
          </div>
          <p class="text-xl font-black tabular-nums">{{ winsCount }}</p>
          <p class="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Wins</p>
        </CardContent>
      </Card>
      <Card class="border shadow-sm">
        <CardContent class="p-3 flex flex-col items-center justify-center">
          <div class="h-6 w-6 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center mb-1.5">
            <span class="text-[10px] font-black">L</span>
          </div>
          <p class="text-xl font-black tabular-nums">{{ lossesCount }}</p>
          <p class="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Losses</p>
        </CardContent>
      </Card>
      <Card class="border shadow-sm">
        <CardContent class="p-3 flex flex-col items-center justify-center">
          <div class="h-6 w-6 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mb-1.5">
            <span class="text-[10px] font-black">BE</span>
          </div>
          <p class="text-xl font-black tabular-nums">{{ breakevenCount }}</p>
          <p class="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Breakeven</p>
        </CardContent>
      </Card>
    </div>

    <!-- Equity Curve Card -->
    <Card class="animate-fade-in-up stagger-2 overflow-hidden border shadow-sm">
      <CardContent class="p-4">
        <div class="flex items-center gap-2 mb-4">
          <TrendingUp class="h-4 w-4 text-indigo-600" />
          <h3 class="text-xs font-black tracking-tight">Equity Curve (PnL)</h3>
        </div>
        
        <div class="relative h-24 w-full overflow-hidden pt-4 border-b-2 border-dashed border-muted">
          <svg viewBox="0 0 100 40" class="h-full w-full overflow-visible" preserveAspectRatio="none">
            <polyline :points="equityCurveArea" class="fill-indigo-500/10" />
            <polyline :points="equityCurvePath" fill="none" class="stroke-indigo-600 stroke-[2]" stroke-linejoin="round" stroke-linecap="round" />
            <circle v-if="equityCurvePoints.length > 1" :cx="100" :cy="equityCurvePath.split(' ').pop()?.split(',')[1]" r="1.5" class="fill-indigo-600" />
          </svg>
        </div>
        <div class="flex justify-between items-center mt-2 px-1">
          <span class="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Start</span>
          <span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Current: {{ formatCompactMoney(currentBalance) }}</span>
        </div>
      </CardContent>
    </Card>

    <!-- Win Rate / Net R -->
    <div class="grid grid-cols-2 gap-3 animate-fade-in-up stagger-3">
      <Card class="border shadow-sm">
        <CardContent class="p-4">
          <p class="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Win Rate</p>
          <p class="text-3xl font-black tabular-nums text-emerald-500">{{ winRate.toFixed(0) }}%</p>
        </CardContent>
      </Card>
      <Card class="border shadow-sm">
        <CardContent class="p-4">
          <p class="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Net R</p>
          <p class="text-3xl font-black tabular-nums text-emerald-500">{{ netR.toFixed(0) }}R</p>
        </CardContent>
      </Card>
    </div>

    <!-- Risk Consistency -->
    <Card class="animate-fade-in-up stagger-4 border shadow-sm">
      <CardContent class="p-4">
        <div class="flex items-center gap-2 mb-6">
          <Target class="h-4 w-4 text-indigo-600" />
          <h3 class="text-xs font-black tracking-tight">Risk Consistency</h3>
        </div>

        <div class="flex items-end justify-between mb-5 border-b pb-5 border-muted/50">
          <svg viewBox="0 0 100 50" class="w-28 h-14 overflow-visible">
            <!-- Thin grey track -->
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" class="stroke-muted-foreground/20 stroke-[2]" stroke-linecap="butt" />
            <!-- Thick green gauge -->
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" class="stroke-[#10B981] stroke-[12] transition-all duration-1000 ease-out" stroke-linecap="butt" :stroke-dasharray="125.66" :stroke-dashoffset="125.66 - (riskComplianceScore / 100) * 125.66" />
          </svg>
          <div class="text-right">
            <p class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Compliance</p>
            <p class="text-3xl font-black tabular-nums text-[#10B981] leading-none">{{ riskComplianceScore.toFixed(0) }}%</p>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <p class="text-xs text-muted-foreground font-medium">Avg Risk/Trade</p>
            <p class="text-sm font-bold">{{ formatMoney(averageRiskPerTrade) }}</p>
          </div>
          <div class="flex justify-between items-center">
            <p class="text-xs text-muted-foreground font-medium">Risk Drift</p>
            <p class="text-sm font-bold text-[#10B981]">{{ riskDrift > 0 ? '+' : '' }}{{ riskDrift.toFixed(0) }}%</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 100-Trade Heatmap -->
    <Card class="animate-fade-in-up stagger-5 border shadow-sm">
      <CardContent class="p-4">
        <div class="flex items-center gap-2 mb-4">
          <Flame class="h-4 w-4 text-indigo-600" />
          <h3 class="text-xs font-black tracking-tight">100-Trade Heatmap</h3>
        </div>
        
        <div class="grid grid-cols-10 gap-[4px] mb-4">
          <div
            v-for="cell in heatmapCells"
            :key="cell.id"
            class="aspect-square rounded-[3px] transition-all duration-500"
            :class="[
              cell.outcome === 'Win' ? 'bg-[#10B981]' :
              cell.outcome === 'Loss' ? 'bg-[#EF4444]' :
              cell.outcome === 'Breakeven' ? 'bg-[#F59E0B]' :
              cell.outcome === 'Open' ? 'bg-[#94A3B8]' : 'bg-[#F1F5F9] dark:bg-white/5'
            ]"
          ></div>
        </div>
        
        <!-- Legend -->
        <div class="flex items-center gap-3 text-[9px] font-medium text-muted-foreground">
          <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div> Win</div>
          <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></div> Loss</div>
          <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div> BE</div>
          <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></div> Open</div>
          <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full bg-[#F1F5F9] dark:bg-white/5 border dark:border-white/10"></div> Pending</div>
        </div>
      </CardContent>
    </Card>

    <!-- Clear All App Data Button -->
    <div class="animate-fade-in-up stagger-5 pt-2 pb-6">
      <button 
        class="w-full py-3 rounded-xl border border-red-200 bg-card text-red-600 font-bold text-sm shadow-sm transition-all hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
        @click="store.clearAllData()"
      >
        Clear All App Data
      </button>
    </div>
  </section>
</template>
