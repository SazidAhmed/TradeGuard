<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { Wand2, ChevronDown, ChevronUp } from "lucide-vue-next";
import { useTradeguardStore } from "~/stores/tradeguard";
import { Button } from "~/components/ui/button";

const store = useTradeguardStore();
const { signalText, parserMessage } = storeToRefs(store);

const showSignalParser = ref(false);

const handleParseSignal = () => {
  store.parseSignal();
  showSignalParser.value = false;
};
</script>

<template>
  <div>
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
            aria-label="Paste trading signal"
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
              aria-label="Paste trading signal"
              class="min-h-48 w-full rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 bg-muted/30 p-4 text-base font-bold outline-none focus-visible:border-indigo-500 focus-visible:ring-4 focus-visible:ring-indigo-500/10 transition-all placeholder:text-muted-foreground/60 shadow-inner"
              placeholder="Paste signal (e.g., Buy BTCUSDT Entry 50000 SL 48000)"
            />
          </div>
          <div class="mt-6 flex flex-col gap-3">
            <Button size="lg" class="h-14 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-500/30 active:scale-[0.98] transition-all" @click="handleParseSignal">
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
  </div>
</template>
