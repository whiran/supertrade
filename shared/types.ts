// =============================================================================
// TradingView Replica — Canonical Data Contracts (shared/types.ts)
// Single source of truth for all server adapters, DB repos, WS messages, and panels
// =============================================================================

export type AssetClass = 'crypto' | 'forex' | 'equity';

export type FeedQuality =
  | 'LIVE_EXCHANGE'
  | 'LIVE_BROKER_DEMO'
  | 'LIVE_IEX_PARTIAL_VOL'
  | 'DELAYED_15M';

export type Timeframe = '1s' | '5s' | '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface CanonicalBar {
  time: number;      // UTC Unix timestamp in SECONDS (required by lightweight-charts v5)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;  // true on bar close; triggers confirmed alerts & strategies
}

export interface LiveQuote {
  symbol: string;    // Canonical format: "BINANCE:BTCUSDT", "OANDA:EUR_USD", "ALPACA:SPY"
  assetClass: AssetClass;
  feedQuality: FeedQuality;
  bid: number;
  ask: number;
  last: number;
  spreadBps: number; // ((ask - bid) / mid) * 10000
  timestampMs: number;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly assetClass: AssetClass;
  readonly feedQuality: FeedQuality;
  fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]>;
  subscribe(
    symbol: string,
    tf: Timeframe,
    onBar: (bar: CanonicalBar) => void,
    onQuote: (quote: LiveQuote) => void
  ): () => void;
}

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  feeBps: number;
  slippageBps: number;
  status: OrderStatus;
  filledPrice?: number;
  realizedPnl?: number;
  createdAtMs: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  feeBps: number;
  openedAtMs: number;
}

export interface AlertCondition {
  type: 'price_cross' | 'indicator_threshold' | 'spread_bps';
  indicator?: string; // e.g. 'RSI', 'EMA'
  period?: number;
  operator: 'gt' | 'lt' | 'cross_up' | 'cross_down';
  value: number;
  onBarCloseOnly: boolean;
}

export interface AlertRule {
  id: string;
  symbol: string;
  tf: Timeframe;
  conditions: AlertCondition[]; // up to 5 compound conditions
  webhookUrl?: string;
  cooldownSec: number;
  enabled: boolean;
}

export interface CalendarEvent {
  dateTimeMs: number;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  event: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface WalkForwardResult {
  windows: number;
  avgInSampleSharpe: number;
  avgOutOfSampleSharpe: number;
  stable: boolean;
}

export interface OverfittingResult {
  perturbedParams: number;
  avgSharpeDelta: number;
  robust: boolean;
}

export interface DeflatedSharpeResult {
  rawSharpe: number;
  deflatedSharpe: number;
  pValue: number;
  significant: boolean;
}

export interface CostStressResult {
  baseNetProfit: number;
  at2xCostNetProfit: number;
  at3xCostNetProfit: number;
  stillProfitableAt3x: boolean;
}

export interface MonteCarloResult {
  simulations: number;
  p5MaxDrawdown: number;
  probabilityOfProfit: number;
}

export interface QuantChecks {
  walkForward: WalkForwardResult;
  overfitting: OverfittingResult;
  deflatedSharpe: DeflatedSharpeResult;
  costStress: CostStressResult;
  monteCarlo: MonteCarloResult;
}

export interface TradeRecord {
  entryTime: number;
  exitTime: number;
  side: OrderSide;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  feeBps: number;
}

export interface BacktestConfig {
  symbol: string;
  tf: Timeframe;
  strategyName: string;
  params: Record<string, number>;
  startSec: number;
  endSec: number;
  initialCapital: number;
  feeBps: number;
  slippageBps: number;
  stopLossPct?: number;
  takeProfitPct?: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: TradeRecord[];
  equityCurve: Array<{ time: number; equity: number }>;
  netProfit: number;
  winRate: number;
  maxDrawdownPct: number;
  sharpe: number;
  quantChecks: QuantChecks;
}

export type WsClientMessage =
  | { type: 'subscribe'; symbol: string; tf: Timeframe }
  | { type: 'unsubscribe'; symbol: string; tf: Timeframe };

export type WsServerMessage =
  | { type: 'bar'; symbol: string; tf: Timeframe; bar: CanonicalBar }
  | { type: 'quote'; quote: LiveQuote }
  | { type: 'error'; message: string };
