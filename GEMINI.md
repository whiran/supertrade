# TradingView Replica — Workspace Invariants

## Stack
- Monorepo: npm workspaces (`shared/`, `server/`, `client/`)
- Charts: `lightweight-charts` (`^5.2.1`) — strictly v5 APIs (see `.agents/rules/lwc-v5.md`)
- Indicators: `trading-signals` (incremental `.add()` / `.replace()`)
- State: Zustand (`marketStore.ts`) — keep raw candle and tick arrays in React refs, NOT in Zustand state
- Server: Fastify + better-sqlite3 + WebSocket multiplexer (port 3001)
- Client: React + Vite (proxies `/api` and `/ws` to `localhost:3001`)

## Invariants & Guardrails
1. **Zero Secret Leakage:** Never place API keys in `client/`. All external market data APIs and webhooks run exclusively in `server/` via `.env`.
2. **Never Call Forbidden v4 LWC APIs:** Never use `addCandlestickSeries()`, `addLineSeries()`, `addAreaSeries()`, or `addHistogramSeries()`. Always import series classes from `lightweight-charts` and use `chart.addSeries(CandlestickSeries, ...)` and `pane.addSeries(LineSeries, ...)`.
3. **Shift Verification Left:** Run `npm run verify` (`tsc --noEmit` across all workspaces + `vitest run`) after every phase or file modification.
4. **SQLite Cache First:** Always serve finalized historical bars from SQLite before issuing upstream REST calls.
5. **Deterministic Feeds:** Binance and Bybit work with zero API keys. Gracefully skip keyed adapters if environment variables are not set.
