<script setup lang="ts">
const props = defineProps<{
  showToast: (msg: string) => void;
}>();
</script>

<template>
  <section class="p-4 md:grid md:grid-cols-2 md:gap-6 items-stretch space-y-3 md:space-y-0">
    <!-- Left Column -->
    <div class="flex flex-col space-y-3">
      <TradeCalculatorResultsCard />
      <TradeCalculatorSignalParser />
      <TradeCalculatorTradeSetupForm />
    </div>

    <!-- Right Column: Risk & Output Config -->
    <TradeCalculatorRiskOutputPanel :show-toast="props.showToast" />
  </section>
</template>
