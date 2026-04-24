import { defineStore } from "pinia"

export type RiskMode = "percent" | "fixed"
export type Direction = "long" | "short"
export type TradeOutcome = "Open" | "Win" | "Loss" | "Breakeven"
export type TradeFilter = "All" | TradeOutcome

export interface TradeLogEntry {
  id: number
  createdAt: string
  symbol: string
  direction: Direction
  entryPrice: number
  stopLoss: number
  leverage: number
  riskMode: RiskMode
  riskValue: number
  riskAmount: number
  riskPerUnit: number
  quantity: number
  positionSizeUSDT: number
  targets: number[]
  actualRiskUsed: number
  targetHitMultiple: number | null
  outcome: TradeOutcome
}

interface PersistedState {
  symbol: string
  accountBalance: number
  leverage: number
  riskMode: RiskMode
  riskValue: number
  direction: Direction
  entryPrice: number
  stopLoss: number
  tradeLog: TradeLogEntry[]
}

const STORAGE_KEY = "tradeguard.phase1.state"
const PRICE_DECIMALS = 6
const QUANTITY_DECIMALS = 4

const toFixedNumber = (value: number, decimals = PRICE_DECIMALS) => Number(value.toFixed(decimals))

export const useTradeguardStore = defineStore("tradeguard", {
  state: () => ({
    symbol: "BTCUSDT",
    entryPrice: 80000,
    stopLoss: 75000,
    accountBalance: 1000,
    leverage: 1,
    riskMode: "fixed" as RiskMode,
    riskValue: 5,
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
        targets: this.targets.map(item => item.price),
        actualRiskUsed: toFixedNumber(this.riskAmount, 4),
        targetHitMultiple: null,
        outcome: "Open",
      }
      this.tradeLog.unshift(entry)
    },
    setOutcome(id: number, outcome: TradeOutcome) {
      const item = this.tradeLog.find(trade => trade.id === id)
      if (item) {
        item.outcome = outcome
        if (outcome !== "Win") item.targetHitMultiple = null
      }
    },
    setTargetHitMultiple(id: number, value: number) {
      const item = this.tradeLog.find(trade => trade.id === id)
      if (item) {
        item.targetHitMultiple = value
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
      this.entryPrice = 80000
      this.stopLoss = 75000
      this.leverage = 1
      this.riskMode = "fixed"
      this.riskValue = 5
      this.direction = "long"
      this.targetRatios = [1, 2, 3]
      this.signalText = ""
      this.parserMessage = "Calculator reset to defaults."
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
        accountBalance: this.accountBalance,
        leverage: this.leverage,
        riskMode: this.riskMode,
        riskValue: this.riskValue,
        direction: this.direction,
        entryPrice: this.entryPrice,
        stopLoss: this.stopLoss,
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
        const parsed = JSON.parse(raw) as Partial<PersistedState>
        if (typeof parsed.symbol === "string" && parsed.symbol.trim()) this.symbol = parsed.symbol
        if (typeof parsed.accountBalance === "number") this.accountBalance = parsed.accountBalance
        if (typeof parsed.leverage === "number") this.leverage = parsed.leverage
        if (parsed.riskMode === "fixed" || parsed.riskMode === "percent") this.riskMode = parsed.riskMode
        if (typeof parsed.riskValue === "number") this.riskValue = parsed.riskValue
        if (parsed.direction === "long" || parsed.direction === "short") this.direction = parsed.direction
        if (typeof parsed.entryPrice === "number") this.entryPrice = parsed.entryPrice
        if (typeof parsed.stopLoss === "number") this.stopLoss = parsed.stopLoss
        if (Array.isArray(parsed.tradeLog)) this.tradeLog = parsed.tradeLog
      }
      catch {
        this.parserMessage = "Saved session was invalid and was skipped."
      }
    },
    exportSessionData(): string {
      return JSON.stringify(this.buildPersistedState(), null, 2)
    },
    importSessionData(payload: unknown): boolean {
      const parsed = payload as Partial<PersistedState>
      if (typeof parsed.symbol === "string" && parsed.symbol.trim()) this.symbol = parsed.symbol
      if (typeof parsed.accountBalance === "number") this.accountBalance = parsed.accountBalance
      if (typeof parsed.leverage === "number") this.leverage = parsed.leverage
      if (parsed.riskMode === "fixed" || parsed.riskMode === "percent") this.riskMode = parsed.riskMode
      if (typeof parsed.riskValue === "number") this.riskValue = parsed.riskValue
      if (parsed.direction === "long" || parsed.direction === "short") this.direction = parsed.direction
      if (typeof parsed.entryPrice === "number") this.entryPrice = parsed.entryPrice
      if (typeof parsed.stopLoss === "number") this.stopLoss = parsed.stopLoss
      if (Array.isArray(parsed.targetRatios)) this.targetRatios = parsed.targetRatios
      if (Array.isArray(parsed.tradeLog)) this.tradeLog = parsed.tradeLog
      this.parserMessage = "Session imported successfully."
      return true
    },
  },
})
