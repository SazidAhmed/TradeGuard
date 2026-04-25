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
    <!-- Primary Stats Grid -->
    <div class="grid grid-cols-2 gap-3">
      <Card class="animate-fade-in-up border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardContent class="p-4 flex flex-col items-center text-center">
          <div class="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mb-2">
            <Trophy class="h-5 w-5" />
          </div>
          <p class="text-2xl font-black tabular-nums tracking-tight">{{ winRate.toFixed(1) }}%</p>
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Win Rate</p>
        </CardContent>
      </Card>
      <Card class="animate-fade-in-up stagger-1 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-950/10">
        <CardContent class="p-4 flex flex-col items-center text-center">
          <div class="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center mb-2">
            <Zap class="h-5 w-5" />
          </div>
          <p class="text-2xl font-black tabular-nums tracking-tight">{{ netR.toFixed(2) }}R</p>
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Net Profit</p>
        </CardContent>
      </Card>
    </div>

    <!-- Equity Curve Card -->
    <Card class="animate-fade-in-up stagger-2 overflow-hidden border-indigo-100 dark:border-indigo-900/50">
      <CardContent class="p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <TrendingUp class="h-4 w-4 text-indigo-600" />
            <h3 class="text-xs font-black uppercase tracking-widest">Equity Growth</h3>
          </div>
          <p class="text-sm font-black" :class="currentBalance >= accountBalance ? 'text-emerald-600' : 'text-red-600'">
            {{ formatMoney(currentBalance) }}
          </p>
        </div>
        
        <div class="relative h-24 w-full bg-muted/20 rounded-xl overflow-hidden px-1 pt-4">
          <svg viewBox="0 0 100 40" class="h-full w-full overflow-visible" preserveAspectRatio="none">
            <!-- Grid Lines -->
            <line x1="0" y1="20" x2="100" y2="20" class="stroke-muted/30 stroke-[0.5]" />
            <!-- Area Gradient -->
            <polyline :points="equityCurveArea" class="fill-indigo-500/10" />
            <!-- Line -->
            <polyline :points="equityCurvePath" fill="none" class="stroke-indigo-600 stroke-[1.5]" stroke-linejoin="round" stroke-linecap="round" />
            <!-- Current Point Pulse -->
            <circle v-if="equityCurvePoints.length > 1" :cx="100" :cy="equityCurvePath.split(' ').pop()?.split(',')[1]" r="1.5" class="fill-indigo-600 animate-pulse" />
          </svg>
        </div>
      </CardContent>
    </Card>

    <!-- Detailed Metrics -->
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl border bg-card p-3 space-y-1 animate-fade-in-up stagger-3">
        <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Risk Compliance</p>
        <p class="text-lg font-black tracking-tight" :class="riskComplianceScore >= 90 ? 'text-emerald-600' : 'text-amber-500'">{{ riskComplianceScore.toFixed(0) }}%</p>
        <div class="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div class="h-full bg-emerald-500 transition-all duration-1000" :style="{ width: `${riskComplianceScore}%` }"></div>
        </div>
      </div>
      <div class="rounded-2xl border bg-card p-3 space-y-1 animate-fade-in-up stagger-4">
        <p class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Risk Drift</p>
        <p class="text-lg font-black tracking-tight" :class="Math.abs(riskDrift) <= 10 ? 'text-emerald-600' : 'text-red-500'">{{ riskDrift > 0 ? '+' : '' }}{{ riskDrift.toFixed(1) }}%</p>
        <div class="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div class="h-full bg-indigo-500 transition-all duration-1000" :style="{ width: `${Math.min(100, Math.abs(riskDrift))}%` }"></div>
        </div>
      </div>
    </div>

    <!-- 100-Trade Heatmap -->
    <Card class="animate-fade-in-up stagger-5 border-indigo-100 dark:border-indigo-900/50">
      <CardContent class="p-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Flame class="h-4 w-4 text-orange-500" />
            <h3 class="text-xs font-black uppercase tracking-widest">The 100 Challenge</h3>
          </div>
          <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full uppercase tracking-widest">
            {{ progressPercent.toFixed(0) }}% Completed
          </span>
        </div>
        <div class="grid grid-cols-10 gap-1.5">
          <div
            v-for="cell in heatmapCells"
            :key="cell.id"
            class="aspect-square rounded-[3px] border border-black/5 dark:border-white/5 transition-all duration-500 hover:scale-125 hover:z-10 cursor-pointer"
            :class="[
              cell.outcome === 'Win' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
              cell.outcome === 'Loss' ? 'bg-red-500' :
              cell.outcome === 'Breakeven' ? 'bg-amber-500' :
              cell.outcome === 'Open' ? 'bg-indigo-400 animate-pulse' : 'bg-muted/30'
            ]"
            :title="`Trade #${cell.id}: ${cell.outcome}`"
          ></div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
