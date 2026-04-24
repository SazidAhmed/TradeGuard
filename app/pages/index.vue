<script setup lang="ts">
import { storeToRefs } from "pinia"
import { onMounted, ref, watch } from "vue"
import { Clipboard, TriangleAlert } from "lucide-vue-next"

useSeoMeta({
  title: "TradeGuard | Smart Risk Calculator",
  description: "Position sizing and execution planning for the 100-Trade Challenge.",
})

const store = useTradeguardStore()
const {
  symbol,
  entryPrice,
  stopLoss,
  accountBalance,
  riskMode,
  riskValue,
  direction,
  signalText,
  parserMessage,
  outcomeFilter,
  filteredTrades,
  heatmapCells,
  riskAmount,
  hasInvalidInputs,
  quantityToBuy,
  totalCostUSDT,
  targets,
  remainingBalance,
  survivalLossesRemaining,
  averageRiskPerTrade,
  riskComplianceScore,
  riskDrift,
  winsCount,
  lossesCount,
  breakevenCount,
  riskPerUnit,
  tradeLog,
  totalTradesCount,
  progressPercent,
  winRate,
  netR,
} = storeToRefs(store)

const copyMessage = ref("")
const importFileInput = ref<HTMLInputElement | null>(null)

const PRICE_DECIMALS = 6
const QUANTITY_DECIMALS = 4
const toFixedNumber = (value: number, decimals = PRICE_DECIMALS) => Number(value.toFixed(decimals))
const formatNumber = (value: number, decimals = PRICE_DECIMALS) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(value)
const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value)

const copyTarget = async (price: number) => {
  if (!process.client || hasInvalidInputs.value) return
  try {
    await navigator.clipboard.writeText(String(price))
    copyMessage.value = `Copied target ${price}`
    setTimeout(() => {
      copyMessage.value = ""
    }, 1500)
  }
  catch {
    copyMessage.value = "Clipboard permission denied."
  }
}

const exportSession = () => {
  if (!process.client) return
  const payload = store.exportSessionData()
  const blob = new Blob([payload], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  const dateSuffix = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `tradeguard-session-${dateSuffix}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const openImportSessionDialog = () => {
  importFileInput.value?.click()
}

const importSession = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    store.importSessionData(JSON.parse(text) as unknown)
  }
  catch {
    parserMessage.value = "Import failed: invalid session JSON file."
  }
  finally {
    input.value = ""
  }
}

onMounted(() => {
  store.hydrateFromStorage()
})

watch(
  () => store.$state,
  () => store.persistToStorage(),
  { deep: true },
)
</script>

<template>
  <main class="min-h-screen bg-muted/30 text-foreground">
    <div class="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside class="border-r bg-background p-4">
        <h1 class="text-xl font-semibold">
          TradeGuard
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          The 100-Trade Challenge
        </p>
        <nav class="mt-6 space-y-2">
          <Button class="w-full justify-start">Calculator</Button>
          <Button variant="outline" class="w-full justify-start">Journal (Phase 2)</Button>
          <Button variant="outline" class="w-full justify-start">Analytics (Phase 2)</Button>
        </nav>
      </aside>

      <section class="flex flex-col">
        <header class="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div class="flex flex-wrap items-center gap-3">
            <Badge variant="outline">
              Current Balance: {{ formatMoney(remainingBalance) }}
            </Badge>
            <Badge variant="secondary">
              Losses Remaining: {{ survivalLossesRemaining }}
            </Badge>
            <Badge variant="outline">
              Risk/Trade: {{ formatMoney(riskAmount) }}
            </Badge>
            <Badge variant="outline">
              Progress: {{ totalTradesCount }}/100
            </Badge>
          </div>
        </header>

        <div class="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card class="gap-4">
            <CardHeader class="gap-2 pb-0">
              <CardTitle>Smart Calculator</CardTitle>
              <CardDescription>Set your trade inputs and risk mode.</CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div class="grid gap-2">
                <Label for="symbol">Symbol</Label>
                <Input id="symbol" v-model="symbol" type="text" placeholder="e.g. AVNTUSDT" />
              </div>

              <div class="grid gap-2">
                <Label for="direction">Direction</Label>
                <div class="flex gap-2">
                  <Button
                    class="flex-1"
                    :variant="direction === 'long' ? 'default' : 'outline'"
                    @click="direction = 'long'"
                  >
                    Long
                  </Button>
                  <Button
                    class="flex-1"
                    :variant="direction === 'short' ? 'default' : 'outline'"
                    @click="direction = 'short'"
                  >
                    Short
                  </Button>
                </div>
              </div>

              <div class="grid gap-2">
                <Label for="entry">Entry Price</Label>
                <Input id="entry" v-model="entryPrice" type="number" step="any" />
              </div>

              <div class="grid gap-2">
                <Label for="sl">Stop Loss</Label>
                <Input id="sl" v-model="stopLoss" type="number" step="any" />
              </div>

              <div class="grid gap-2">
                <Label for="balance">Account Balance (USDT)</Label>
                <Input id="balance" v-model="accountBalance" type="number" step="any" />
              </div>

              <div class="grid gap-2">
                <Label for="risk">Risk Input Group</Label>
                <div class="flex gap-2">
                  <Input id="risk" v-model="riskValue" type="number" min="0" step="any" class="flex-1" />
                  <div class="flex rounded-md border p-1">
                    <Button
                      size="sm"
                      :variant="riskMode === 'percent' ? 'default' : 'ghost'"
                      @click="riskMode = 'percent'"
                    >
                      %
                    </Button>
                    <Button
                      size="sm"
                      :variant="riskMode === 'fixed' ? 'default' : 'ghost'"
                      @click="riskMode = 'fixed'"
                    >
                      $
                    </Button>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground">
                  You are risking {{ formatMoney(riskAmount) }} on this trade.
                </p>
              </div>

              <div class="grid gap-2">
                <Label for="signal">Signal Sync: Quick Paste</Label>
                <textarea
                  id="signal"
                  v-model="signalText"
                  class="border-input bg-background min-h-28 rounded-md border p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  placeholder="Paste your signal text here..."
                />
                <div class="flex items-center gap-2">
                  <Button variant="outline" @click="store.parseSignal">
                    Parse Signal
                  </Button>
                  <Button variant="outline" @click="store.resetCalculator">
                    Reset Inputs
                  </Button>
                  <span class="text-sm text-muted-foreground">{{ parserMessage }}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="gap-2 pb-0">
              <CardTitle>The Execution Card</CardTitle>
              <CardDescription>Use these values to place your trade.</CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    Risk Per Unit
                  </p>
                  <p class="text-lg font-semibold">
                    {{ toFixedNumber(riskPerUnit) }}
                  </p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    Risk Amount
                  </p>
                  <p class="text-lg font-semibold">
                    {{ formatMoney(riskAmount) }}
                  </p>
                </div>
              </div>

              <div class="rounded-md border p-4">
                <p class="text-sm text-muted-foreground">
                  Quantity to Buy
                </p>
                <p class="text-3xl font-bold">
                  {{ toFixedNumber(quantityToBuy) }}
                </p>
              </div>

              <div class="rounded-md border p-4">
                <p class="text-sm text-muted-foreground">
                  Total Position Size (USDT)
                </p>
                <p class="text-3xl font-bold">
                  {{ formatMoney(totalCostUSDT) }}
                </p>
              </div>

              <div v-if="hasInvalidInputs" class="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <TriangleAlert class="size-4" />
                Check inputs. Entry, SL, balance, and risk must be positive, and Entry cannot equal SL.
              </div>
            </CardContent>
            <CardFooter class="flex-col items-stretch gap-3">
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  v-for="item in targets"
                  :key="item.multiple"
                  variant="outline"
                  :disabled="hasInvalidInputs"
                  @click="copyTarget(item.price)"
                >
                  <Clipboard class="size-4" />
                  Set 1:{{ item.multiple }} Target
                </Button>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ copyMessage }}
              </p>
              <Button :disabled="hasInvalidInputs" @click="store.logTradeSnapshot">
                Log Trade Snapshot
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div class="px-4 pb-4">
          <Card class="mb-4">
            <CardHeader class="gap-2 pb-0">
              <CardTitle>100-Trade Progress</CardTitle>
              <CardDescription>Track challenge completion pace.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full bg-primary transition-all"
                  :style="{ width: `${progressPercent}%` }"
                />
              </div>
              <p class="text-sm text-muted-foreground">
                Completed {{ totalTradesCount }} of 100 trades ({{ formatNumber(progressPercent, 2) }}%)
              </p>
            </CardContent>
          </Card>

          <div class="mb-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader class="gap-2 pb-0">
                <CardTitle>Risk Consistency</CardTitle>
                <CardDescription>Discipline metrics from closed local trades.</CardDescription>
              </CardHeader>
              <CardContent class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    Avg Risk / Trade
                  </p>
                  <p class="text-xl font-semibold">
                    {{ formatMoney(averageRiskPerTrade) }}
                  </p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    Compliance Score
                  </p>
                  <p class="text-xl font-semibold">
                    {{ formatNumber(riskComplianceScore, 2) }}%
                  </p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    Risk Drift
                  </p>
                  <p class="text-xl font-semibold">
                    {{ formatNumber(riskDrift, 2) }}%
                  </p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    W / L / BE
                  </p>
                  <p class="text-xl font-semibold">
                    {{ winsCount }} / {{ lossesCount }} / {{ breakevenCount }}
                  </p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    Win Rate
                  </p>
                  <p class="text-xl font-semibold">
                    {{ formatNumber(winRate, 2) }}%
                  </p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground uppercase">
                    Net R
                  </p>
                  <p class="text-xl font-semibold">
                    {{ formatNumber(netR, 2) }}R
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader class="gap-2 pb-0">
                <CardTitle>Survival Heatmap</CardTitle>
                <CardDescription>100-trade progress map from current local session.</CardDescription>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-10 gap-1">
                  <div
                    v-for="cell in heatmapCells"
                    :key="cell.id"
                    class="h-4 rounded-sm border"
                    :class="{
                      'bg-muted': cell.outcome === 'Pending',
                      'bg-emerald-500': cell.outcome === 'Win',
                      'bg-red-500': cell.outcome === 'Loss',
                      'bg-amber-400': cell.outcome === 'Breakeven',
                      'bg-slate-400': cell.outcome === 'Open',
                    }"
                    :title="`Trade ${cell.id}: ${cell.outcome}`"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader class="gap-2 pb-0">
              <CardTitle>Local Trade Log (Session)</CardTitle>
              <CardDescription>Pinia + localStorage persistence. No backend/database used.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <input
                ref="importFileInput"
                type="file"
                accept="application/json"
                class="hidden"
                @change="importSession"
              >

              <div class="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" @click="exportSession">Export Session</Button>
                <Button size="sm" variant="outline" @click="openImportSessionDialog">Import Session</Button>
                <Button size="sm" variant="outline" @click="store.clearTradeLog">Clear Log</Button>
                <Button size="sm" variant="outline" @click="store.clearAllData">Clear All App Data</Button>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button size="sm" :variant="outcomeFilter === 'All' ? 'default' : 'outline'" @click="outcomeFilter = 'All'">All</Button>
                <Button size="sm" :variant="outcomeFilter === 'Open' ? 'default' : 'outline'" @click="outcomeFilter = 'Open'">Open</Button>
                <Button size="sm" :variant="outcomeFilter === 'Win' ? 'default' : 'outline'" @click="outcomeFilter = 'Win'">Win</Button>
                <Button size="sm" :variant="outcomeFilter === 'Loss' ? 'default' : 'outline'" @click="outcomeFilter = 'Loss'">Loss</Button>
                <Button size="sm" :variant="outcomeFilter === 'Breakeven' ? 'default' : 'outline'" @click="outcomeFilter = 'Breakeven'">Breakeven</Button>
              </div>

              <div v-if="tradeLog.length === 0" class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No trades logged yet. Use "Log Trade Snapshot" from the execution card.
              </div>

              <div
                v-for="trade in filteredTrades"
                :key="trade.id"
                class="rounded-md border p-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-semibold">
                    {{ trade.symbol }} | {{ trade.direction.toUpperCase() }} | Entry {{ formatNumber(trade.entryPrice) }} | SL {{ formatNumber(trade.stopLoss) }}
                  </p>
                  <Badge variant="outline">
                    {{ trade.outcome }}
                  </Badge>
                </div>
                <p class="mt-2 text-sm text-muted-foreground">
                  Qty {{ formatNumber(trade.quantity, QUANTITY_DECIMALS) }} | Position {{ formatMoney(trade.positionSizeUSDT) }} | Risk {{ formatMoney(trade.riskAmount) }}
                </p>
                <p class="text-sm text-muted-foreground">
                  Targets: 1R {{ formatNumber(trade.targets[0]) }}, 2R {{ formatNumber(trade.targets[1]) }}, 3R {{ formatNumber(trade.targets[2]) }}
                </p>
                <div class="mt-2 grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
                  <Label :for="`risk-used-${trade.id}`">Actual Risk Used</Label>
                  <Input
                    :id="`risk-used-${trade.id}`"
                    :model-value="trade.actualRiskUsed"
                    type="number"
                    min="0"
                    step="0.01"
                    @update:model-value="store.updateActualRisk(trade.id, $event)"
                  />
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" @click="store.setOutcome(trade.id, 'Open')">Open</Button>
                  <Button size="sm" variant="outline" @click="store.setOutcome(trade.id, 'Win')">Win</Button>
                  <Button size="sm" variant="outline" @click="store.setOutcome(trade.id, 'Loss')">Loss</Button>
                  <Button size="sm" variant="outline" @click="store.setOutcome(trade.id, 'Breakeven')">Breakeven</Button>
                  <Button size="sm" variant="outline" @click="store.removeTrade(trade.id)">Delete</Button>
                </div>
                <div v-if="trade.outcome === 'Win'" class="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" :variant="trade.targetHitMultiple === 1 ? 'default' : 'outline'" @click="store.setTargetHitMultiple(trade.id, 1)">
                    Hit 1R
                  </Button>
                  <Button size="sm" :variant="trade.targetHitMultiple === 2 ? 'default' : 'outline'" @click="store.setTargetHitMultiple(trade.id, 2)">
                    Hit 2R
                  </Button>
                  <Button size="sm" :variant="trade.targetHitMultiple === 3 ? 'default' : 'outline'" @click="store.setTargetHitMultiple(trade.id, 3)">
                    Hit 3R
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  </main>
</template>
