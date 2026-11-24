---
trigger: model_decision
description: >-
  Market data provider guardrails for Binance, Bybit, OANDA, Alpaca, and Finnhub.
  Enforces SQLite cache-first retrieval, rate limits, connection lifecycles, and feed quality tags.
---

# Market Data Provider Guardrails

## SQLite Cache First
Always serve finalized historical bars from SQLite before issuing upstream REST calls.

## Binance Spot (Crypto Primary — No API Key)
- WS: `wss://stream.binance.com:9443/stream` (combined streams, lowercase: `<sym>@aggTrade`, `<sym>@bookTicker`, `<sym>@kline_<tf>`).
- Limits: Max 1,024 streams/connection, max 5 incoming control messages/sec, max 300 connection attempts/5 min/IP, REST weight cap 6,000/min.
- Resilience: Echo server Ping payload in Pong frames; proactively roll over connections at 23 hours. Tag: `LIVE_EXCHANGE`.

## Bybit v5 Public (Crypto Failover — No API Key)
- WS: `wss://stream.bybit.com/v5/public/spot`.
- Auto-failover if Binance returns HTTP 451 or fails to connect. Tag: `LIVE_EXCHANGE`.

## Alpaca Basic (US Equities Primary — Free Account Keys)
- Env vars: `ALPACA_API_KEY`, `ALPACA_API_SECRET` (headers `APCA-API-KEY-ID`, `APCA-API-SECRET-KEY`).
- Limits: Max 30 concurrent IEX WebSocket symbols, 200 REST calls/min (SIP REST history is 15-min delayed).
- Accuracy Guard: Tag all free equity quotes `LIVE_IEX_PARTIAL_VOL`. Display an explicit UI warning on VWAP, RVOL, and Volume Profile because IEX represents only 2–4% of consolidated US volume. Allow switching to SIP via `ALPACA_FEED=sip`.

## OANDA v20 Practice (Forex Primary — Free Demo Token)
- Env vars: `OANDA_API_KEY`, `OANDA_ACCOUNT_ID`.
- REST: `https://api-fxpractice.oanda.com/v3/instruments/{instrument}/candles` (`Authorization: Bearer $OANDA_API_KEY`, `count<=5000`, granularities `S5`–`M`).
- Stream: `https://stream-fxpractice.oanda.com/v3/accounts/$OANDA_ACCOUNT_ID/pricing/stream` (HTTP chunked JSON lines; parse and ignore `HEARTBEAT` objects). Tag: `LIVE_BROKER_DEMO`.

## Finnhub Free (News, Company Profile2, Symbol Search, Fallback WS)
- Env var: `FINNHUB_API_KEY`.
- **FORBIDDEN:** NEVER call `/stock/candle` (Premium-only on free tier).
- **ALLOWED:** `/company-news`, `/stock/profile2`, `/search`, and fallback WS `wss://ws.finnhub.io?token=$FINNHUB_API_KEY` (max 50 symbols, 1 connection/key, 60 REST req/min, hard 30 req/sec cap).

## Graceful Degradation
Skip keyed adapters if their environment keys are unset, keeping zero-key crypto (Binance/Bybit) fully functional out of the box.
