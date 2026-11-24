# BUILD_TRADINGVIEW_REPLICA.md — Antigravity Master Execution Spec

Build a local-first, precision TradingView replica from scratch in the current workspace directory using a TypeScript monorepo (`shared/`, `server/`, `client/`).

---

## 0. AGENT OPERATING RULES & TOKEN DISCIPLINE

Follow these rules strictly on every turn:
1. **Verify Environment First:** Confirm `node -v` is Node.js 18+ (20/22 LTS recommended). Do not use `sudo` or install global packages.
2. **Bootstrap Guardrails Before App Code:** In Phase 0, create `GEMINI.md`, `.agents/rules/lwc-v5.md`, `.agents/rules/data-feeds.md`, `.agents/skills/verify-slice/SKILL.md`, and `BUILD_PROGRESS.md` before writing application code.
3. **Never Reinvent Primitives:**
   - Use `lightweight-charts` (`^5.2.1`) for charting.
   - Use `lightweight-charts-drawing` (pinned exact version) for all 86 drawing tools.
   - Use `trading-signals` for streaming technical indicators and position sizing.
   - Do NOT hand-code canvas drawing hit-testing or indicator math already provided by these libraries.
4. **Shift Verification Left:** After every phase, run `npm run verify` (`tsc --noEmit` across all workspaces + `vitest run`). Fix only failing files (max 3 retry loops per error). Do NOT launch a browser until Phase 7.
5. **Checkpoint Every Phase:** After `npm run verify` passes for a phase, mark that phase `[x]` in `BUILD_PROGRESS.md`, create a local git commit (`git commit -m "feat(phase-N): ..."`), and output a 3-line summary (files created/changed, tests passed, next phase).
6. **Zero Secret Leakage:** Never place API keys in `client/`. All external market data APIs and webhooks run exclusively in `server/` via `.env`.
7. **Deterministic Execution:** If running interactively, ask before installing missing runtimes or when `/plan` approval is requested; if running non-interactively, proceed using the exact defaults specified below.

---

## 1. TARGET MONOREPO ARCHITECTURE

```text
.
├── GEMINI.md
├── BUILD_PROGRESS.md
├── .env.example
├── package.json                        # npm workspaces: ["shared", "server", "client"]
├── tsconfig.base.json
├── .agents/
│   ├── rules/
│   │   ├── lwc-v5.md                   # trigger: glob (client/src/chart/**)
│   │   └── data-feeds.md               # trigger: model_decision
│   └── skills/
│       └── verify-slice/
│           └── SKILL.md                # /verify-slice skill
├── shared/
│   ├── package.json
│   ├── types.ts                        # Single source of truth for all contracts
│   └── types.test.ts
├── server/
│   ├── package.json
│   └── src/
│       ├── index.ts                    # Fastify REST API + WS multiplexer (port 3001)
│       ├── db/sqlite.ts                # better-sqlite3 schema & repositories
│       ├── adapters/
│       │   ├── binance.ts              # Primary Crypto (no key)
│       │   ├── bybit.ts                # Failover Crypto (no key)
│       │   ├── alpaca.ts               # Primary US Equities (free IEX WS + REST)
│       │   ├── oanda.ts                # Primary Forex (free Practice v20)
│       │   ├── finnhub.ts              # Free News / Profile2 / Search / Fallback WS
│       │   └── forexfactory.ts         # Weekly economic calendar parser
│       ├── engine/
│       │   ├── tickAggregator.ts       # Tick-to-CanonicalBar builder (UTC seconds)
│       │   ├── alertRunner.ts          # 5-condition compound alerts + webhooks
│       │   ├── paperBroker.ts          # $100,000 simulated ledger & order engine
│       │   └── backtester.ts           # Strategy engine + 5 quant robustness checks
│       └── routes/
│           └── screener.ts             # Multi-symbol scanner & heatmap metrics
└── client/
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── store/marketStore.ts        # Zustand store (keep tick arrays in refs)
        ├── lib/wsClient.ts             # Typed WS client with auto-reconnect
        ├── chart/
        │   ├── ChartCanvas.tsx         # Lightweight Charts v5 core canvas
        │   ├── IndicatorEngine.ts      # trading-signals incremental (.add/.replace)
        │   ├── DrawingController.ts    # lightweight-charts-drawing wrapper
        │   └── MultiChartGrid.tsx      # 1x1 up to 4x4 (16 charts) synced layouts
        ├── indicators/
        │   └── custom/                 # Auto-registered user custom indicators
        └── panels/
            ├── EntryRiskPanel.tsx      # Bid/Ask/Spread, ATR, Position Sizer, SL/TP lines
            ├── WatchlistPanel.tsx      # Persisted presets + live streaming quotes
            ├── ScreenerPanel.tsx       # Screener table + daily % Heatmap
            ├── ReplayToolbar.tsx       # Synced Bar Replay (Play/Pause/Step/Speed)
            ├── PaperTradingPanel.tsx   # Positions, Working Orders, Trade History
            ├── StrategyTesterPanel.tsx # Rule builder, Equity Curve, 5 Quant Checks
            └── CalendarNewsPanel.tsx   # Finnhub company news + Forex Factory calendar
```

---

## 2. CANONICAL DATA CONTRACTS (`shared/types.ts`)

Every server adapter, database repository, WebSocket message, and frontend panel MUST conform to these exact interfaces:

```ts
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
```

Also define typed interfaces in `shared/types.ts` for:
- `Order` & `Position` (id, symbol, side `'buy' | 'sell'`, type `'market' | 'limit' | 'stop'`, qty, price, stopLoss?, takeProfit?, feeBps, slippageBps, status, filledPrice?, realizedPnl?, createdAtMs)
- `AlertRule` (id, symbol, tf, conditions array up to 5 items supporting price cross, indicator threshold, spread bps threshold, and `onBarCloseOnly` boolean, webhookUrl, cooldownSec, enabled)
- `BacktestConfig` & `BacktestResult` (trades, equityCurve, netProfit, winRate, maxDrawdownPct, sharpe, and structured results for all 5 quant checks: `walkForward`, `overfitting`, `deflatedSharpe`, `costStress`, `monteCarlo`)

---

## 3. MANDATORY TECHNICAL GUARDRAILS

### A. Lightweight Charts v5 Guardrails (Write into `.agents/rules/lwc-v5.md`)
- Use YAML frontmatter: `trigger: glob`, `globs: "client/src/chart/**/*.ts, client/src/chart/**/*.tsx"`, and a concise `description`.
- **FORBIDDEN v4 APIs:** Never call `chart.addCandlestickSeries()`, `chart.addLineSeries()`, `chart.addAreaSeries()`, or `chart.addHistogramSeries()`.
- **REQUIRED v5 APIs:** Import `CandlestickSeries`, `LineSeries`, `HistogramSeries` from `lightweight-charts` and call `chart.addSeries(CandlestickSeries, options)` or `pane.addSeries(LineSeries, options)`.
- **Multi-pane oscillators:** Create panes via `const pane = chart.addPane(); pane.setStretchFactor(0.22);` and attach oscillator series to that pane.
- **Zero-flicker updates:** Call `series.setData(history)` ONCE per symbol/timeframe load; push live ticks exclusively via `series.update(bar)`.
- **Performance & UX:** Enable `CrosshairMode.MagnetOHLC`, set `autoSize: true`, keep `layout.attributionLogo: true` (Apache-2.0 NOTICE compliance), enable `enableConflation` when loaded history exceeds 15,000 bars, and never trigger React state re-renders inside `subscribeCrosshairMove` (update OHLCV legend text via DOM refs).
- **React Strict Mode safety:** Store chart and drawing instances in `useRef` inside `useEffect` and always call `drawings.destroy(); chart.remove();` on cleanup.
- **Drawing Tools:** Wrap one `DrawingManager(chart, candleSeries, { bars: () => barsRef.current, magnet: 'weak' })` from `lightweight-charts-drawing` (passing `bars` with volume so volume profiles and anchored VWAP calculate properly) and persist via `exportJSON()` / `importJSON()`.

### B. Market Data Provider Guardrails (Write into `.agents/rules/data-feeds.md`)
- Use YAML frontmatter: `trigger: model_decision` and a clear `description` covering Binance, Bybit, OANDA, Alpaca, and Finnhub.
- **SQLite Cache First:** Always serve finalized historical bars from SQLite before issuing upstream REST calls.
- **Binance Spot (Crypto Primary — No API Key):**
  - WS: `wss://stream.binance.com:9443/stream` (combined streams, lowercase symbols: `<sym>@aggTrade`, `<sym>@bookTicker`, `<sym>@kline_<tf>`).
  - Limits: Max 1,024 streams/connection, max 5 incoming control messages/sec, max 300 connection attempts/5 min/IP, REST weight cap 6,000/min (backoff on HTTP 429; never trigger HTTP 418 ban).
  - Resilience: Echo server Ping payload in Pong frames; proactively roll over connections at 23 hours (before 24h disconnect). Tag `LIVE_EXCHANGE`.
- **Bybit v5 Public (Crypto Failover — No API Key):**
  - WS: `wss://stream.bybit.com/v5/public/spot`. Auto-failover if Binance returns HTTP 451 or fails to connect. Tag `LIVE_EXCHANGE`.
- **Alpaca Basic (US Equities Primary — Free Account Keys):**
  - Env vars: `ALPACA_API_KEY`, `ALPACA_API_SECRET` (headers `APCA-API-KEY-ID`, `APCA-API-SECRET-KEY`).
  - Limits: Max 30 concurrent IEX WebSocket symbols, 200 REST calls/min (SIP REST history is 15-min delayed).
  - Accuracy Guard: Tag all free equity quotes `LIVE_IEX_PARTIAL_VOL`. Display an explicit UI warning on VWAP, RVOL, and Volume Profile because IEX represents only 2–4% of consolidated US volume. Allow switching to SIP via a single env flag (`ALPACA_FEED=sip`).
- **OANDA v20 Practice (Forex Primary — Free Demo Token):**
  - Env vars: `OANDA_API_KEY`, `OANDA_ACCOUNT_ID`.
  - REST: `https://api-fxpractice.oanda.com/v3/instruments/{instrument}/candles` (`Authorization: Bearer $OANDA_API_KEY`, `count<=5000`, granularities `S5`–`M`).
  - Stream: `https://stream-fxpractice.oanda.com/v3/accounts/$OANDA_ACCOUNT_ID/pricing/stream` (HTTP chunked JSON lines; parse and ignore `HEARTBEAT` objects). Limits: 120 req/s, max 2 new connections/s, 20 streams/user. Tag `LIVE_BROKER_DEMO`. - **Finnhub Free (News, Company Profile2, Symbol Search, Optional Fallback WS):** - Env var: `FINNHUB_API_KEY`. - **FORBIDDEN:** NEVER call `/stock/candle` (Premium-only on free tier). - **ALLOWED:** `/company-news`, `/stock/profile2`, `/search`, and fallback WS `wss://ws.finnhub.io?token=$FINNHUB_API_KEY` (max 50 symbols, 1 connection/key, 60 REST req/min, hard 30 req/sec cap).

---

## 4. PHASE-BY-PHASE BUILD EXECUTION PLAN

Execute each phase sequentially. Do not start Phase `N+1` until `npm run verify` passes for Phase `N` and `BUILD_PROGRESS.md` is updated.

### Phase 0: Workspace Bootstrap, Antigravity Config & Contracts
1. Verify `node -v` >= 18 and initialize git (`git init`) if not already a git repo.
2. Create the Antigravity workspace configuration files:
   - `GEMINI.md` (plain Markdown, NO frontmatter, under 2 KB: stack invariants, no API keys in client, no v4 LWC APIs, run `npm run verify` after edits).
   - `.agents/rules/lwc-v5.md` (exact `trigger: glob` rules from Section 3A).
   - `.agents/rules/data-feeds.md` (exact `trigger: model_decision` rules from Section 3B).
   - `.agents/skills/verify-slice/SKILL.md` (YAML frontmatter `name: verify-slice`, `description: Runs TypeScript typechecking and Vitest unit tests after implementing a slice.`, instructing execution of `npm run verify`, max 3 fix loops, no browser launch, 3-line summary).
   - `BUILD_PROGRESS.md` with an unchecked `- [ ]` checklist for Phases 0–7.
3. Scaffold npm workspaces (`shared/`, `server/`, `client/`), `tsconfig.base.json`, and root `package.json` scripts:
   - `"typecheck"`: runs `tsc --noEmit` across `shared`, `server`, `client`.
   - `"test"`: `vitest run`.
   - `"verify"`: `npm run typecheck && npm run test`.
   - `"dev"`: runs `server` (port 3001) and `client` (Vite, proxying `/api` and `/ws` to `localhost:3001`).
4. Install dependencies:
   - `client`: `react`, `react-dom`, `lightweight-charts@^5.2.1`, `lightweight-charts-drawing` (pin exact installed version without `^`), `trading-signals`, `zustand`, `tailwindcss`, `@vitejs/plugin-react`, `vite`.
   - `server`: `fastify`, `@fastify/cors`, `ws`, `better-sqlite3`, `dotenv`, `tsx` (plus `@types/ws`, `@types/better-sqlite3`).
   - Root devDeps: `typescript`, `vitest`, `concurrently`.
5. Implement `shared/types.ts`, `shared/types.test.ts` (smoke test), and `.env.example` (`ALPACA_API_KEY`, `ALPACA_API_SECRET`, `ALPACA_FEED=iex`, `OANDA_API_KEY`, `OANDA_ACCOUNT_ID`, `FINNHUB_API_KEY`, `DISCORD_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
6. Run `npm run verify`, mark Phase 0 done in `BUILD_PROGRESS.md`, and commit.

### Phase 1: Local Gateway, SQLite Cache & Multi-Asset Adapters
1. Create `server/src/db/sqlite.ts` storing data in `./data/terminal.db` with tables: `candles`, `watchlists`, `drawings`, `alerts`, `paper_orders`, `paper_positions`, `paper_account`. Seed default `$100,000` balance and preset watchlists (Crypto, US Stocks, Forex, Mixed).
2. Create `server/src/engine/tickAggregator.ts`: aggregates incoming live trades/quotes into active `CanonicalBar` buckets (UTC seconds), emits intra-bar updates (`isFinal: false`) and bucket rollovers (`isFinal: true`), and persists finalized bars to SQLite.
3. Implement adapters in `server/src/adapters/`:
   - `binance.ts` + `bybit.ts` automatic failover (Binance REST klines + combined WS `@aggTrade`, `@bookTicker`, `@kline_*`, Ping/Pong, 23h reconnect).
   - `alpaca.ts` (REST history + IEX WS enforcing 30-symbol cap, `LIVE_IEX_PARTIAL_VOL`).
   - `oanda.ts` (Practice v20 REST `S5`–`D` + HTTP chunked stream with `HEARTBEAT` handling, `LIVE_BROKER_DEMO`).
   - `finnhub.ts` (`/company-news`, `/stock/profile2`, `/search`, fallback WS; never `/stock/candle`).
   - Gracefully skip keyed adapters if their `.env` keys are unset while keeping zero-key crypto (Binance/Bybit) fully operational out of the box.
4. Build `server/src/index.ts` exposing:
   - `GET /api/history?symbol=&tf=&limit=&endSec=` (SQLite cache first, then adapter backfill).
   - `GET /api/search?q=` (canonical symbols across configured adapters).
   - `GET /api/health` (reports active/configured feeds and feed quality).
   - `WS /ws` multiplexer sharing upstream subscriptions across all connected chart panes.
5. Write Vitest unit tests with mocked payloads for `tickAggregator` rollover accuracy and every adapter's normalization. Run `npm run verify`, update `BUILD_PROGRESS.md`, and commit.

### Phase 2: Lightweight Charts v5 Canvas & Zero-Flicker Live UI
1. Create `client/src/store/marketStore.ts` (Zustand) managing active symbol (default `BINANCE:BTCUSDT`), timeframe (default `1m`), layout mode, connection status, latest `LiveQuote` map, and watchlist state. Store candle arrays in React refs outside Zustand.
2. Create `client/src/lib/wsClient.ts` connecting to `/ws` with exponential-backoff reconnect and reference-counted symbol/timeframe subscriptions.
3. Build `client/src/chart/ChartCanvas.tsx` strictly adhering to `.agents/rules/lwc-v5.md`:
   - Dark TradingView palette (`#131722` background, `#26a69a` / `#ef5350` candles).
   - `CandlestickSeries` + bottom-margined volume `HistogramSeries` on Pane 0.
   - Top-left OHLCV legend updated via DOM refs (zero React re-renders on crosshair move).
   - Color-coded **Feed Provenance Badge** (`LIVE_EXCHANGE`, `LIVE_BROKER_DEMO`, `LIVE_IEX_PARTIAL_VOL`, `DELAYED_15M`) with hover tooltip explaining volume/latency caveats.
4. Build top toolbar: global quick Symbol Search (typing any alphanumeric character opens search modal), Timeframe bar (`1s`, `5s`, `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`), Indicator button, Replay toggle, and Layout switcher.
5. Write unit tests for `marketStore` and symbol/timeframe helpers. Run `npm run verify`, update `BUILD_PROGRESS.md`, and commit.

### Phase 3: Incremental Streaming Indicators & Multi-Pane Manager
1. Build `client/src/chart/IndicatorEngine.ts` using `trading-signals`:
   - Calculate once on historical bars via `.add()` and update forming live bars in place via `.replace()`.
   - Overlays on Pane 0: EMA (9, 20, 50, 200), SMA, VWMA, Bollinger Bands, Parabolic SAR, SuperTrend, Anchored/Session VWAP (show warning badge on VWAP when `feedQuality === 'LIVE_IEX_PARTIAL_VOL'`).
   - Oscillators in dedicated v5 panes (`chart.addPane()`, `setStretchFactor(0.22)`): RSI (14), MACD (12, 26, 9), ATR (14), Stochastic, OBV, Vortex, TTM Squeeze.
   - Support unlimited stacked indicators, parameter editing, visibility toggle, and clean empty-pane removal.
2. Create `client/src/indicators/custom/` with a typed plugin interface and one sample custom indicator (e.g., `threeGreenCandles.ts`) auto-discovered into the Indicator Picker modal.
3. Write Vitest unit tests proving incremental `.add()` + 5 live `.replace()` updates match batch calculation identically. Run `npm run verify`, update `BUILD_PROGRESS.md`, and commit.

### Phase 4: 86 Drawing Tools, OHLC Magnet & Precision Entry Risk Panel
1. Create `client/src/chart/DrawingController.ts` wrapping `DrawingManager` from `lightweight-charts-drawing` with `bars: () => barsRef.current`, toggleable magnet (`off` | `weak` | `strong`), and host-managed Undo/Redo history.
2. Build a left vertical TradingView-style drawing toolbar exposing grouped tools (Trend Line, Ray, Horizontal Line, Parallel Channel, Fib Retracement, Fib Extension, Long/Short Position Box, Anchored VWAP, Fixed-Range Volume Profile, Brush, Text, Measure), Lock/Hide toggles, and hotkeys (`Alt+T`, `Alt+H`, `Alt+F`, `Esc`).
3. Add `GET /api/drawings/:symbol` and `PUT /api/drawings/:symbol` in `server/src/index.ts`; debounce-save `drawings.exportJSON()` to SQLite and restore via `importJSON()` on symbol change.
4. Build `client/src/panels/EntryRiskPanel.tsx` on the right rail:
   - Live Bid, Ask, Spread (bps), and live ATR(14) from `IndicatorEngine`.
   - Interactive Risk & Position Sizer powered by `getPositionSize` from `trading-signals` (Account Balance, Risk %, Entry, Stop Loss, Take Profit, R:R ratio) with one-click plotting of interactive Entry / SL / TP price lines on the chart.
5. Run `npm run verify`, update `BUILD_PROGRESS.md`, and commit.

### Phase 5: Multi-Chart Sync (Up to 16 Charts), Watchlist & Screener
1. Build `client/src/chart/MultiChartGrid.tsx` supporting `1x1`, `1x2`, `2x1`, `2x2`, `3x2`, `3x3`, and `4x4` (up to 16 charts) with toggles for synchronized Symbol, Timeframe, and Crosshair (`setCrosshairPosition`).
2. Build `client/src/panels/WatchlistPanel.tsx` backed by `GET/PUT /api/watchlists` with preset tabs (Crypto, Forex, US Stocks, Mixed) and live Bid/Ask + 24h % change.
3. Build `server/src/routes/screener.ts` and `client/src/panels/ScreenerPanel.tsx` computing live % change, RSI(14), SuperTrend bias, and spread (bps) across tracked symbols, plus a color-coded Heatmap view.
4. Run `npm run verify`, update `BUILD_PROGRESS.md`, and commit.

### Phase 6: Bar Replay, $100k Paper Broker & Strategy Tester (5 Quant Checks)
1. **Bar Replay (`client/src/panels/ReplayToolbar.tsx`):** Select any historical bar to slice chart history and step forward (`Play`, `Pause`, `Step +1`, speeds `1x/2x/5x/10x`) across all synced charts simultaneously with strict no-lookahead enforcement.
2. **Paper Broker (`server/src/engine/paperBroker.ts` + `client/src/panels/PaperTradingPanel.tsx`):** SQLite-backed `$100,000` simulated account supporting Market, Limit, and Stop orders, configurable fees (bps) and slippage (bps), unrealized/realized P&L, and execution in both Live and Replay modes.
3. **Strategy Tester (`server/src/engine/backtester.ts` + `client/src/panels/StrategyTesterPanel.tsx`):** Evaluates declarative strategies (EMA Crossover, RSI Reversion, SuperTrend Flip) with SL/TP on SQLite bars, plots trade markers via the Lightweight Charts v5 series markers plugin and equity curve, and computes all 5 quant checks:
   - **Walk-Forward:** Rolling 70/30 in-sample/out-of-sample stability check.
   - **Overfitting:** Parameter perturbation (+/- 15% indicator period sensitivity).
   - **Deflated Sharpe Ratio:** Adjusted for trial count, skewness, and kurtosis.
   - **Cost Stress Test:** Re-evaluation at 2x and 3x fee/slippage assumptions.
   - **Monte Carlo Simulation:** 1,000 trade-order reshuffles reporting 5th-percentile max drawdown and probability of profit.
4. Write deterministic Vitest unit tests verifying order fills, zero-lookahead replay, and all 5 quant checks. Run `npm run verify`, update `BUILD_PROGRESS.md`, and commit.

### Phase 7: Local Webhook Alerts, News/Calendar & Final Smoke Test
1. Build `server/src/engine/alertRunner.ts` + `GET/POST/DELETE /api/alerts`: evaluates up to 5 compound conditions per alert on live ticks/bars with cooldown protection and dispatches formatted payloads to Discord, Telegram, or custom webhook URLs.
2. Build `server/src/adapters/forexfactory.ts` and `client/src/panels/CalendarNewsPanel.tsx`: renders Finnhub company news (`/api/news/:symbol`) and weekly Forex Factory high-impact events converted to the browser's local timezone.
3. Run `npm run verify` and confirm 100% green typechecks and unit tests.
4. Start the local dev server (`npm run dev`) and perform ONE end-to-end browser smoke test verifying:
   - `BINANCE:BTCUSDT` live ticks render smoothly with a `LIVE_EXCHANGE` badge (or Bybit failover if geo-restricted).
   - Adding an RSI(14) pane creates a second synced pane without console errors.
   - Drawing a Fibonacci retracement persists across page reload.
   - Switching to a `2x2` layout syncs crosshairs cleanly.
   - Placing one paper market order updates the `$100,000` paper broker tab.
5. Fix any console or runtime errors, re-run `npm run verify`, mark Phase 7 done in `BUILD_PROGRESS.md`, commit, and print the local URL plus `.env` key setup instructions for Alpaca, OANDA Practice, and Finnhub.