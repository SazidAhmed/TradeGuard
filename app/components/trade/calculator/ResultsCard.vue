<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { TrendingUp, TrendingDown } from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { useFormatting } from "~/composables/useFormatting";
import { Card, CardContent } from "~/components/ui/card";

const store = useTradeguardStore();
const {
  direction,
  hasInvalidInputs,
  quantityToBuy,
  totalCostUSDT,
  marginRequiredUSDT,
  riskPerUnit,
  riskAmount,
} = storeToRefs(store);

const { formatNumber, formatMoney } = useFormatting();
</script>

<template>
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
        <div
          class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-500"
        ></div>

        <CardContent class="p-3 pl-4">
          <div class="mb-1 flex items-center justify-between">
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >QUANTITY TO BUY</span
            >
            <div
              class="flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-300 shadow-sm"
              :class="
                direction === 'long'
                  ? 'bg-emerald-100 shadow-emerald-500/20'
                  : 'bg-red-100 shadow-red-500/20'
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
          <div
            class="flex items-baseline gap-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-50 scale-95 text-indigo-500"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="hidden"
            >
              <p
                :key="quantityToBuy"
                class="text-4xl font-black tabular-nums tracking-tight dark:text-white"
              >
                {{ hasInvalidInputs ? "---" : formatNumber(quantityToBuy, 4) }}
              </p>
            </Transition>
            <span
              v-if="!hasInvalidInputs"
              class="text-xs font-bold text-muted-foreground/60 ml-1"
              >Units</span
            >
          </div>
          <div
            class="mt-1 flex flex-col gap-0.5 text-[10px] font-medium text-muted-foreground"
            aria-live="polite"
          >
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <span
                >Pos:
                <strong class="text-foreground/80 font-semibold">{{
                  hasInvalidInputs ? "---" : formatMoney(totalCostUSDT)
                }}</strong></span
              >
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
              <span
                >Margin:
                <strong class="text-foreground/80 font-semibold">{{
                  hasInvalidInputs ? "---" : formatMoney(marginRequiredUSDT)
                }}</strong></span
              >
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Risk Summary Vertical -->
      <div class="flex flex-1 flex-col gap-2" aria-live="polite">
        <div
          class="animate-fade-in-up stagger-1 flex-1 rounded-xl border bg-card/50 p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-center"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.02] pointer-events-none"
          ></div>
          <p
            class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            Risk/Unit
          </p>
          <p class="text-sm font-bold tabular-nums dark:text-white mt-0.5">
            {{ hasInvalidInputs ? "---" : formatNumber(riskPerUnit, 4) }}
          </p>
        </div>
        <div
          class="animate-fade-in-up stagger-2 flex-1 rounded-xl border bg-card/50 p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-center"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.02] pointer-events-none"
          ></div>
          <p
            class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            Risk Amt
          </p>
          <p
            class="text-sm font-bold tabular-nums mt-0.5"
            :class="
              hasInvalidInputs
                ? 'text-muted-foreground'
                : 'text-red-600 dark:text-red-400'
            "
          >
            {{ hasInvalidInputs ? "---" : formatMoney(riskAmount) }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
