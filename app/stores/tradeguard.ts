import { defineStore } from "pinia"
import { z } from "zod"

export type RiskMode = "percent" | "fixed"
export type Direction = "long" | "short"
export type TradeOutcome = "Open" | "Win" | "Loss" | "Breakeven"
export type TradeFilter = "All" | TradeOutcome

// --- ZOD SCHEMAS ---
const TargetSchema = z.object({
  multiple: z.number(),
  price: z.number(),
})

const TradeLogEntrySchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  symbol: z.string(),
  direction: z.enum(["long", "short"]),
  entryPrice: z.number(),
  stopLoss: z.number(),
  leverage: z.number(),
  riskMode: z.enum(["percent", "fixed"]),
  riskValue: z.number(),
  riskAmount: z.number(),
  riskPerUnit: z.number(),
  quantity: z.number(),
  positionSizeUSDT: z.number(),
  targets: z.array(TargetSchema),
  actualRiskUsed: z.number(),
  targetHitMultiple: z.number().nullable(),
  outcome: z.enum(["Open", "Win", "Loss", "Breakeven"]),
})

const PersistedStateSchema = z.object({
  symbol: z.string().default(""),
  accountBalance: z.union([z.number(), z.string()]).default(""),
  leverage: z.number().default(1),
  riskMode: z.enum(["percent", "fixed"]).default("fixed"),
  riskValue: z.union([z.number(), z.string()]).default(""),
  direction: z.enum(["long", "short"]).default("long"),
  entryPrice: z.union([z.number(), z.string()]).default(""),
  stopLoss: z.union([z.number(), z.string()]).default(""),
  targetRatios: z.array(z.number()).default([1, 2, 3]),
  tradeLog: z.array(TradeLogEntrySchema).default([]),
})

export type TradeLogEntry = z.infer<typeof TradeLogEntrySchema>
export type PersistedState = z.infer<typeof PersistedStateSchema>

const STORAGE_KEY = "tradeguard.phase1.state"
const PRICE_DECIMALS = 6
const QUANTITY_DECIMALS = 4

const toFixedNumber = (value: number, decimals = PRICE_DECIMALS) => Number(value.toFixed(decimals))

export const useTradeguardStore = defineStore("tradeguard", {
  state: () => ({
    symbol: "",
    entryPrice: "" as number | string,
    stopLoss: "" as number | string,
    accountBalance: "" as number | string,
    leverage: 1,
    riskMode: "fixed" as RiskMode,
    riskValue: "" as number | string,
    direction: "long" as Direction,
    signalText: "",
    parserMessage: "",
    tradeLog: [] as TradeLogEntry[],
    outcomeFilter: "All" as TradeFilter,
    targetRatios: [1, 2, 3] as number[],
  }),
  getters: {
    riskAmount(): number {
      const baseBalance = this.currentBalance
      const userRisk = Number(this.riskValue)
      if (Number.isNaN(baseBalance) || Number.isNaN(userRisk) || baseBalance <= 0 || userRisk <= 0) return 0
      return this.riskMode === "percent" ? baseBalance * (userRisk / 100) : userRisk
    },
    riskPerUnit: (state) => Math.abs(Number(state.entryPrice) - Number(state.stopLoss)),
    hasInvalidInputs(): boolean {
      return Number(this.entryPrice) <= 0
        || Number(this.stopLoss) <= 0
        || Number(this.accountBalance) <= 0
        || Number(this.riskValue) <= 0
        || this.riskPerUnit === 0
    },
    hasInsufficientMargin(): boolean {
      if (this.hasInvalidInputs) return false
      return this.marginRequiredUSDT > Number(this.accountBalance)
    },
    quantityToBuy(): number {
      if (this.hasInvalidInputs) return 0
      return this.riskAmount / this.riskPerUnit
    },
    totalCostUSDT(): number {
      return this.quantityToBuy * Number(this.entryPrice)
    },
    marginRequiredUSDT(): number {
      const lev = Number(this.leverage) || 1
      return this.totalCostUSDT / lev
    },
    targets(): { multiple: number, price: number }[] {
      return this.targetRatios.map((n) => {
        if (this.hasInvalidInputs) return { multiple: n, price: 0 }
        const move = this.riskPerUnit * n
        const price = this.direction === "long"
          ? Number(this.entryPrice) + move
          : Number(this.entryPrice) - move
        return { multiple: n, price: toFixedNumber(price) }
      })
    },
    filteredTrades: (state) => {
      if (state.outcomeFilter === "All") return state.tradeLog
      return state.tradeLog.filter(trade => trade.outcome === state.outcomeFilter)
    },
    closedTrades: (state) => state.tradeLog.filter(trade => trade.outcome !== "Open"),
    winsCount: (state) => state.tradeLog.filter(trade => trade.outcome === "Win").length,
    lossesCount: (state) => state.tradeLog.filter(trade => trade.outcome === "Loss").length,
    breakevenCount: (state) => state.tradeLog.filter(trade => trade.outcome === "Breakeven").length,
    averageRiskPerTrade(): number {
      if (this.closedTrades.length === 0) return 0
      const total = this.closedTrades.reduce((sum, trade) => sum + trade.actualRiskUsed, 0)
      return total / this.closedTrades.length
    },
    riskComplianceScore(): number {
      if (this.closedTrades.length === 0) return 100
      const compliant = this.closedTrades.filter(trade => trade.actualRiskUsed <= trade.riskAmount).length
      return (compliant / this.closedTrades.length) * 100
    },
    riskDrift(): number {
      if (this.closedTrades.length === 0) return 0
      const planned = this.closedTrades.reduce((sum, trade) => sum + trade.riskAmount, 0) / this.closedTrades.length
      if (planned <= 0) return 0
      return ((this.averageRiskPerTrade - planned) / planned) * 100
    },
    realizedPnL(): number {
      return this.closedTrades.reduce((sum, trade) => {
        if (trade.outcome === "Loss") return sum - trade.actualRiskUsed
        if (trade.outcome === "Win") {
          const reward = trade.actualRiskUsed * (trade.targetHitMultiple ?? 1)
          return sum + reward
        }
        return sum
      }, 0)
    },
    currentBalance(): number {
      return Number(this.accountBalance) + this.realizedPnL
    },
    remainingBalance(): number {
      return Math.max(0, this.currentBalance)
    },
    survivalLossesRemaining(): number {
      if (this.riskAmount <= 0) return 0
      return Math.floor(this.remainingBalance / this.riskAmount)
    },
    heatmapCells: (state) => Array.from({ length: 100 }, (_, idx) => ({
      id: idx + 1,
      outcome: (state.tradeLog[idx]?.outcome ?? "Pending") as TradeOutcome | "Pending",
    })),
    totalTradesCount: (state) => state.tradeLog.length,
    progressPercent: (state) => Math.min(100, (state.tradeLog.length / 100) * 100),
    winRate(): number {
      if (this.closedTrades.length === 0) return 0
      return (this.winsCount / this.closedTrades.length) * 100
    },
    netR(): number {
      return this.closedTrades.reduce((sum, trade) => {
        if (trade.outcome === "Loss") return sum - 1
        if (trade.outcome === "Breakeven") return sum
        if (trade.outcome === "Win") return sum + (trade.targetHitMultiple ?? 1)
        return sum
      }, 0)
    },
  },
  actions: {
    parseSignal() {
      this.parserMessage = ""
      const text = this.signalText.trim()
      if (!text) {
        this.parserMessage = "Paste a signal first."
        return
      }

      const entryRangeRegex = /(?:entry|entries|buy(?:\s+zone)?|at|price)\s*[:=\s]*\$?\s*([\d.]+)\s*[-–~to]+\s*([\d.]+)/i
      const entryRegex = /(?:entry|entries|buy(?:\s+zone)?|at|price)\s*[:=\s]*\$?\s*([\d.]+)/i
      const slRegex = /(?:sl|stop(?:\s|-)?loss|stop)\s*[:=\s]*\$?\s*([\d.]+)/i
      const targetsRegex = /(?:tp|take\s*profit|target|targets?)\s*[:=\s]*([^\n]+)/i
      const levRegex = /(?:lev|leverage|cross|isolated)\s*[:=\s]*([0-9]+)\s*x?/i

      const rangeMatch = text.match(entryRangeRegex)
      const entryMatch = text.match(entryRegex)
      const slMatch = text.match(slRegex)
      const targetsMatch = text.match(targetsRegex)
      const levMatch = text.match(levRegex) || text.match(/([0-9]+)\s*x/i)

      let changes = 0

      if (rangeMatch?.[1] && rangeMatch?.[2]) {
        const min = Number(rangeMatch[1])
        const max = Number(rangeMatch[2])
        if (!Number.isNaN(min) && !Number.isNaN(max)) {
          this.entryPrice = toFixedNumber((min + max) / 2)
          changes++
        }
      }
      else if (entryMatch?.[1]) {
        const parsedEntry = Number(entryMatch[1])
        if (!Number.isNaN(parsedEntry)) {
          this.entryPrice = parsedEntry
          changes++
        }
      }

      if (slMatch?.[1]) {
        const parsedSl = Number(slMatch[1])
        if (!Number.isNaN(parsedSl)) {
          this.stopLoss = parsedSl
          changes++
        }
      }

      if (levMatch?.[1]) {
        const parsedLev = Number(levMatch[1])
        if (!Number.isNaN(parsedLev) && parsedLev > 0 && parsedLev <= 100) {
          this.leverage = parsedLev
          changes++
        }
      }

      if (targetsMatch?.[1]) {
        const targetNumbers = targetsMatch[1].match(/[\d.]+/g) ?? []
        if (targetNumbers.length > 0) this.parserMessage = `Parsed ${targetNumbers.length} target(s).`
      }
      else {
        const lines = text.split(/\r?\n/)
        const tpLineIndex = lines.findIndex(line => /(tp|target|take profit)/i.test(line))
        if (tpLineIndex >= 0) {
          const fallbackSlice = lines.slice(tpLineIndex, tpLineIndex + 4).join(" ")
          const targetNumbers = fallbackSlice.match(/[\d.]+/g) ?? []
          if (targetNumbers.length > 0) this.parserMessage = `Parsed ${targetNumbers.length} target(s).`
        }
      }

      if (changes === 0) {
        this.parserMessage = "Could not parse signal. Please fill values manually."
        return
      }
      if (!this.parserMessage) this.parserMessage = "Signal parsed and fields updated."
    },
    logTradeSnapshot() {
      if (this.hasInvalidInputs) {
        this.parserMessage = "Cannot log trade: fix invalid calculator inputs first."
        return
      }
      if (this.hasInsufficientMargin) {
        this.parserMessage = "Cannot log trade: insufficient margin."
        return
      }

      const entry: TradeLogEntry = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        symbol: this.symbol,
        direction: this.direction,
        entryPrice: toFixedNumber(Number(this.entryPrice)),
        stopLoss: toFixedNumber(Number(this.stopLoss)),
        leverage: Number(this.leverage),
        riskMode: this.riskMode,
        riskValue: Number(this.riskValue),
        riskAmount: toFixedNumber(this.riskAmount, 4),
        riskPerUnit: toFixedNumber(this.riskPerUnit),
        quantity: toFixedNumber(this.quantityToBuy, QUANTITY_DECIMALS),
        positionSizeUSDT: toFixedNumber(this.totalCostUSDT, 4),
        targets: this.targets.map(item => ({ multiple: item.multiple, price: item.price })),
        actualRiskUsed: toFixedNumber(this.riskAmount, 4),
        targetHitMultiple: null,
        outcome: "Open",
      }
      this.tradeLog.unshift(entry)
      
      // Clear specific fields for the next execution
      this.symbol = ""
      this.entryPrice = ""
      this.stopLoss = ""
      this.signalText = ""
    },
    setOutcome(id: number, outcome: TradeOutcome) {
      const item = this.tradeLog.find(trade => trade.id === id)
      if (item) {
        item.outcome = outcome
        if (outcome === "Win") {
          // If switching to Win and no multiple is set, default to first target
          if (item.targetHitMultiple === null || item.targetHitMultiple <= 0) {
            item.targetHitMultiple = item.targets[0]?.multiple || 1
          }
        } else if (outcome === "Loss") {
          item.targetHitMultiple = -1
        } else if (outcome === "Breakeven") {
          item.targetHitMultiple = 0
        } else {
          item.targetHitMultiple = null
        }
      }
    },
    setTargetHitMultiple(id: number, value: number) {
      const item = this.tradeLog.find(trade => trade.id === id)
      if (item) {
        item.targetHitMultiple = value
        // Auto-update outcome based on multiple if applicable
        if (value > 0) item.outcome = "Win"
        else if (value === 0) item.outcome = "Breakeven"
        else if (value < 0) item.outcome = "Loss"
      }
    },
    updateActualRisk(id: number, value: string | number) {
      const parsed = Number(value)
      if (Number.isNaN(parsed) || parsed <= 0) return
      const item = this.tradeLog.find(trade => trade.id === id)
      if (item) item.actualRiskUsed = parsed
    },
    removeTrade(id: number) {
      this.tradeLog = this.tradeLog.filter(trade => trade.id !== id)
    },
    clearTradeLog() {
      this.tradeLog = []
    },
    resetCalculator() {
      this.entryPrice = ""
      this.stopLoss = ""
      this.direction = "long"
      this.signalText = ""
      this.parserMessage = "Calculator reset to defaults."
      this.symbol = ""
    },
    clearAllData() {
      this.$reset()
      if (import.meta.client) {
        localStorage.removeItem(STORAGE_KEY)
      }
      this.parserMessage = "All local data cleared."
    },
    buildPersistedState(): PersistedState {
      return {
        symbol: this.symbol,
        accountBalance: this.accountBalance === "" ? "" : Number(this.accountBalance),
        leverage: Number(this.leverage),
        riskMode: this.riskMode,
        riskValue: this.riskValue === "" ? "" : Number(this.riskValue),
        direction: this.direction,
        entryPrice: this.entryPrice === "" ? "" : Number(this.entryPrice),
        stopLoss: this.stopLoss === "" ? "" : Number(this.stopLoss),
        targetRatios: this.targetRatios,
        tradeLog: this.tradeLog,
      }
    },
    persistToStorage() {
      if (!import.meta.client) return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buildPersistedState()))
    },
    hydrateFromStorage() {
      if (!import.meta.client) return
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const rawJson = JSON.parse(raw)
        // Migration: Old targetRatios might be missing, ensure we handle it
        const result = PersistedStateSchema.safeParse(rawJson)
        if (result.success) {
          const data = result.data
          this.symbol = data.symbol
          this.accountBalance = data.accountBalance === 0 ? "" : data.accountBalance
          this.leverage = data.leverage
          this.riskMode = data.riskMode
          this.riskValue = data.riskValue === 0 ? "" : data.riskValue
          this.direction = data.direction
          this.entryPrice = data.entryPrice === 0 ? "" : data.entryPrice
          this.stopLoss = data.stopLoss === 0 ? "" : data.stopLoss
          this.targetRatios = data.targetRatios
          
          // Data Migration for TradeLog targets (Old format was number[], new is {multiple, price}[])
          this.tradeLog = data.tradeLog.map(trade => {
             if (trade.targets.length > 0 && typeof (trade.targets[0] as any) === 'number') {
               return {
                 ...trade,
                 targets: (trade.targets as unknown as number[]).map((price, idx) => ({
                   multiple: idx + 1,
                   price
                 }))
               }
             }
             return trade
          })
        } else {
          console.error("Hydration failed validation:", result.error)
          this.parserMessage = "Saved session was invalid and was skipped."
        }
      }
      catch (e) {
        console.error("Hydration failed:", e)
        this.parserMessage = "Saved session was invalid and was skipped."
      }
    },
    exportSessionData(): string {
      return JSON.stringify(this.buildPersistedState(), null, 2)
    },
    importSessionData(payload: unknown): boolean {
      try {
        const result = PersistedStateSchema.safeParse(payload)
        if (result.success) {
          const data = result.data
          this.symbol = data.symbol
          this.accountBalance = data.accountBalance
          this.leverage = data.leverage
          this.riskMode = data.riskMode
          this.riskValue = data.riskValue
          this.direction = data.direction
          this.entryPrice = data.entryPrice
          this.stopLoss = data.stopLoss
          this.targetRatios = data.targetRatios
          this.tradeLog = data.tradeLog
          this.parserMessage = "Session imported successfully."
          return true
        } else {
          this.parserMessage = "Import failed: Invalid session file format."
          console.error("Import validation error:", result.error)
          return false
        }
      } catch (e) {
        this.parserMessage = "Import failed: Malformed file."
        console.error("Import error:", e)
        return false
      }
    },
  },
})
