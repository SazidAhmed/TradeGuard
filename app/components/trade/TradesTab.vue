<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref, computed } from "vue";
import {
  FileUp,
  FileDown,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { Button } from "~/components/ui/button";
import TradeCard from "./TradeCard.vue";

const props = defineProps<{
  showToast: (msg: string) => void;
  openImportDialog: () => void;
}>();

const store = useTradeguardStore();
const {
  outcomeFilter,
  filteredTrades,
} = storeToRefs(store);

const showAllTrades = ref(false);
const displayedTrades = computed(() => {
  if (showAllTrades.value) return filteredTrades.value;
  return filteredTrades.value.slice(0, 5);
});
const hasMoreTrades = computed(() => filteredTrades.value.length > 5);

const tradeToDelete = ref<number | null>(null);
const confirmDeleteTrade = (id: number) => {
  tradeToDelete.value = id;
};

const executeDeleteTrade = () => {
  if (tradeToDelete.value !== null) {
    store.removeTrade(tradeToDelete.value);
    tradeToDelete.value = null;
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
</script>

<template>
  <section class="space-y-3 p-4">
    <!-- Filter Chips -->
    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pt-1">
      <Button
        size="default"
        v-for="filter in ['All', 'Open', 'Win', 'Loss', 'Breakeven'] as const"
        :key="filter"
        :variant="outcomeFilter === filter ? 'default' : 'outline'"
        class="h-11 whitespace-nowrap rounded-2xl text-xs font-black uppercase tracking-widest px-6"
        :class="outcomeFilter === filter ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : ''"
        @click="outcomeFilter = filter"
      >
        {{ filter === 'Breakeven' ? 'BE' : filter }}
      </Button>
    </div>

    <!-- Actions Row -->
    <div class="flex gap-2">
      <Button size="default" variant="outline" class="h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl" @click="exportSession">
        <FileDown class="mr-2 h-4 w-4" /> Export Data
      </Button>
      <Button size="default" variant="outline" class="h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl" @click="openImportDialog">
        <FileUp class="mr-2 h-4 w-4" /> Import Session
      </Button>
      <Button size="icon" variant="outline" class="h-11 w-11 rounded-xl text-red-500 border-red-100 dark:border-red-900/30" @click="$emit('clear-trades')">
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>

    <!-- Trade List -->
    <div v-if="filteredTrades.length === 0" class="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-3xl opacity-50">
      <div class="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Trash2 class="h-6 w-6" />
      </div>
      <p class="text-sm font-bold uppercase tracking-widest">No trades found</p>
    </div>

    <div v-else class="space-y-3">
      <TransitionGroup name="list">
        <TradeCard 
          v-for="trade in displayedTrades" 
          :key="trade.id" 
          :trade="trade"
          :confirm-delete-trade="confirmDeleteTrade"
        />
      </TransitionGroup>

      <!-- Load More -->
      <Button 
        v-if="hasMoreTrades" 
        variant="ghost" 
        class="w-full h-12 font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 group"
        @click="showAllTrades = !showAllTrades"
      >
        <span>{{ showAllTrades ? 'Show Less' : `Show All (${filteredTrades.length})` }}</span>
        <component :is="showAllTrades ? ChevronUp : ChevronDown" class="ml-2 h-4 w-4 transition-transform group-hover:scale-125" />
      </Button>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-300 ease-linear"
        leave-active-class="transition-opacity duration-200 ease-linear"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="tradeToDelete !== null" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-md" @click="tradeToDelete = null"></div>
          <div class="relative w-full max-w-sm rounded-[32px] bg-card p-8 shadow-2xl border border-red-100 dark:border-red-900/30 animate-in zoom-in-95 duration-300">
            <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 mx-auto">
              <Trash2 class="h-8 w-8" />
            </div>
            <h3 class="mb-2 text-center text-xl font-black uppercase tracking-tight">Delete Trade?</h3>
            <p class="mb-8 text-center text-sm font-bold text-muted-foreground">This action cannot be undone. This trade will be permanently removed from your log.</p>
            <div class="flex flex-col gap-3">
              <Button size="lg" class="h-14 w-full bg-red-600 hover:bg-red-700 text-white font-black text-lg shadow-xl shadow-red-500/30" @click="executeDeleteTrade">
                DELETE PERMANENTLY
              </Button>
              <Button size="lg" variant="ghost" class="h-12 w-full font-bold text-muted-foreground" @click="tradeToDelete = null">
                CANCEL
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
