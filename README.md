# SuperTrade — Precision TradingView Replica

A local-first, precision TradingView replica with Lightweight Charts v5, multi-asset data feeds, streaming indicators, 86 drawing tools, paper trading ledger, and strategy backtester with 5 quantitative robustness checks.

---

## 🐳 Quick Start with Docker & Docker Compose

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/whiran/supertrade.git
cd supertrade
cp .env.example .env
```
*(Crypto via Binance and Bybit requires zero API keys. Set Alpaca/OANDA/Finnhub keys in `.env` if desired)*

### 2. Launch with Docker Compose
```bash
docker-compose up --build -d
```

- **Frontend Application:** [http://localhost](http://localhost) (or [http://localhost:5173](http://localhost:5173))
- **Gateway Healthcheck:** [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Persistent Data:** SQLite database is stored in the Docker volume `supertrade_sqlite_data` (or mounted `./data`).

To view logs:
```bash
docker-compose logs -f
```

To stop:
```bash
docker-compose down
```

---

## 🛠️ Local Development (Without Docker)

### Prerequisites
- Node.js 20+ or 22+ LTS

### 1. Install & Verify
```bash
npm install
npm run verify
```

### 2. Start Both Gateway & Frontend
```bash
npm run dev
```
- Client: `http://localhost:5173`
- Backend API & WS: `http://localhost:3001`

---

## 📊 Feature Highlights
- **Lightweight Charts v5:** Canvas rendering with zero React re-render crosshair updates.
- **Multi-Chart Grid:** Synced 1x1 up to 4x4 (16 charts) with synchronized crosshairs, symbols, and timeframes.
- **Zero-Key Crypto:** Binance spot & Bybit v5 public failover with 23h connection rollover.
- **Entry & Risk Panel:** Position sizing calculator powered by `trading-signals`.
- **$100,000 Paper Broker:** Simulated execution engine for Market, Limit, and Stop orders.
- **Strategy Tester:** Backtesting with 5 quant checks:
  1. Walk-Forward Stability (70/30 OOS)
  2. Overfitting Check (+/- 15% perturbation)
  3. Deflated Sharpe Ratio
  4. Cost Stress Test (2x and 3x fees)
  5. Monte Carlo Simulation (1,000 runs)
