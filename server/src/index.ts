import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import type { Timeframe, WsClientMessage, WsServerMessage, CanonicalBar, LiveQuote } from '@tv/shared';

import {
  getCandleRange,
  getWatchlists,
  upsertWatchlist,
  getDrawings,
  saveDrawings,
  getAlerts,
  saveAlert,
  deleteAlert,
  getPaperAccount,
  getPaperOrders,
  getPaperPositions,
} from './db/sqlite.js';

import { BinanceAdapter } from './adapters/binance.js';
import { BybitAdapter } from './adapters/bybit.js';
import { AlpacaAdapter } from './adapters/alpaca.js';
import { OandaAdapter } from './adapters/oanda.js';
import { CommoditiesAdapter } from './adapters/commodities.js';
import { IndicesAdapter } from './adapters/indices.js';
import { searchSymbols, getCompanyNews } from './adapters/finnhub.js';
import { getForexCalendar } from './adapters/forexfactory.js';

import { alertRunner } from './engine/alertRunner.js';
import { TF_SECONDS } from './engine/tickAggregator.js';
import { paperBroker } from './engine/paperBroker.js';
import { backtester } from './engine/backtester.js';
import { screenerRoutes } from './routes/screener.js';

const app = Fastify({ logger: false });

await app.register(cors, { origin: true });
await app.register(websocket);

// Adapters
const binance = new BinanceAdapter();
const bybit = new BybitAdapter();
const alpaca = new AlpacaAdapter();
const oanda = new OandaAdapter();
const commodities = new CommoditiesAdapter();
const indices = new IndicesAdapter();

const adapters = [binance, bybit, alpaca, oanda, commodities, indices];

// Initialize alert runner with DB rules
alertRunner.loadAlerts(getAlerts());

// Canonical symbol normalization for arbitrary typed symbols
export function normalizeCanonicalSymbol(raw: string): string {
  if (!raw) return 'BINANCE:BTCUSDT';
  const s = raw.trim().toUpperCase();
  if (s.includes(':')) return s;

  // Commodities & Precious metals
  if (/^(XAU|XAG|XPT|XPD|OIL|USOIL|BCO|CRUDE)/.test(s)) {
    return `COMMODITY:${s.replace(/[/_]/g, '')}`;
  }
  // Major Indices
  if (/^(SPX|DJI|IXIC|NDX|RUT|SP500|US30|NAS100)/.test(s)) {
    return `INDEX:${s.replace(/[/_]/g, '')}`;
  }
  // Forex: contains / or _ or 6-letter currency codes
  const clean = s.replace(/[/_]/g, '');
  if (
    s.includes('/') ||
    s.includes('_') ||
    (clean.length === 6 &&
      /^(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|TRY|INR|ZAR|MXN|SEK|NOK|SGD|HKD|CNY|CNH|PLN)/.test(clean))
  ) {
    const base = clean.slice(0, 3);
    const quote = clean.slice(3, 6);
    return `OANDA:${base}_${quote}`;
  }
  // Crypto: standard quote currency suffixes
  if (/(USDT|USDC|BUSD|BTC|ETH|SOL|BNB)$/.test(clean)) {
    return `BINANCE:${clean}`;
  }
  // US Equities: 1-5 letters ticker
  if (/^[A-Z]{1,5}$/.test(clean)) {
    return `ALPACA:${clean}`;
  }
  return `BINANCE:${clean}`;
}

function getAdapterForSymbol(rawSymbol: string) {
  const symbol = normalizeCanonicalSymbol(rawSymbol);
  if (symbol.startsWith('BINANCE:')) return binance;
  if (symbol.startsWith('BYBIT:')) return bybit;
  if (symbol.startsWith('ALPACA:')) return alpaca;
  if (symbol.startsWith('OANDA:')) return oanda;
  if (symbol.startsWith('COMMODITY:')) return commodities;
  if (symbol.startsWith('INDEX:')) return indices;
  return binance;
}

// WS multiplexer
const clients = new Map<WebSocket, Set<string>>(); // ws -> Set<"symbol:tf">
const activeSubscriptions = new Map<string, { count: number; unsubscribe: () => void }>();

function broadcast(key: string, msg: WsServerMessage) {
  const data = JSON.stringify(msg);
  for (const [ws, keys] of clients.entries()) {
    if (keys.has(key) && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

app.get('/ws', { websocket: true }, (connection) => {
  const socket = connection.socket;
  const subscribedKeys = new Set<string>();
  clients.set(socket, subscribedKeys);

  socket.on('message', (raw) => {
    try {
      const msg: WsClientMessage = JSON.parse(raw.toString());
      const key = `${msg.symbol}:${msg.tf}`;

      if (msg.type === 'subscribe') {
        subscribedKeys.add(key);
        let sub = activeSubscriptions.get(key);
        if (!sub) {
          const adapter = getAdapterForSymbol(msg.symbol);
          const unsubscribe = adapter.subscribe(
            msg.symbol,
            msg.tf,
            (bar: CanonicalBar) => {
              // Feed to alert runner & paper broker
              alertRunner.evaluateBar(bar, msg.symbol, msg.tf);
              paperBroker.onBarUpdate(bar, msg.symbol);
              broadcast(key, { type: 'bar', symbol: msg.symbol, tf: msg.tf, bar });
            },
            (quote: LiveQuote) => {
              alertRunner.evaluateQuote(quote);
              broadcast(key, { type: 'quote', quote });
            }
          );
          sub = { count: 1, unsubscribe };
          activeSubscriptions.set(key, sub);
        } else {
          sub.count++;
        }
      } else if (msg.type === 'unsubscribe') {
        subscribedKeys.delete(key);
        const sub = activeSubscriptions.get(key);
        if (sub) {
          sub.count--;
          if (sub.count <= 0) {
            sub.unsubscribe();
            activeSubscriptions.delete(key);
          }
        }
      }
    } catch {
      // ignore
    }
  });

  socket.on('close', () => {
    for (const key of subscribedKeys) {
      const sub = activeSubscriptions.get(key);
      if (sub) {
        sub.count--;
        if (sub.count <= 0) {
          sub.unsubscribe();
          activeSubscriptions.delete(key);
        }
      }
    }
    clients.delete(socket);
  });
});

// REST routes
app.get('/api/health', async () => ({
  status: 'ok',
  feeds: adapters.map((a) => ({
    id: a.id,
    assetClass: a.assetClass,
    feedQuality: a.feedQuality,
    active: true,
  })),
}));

app.get('/api/history', async (req) => {
  const { symbol: rawSymbol, tf, limit = '500', endSec } = req.query as any;
  if (!rawSymbol || !tf) return { error: 'symbol and tf required' };

  const symbol = normalizeCanonicalSymbol(rawSymbol);
  const adapter = getAdapterForSymbol(symbol);
  const bars = await adapter.fetchHistory(
    symbol,
    tf as Timeframe,
    parseInt(limit, 10),
    endSec ? parseInt(endSec, 10) : undefined
  );

  return { bars };
});

app.get('/api/search', async (req) => {
  const { q = '' } = req.query as any;
  if (!q) return { results: [] };
  const finnhubResults = await searchSymbols(q);
  // Default multi-asset search items (Crypto, US Equities, Forex, Commodities, Indices)
  const defaultSymbols = [
    // Crypto
    { symbol: 'BINANCE:BTCUSDT', description: 'Bitcoin / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:ETHUSDT', description: 'Ethereum / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:SOLUSDT', description: 'Solana / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:XRPUSDT', description: 'Ripple / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:BNBUSDT', description: 'BNB / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:DOGEUSDT', description: 'Dogecoin / Tether US', type: 'crypto' },
    // Equities
    { symbol: 'ALPACA:SPY', description: 'SPDR S&P 500 ETF Trust', type: 'equity' },
    { symbol: 'ALPACA:AAPL', description: 'Apple Inc.', type: 'equity' },
    { symbol: 'ALPACA:TSLA', description: 'Tesla Inc.', type: 'equity' },
    { symbol: 'ALPACA:NVDA', description: 'NVIDIA Corporation', type: 'equity' },
    { symbol: 'ALPACA:MSFT', description: 'Microsoft Corporation', type: 'equity' },
    { symbol: 'ALPACA:AMZN', description: 'Amazon.com Inc.', type: 'equity' },
    { symbol: 'ALPACA:GOOGL', description: 'Alphabet Inc.', type: 'equity' },
    { symbol: 'ALPACA:META', description: 'Meta Platforms Inc.', type: 'equity' },
    // Forex
    { symbol: 'OANDA:EUR_USD', description: 'Euro / US Dollar', type: 'forex' },
    { symbol: 'OANDA:GBP_USD', description: 'British Pound / US Dollar', type: 'forex' },
    { symbol: 'OANDA:USD_JPY', description: 'US Dollar / Japanese Yen', type: 'forex' },
    { symbol: 'OANDA:AUD_USD', description: 'Australian Dollar / US Dollar', type: 'forex' },
    { symbol: 'OANDA:USD_CAD', description: 'US Dollar / Canadian Dollar', type: 'forex' },
    { symbol: 'OANDA:USD_CHF', description: 'US Dollar / Swiss Franc', type: 'forex' },
    { symbol: 'OANDA:NZD_USD', description: 'New Zealand Dollar / US Dollar', type: 'forex' },
    // Commodities & Precious Metals
    { symbol: 'COMMODITY:USOIL', description: 'Crude Oil (WTI / US Oil)', type: 'commodity' },
    { symbol: 'COMMODITY:BCOUSD', description: 'Brent Crude Oil', type: 'commodity' },
    { symbol: 'COMMODITY:XAUUSD', description: 'Gold Spot (XAU / USD)', type: 'commodity' },
    { symbol: 'COMMODITY:XAGUSD', description: 'Silver Spot (XAG / USD)', type: 'commodity' },
    { symbol: 'COMMODITY:XPTUSD', description: 'Platinum Spot (XPT / USD)', type: 'commodity' },
    { symbol: 'COMMODITY:XPDUSD', description: 'Palladium Spot (XPD / USD)', type: 'commodity' },
    // Major Indices
    { symbol: 'INDEX:SPX', description: 'S&P 500 Index (SPX)', type: 'index' },
    { symbol: 'INDEX:DJI', description: 'Dow Jones Industrial Average (DJIA)', type: 'index' },
    { symbol: 'INDEX:IXIC', description: 'Nasdaq Composite Index', type: 'index' },
    { symbol: 'INDEX:NDX', description: 'Nasdaq 100 Index', type: 'index' },
    { symbol: 'INDEX:RUT', description: 'Russell 2000 Index', type: 'index' },
  ].filter((item) =>
    item.symbol.toLowerCase().includes(q.toLowerCase()) ||
    item.description.toLowerCase().includes(q.toLowerCase())
  );

  return { results: [...defaultSymbols, ...finnhubResults] };
});

app.get('/api/watchlists', async () => ({ watchlists: getWatchlists() }));

app.put('/api/watchlists/:id', async (req) => {
  const { id } = req.params as any;
  const { name, symbols } = req.body as any;
  upsertWatchlist(id, name, symbols);
  return { ok: true };
});

app.get('/api/drawings/:symbol', async (req) => {
  const { symbol } = req.params as any;
  return { data: getDrawings(decodeURIComponent(symbol)) };
});

app.put('/api/drawings/:symbol', async (req) => {
  const { symbol } = req.params as any;
  const { data } = req.body as any;
  saveDrawings(decodeURIComponent(symbol), data);
  return { ok: true };
});

app.get('/api/news/:symbol', async (req) => {
  const { symbol } = req.params as any;
  const clean = symbol.replace('ALPACA:', '').replace('BINANCE:', '').replace('OANDA:', '');
  const news = await getCompanyNews(clean);
  return { news };
});

app.get('/api/calendar', async () => ({ events: await getForexCalendar() }));

app.get('/api/alerts', async () => ({
  alerts: getAlerts(),
  history: alertRunner.getTriggerHistory(),
}));

app.post('/api/alerts', async (req) => {
  const alert = req.body as any;
  if (!alert.id) alert.id = `alert_${Date.now()}`;
  saveAlert(alert);
  alertRunner.loadAlerts(getAlerts());
  return { ok: true, id: alert.id };
});

app.delete('/api/alerts/:id', async (req) => {
  const { id } = req.params as any;
  deleteAlert(id);
  alertRunner.loadAlerts(getAlerts());
  return { ok: true };
});

// Paper trading API
app.get('/api/paper/account', async () => getPaperAccount());
app.get('/api/paper/orders', async () => ({ orders: getPaperOrders() }));
app.get('/api/paper/positions', async () => ({ positions: getPaperPositions() }));
app.post('/api/paper/orders', async (req) => {
  const order = paperBroker.placeOrder(req.body as any);
  return { order };
});
app.delete('/api/paper/orders/:id', async (req) => {
  const { id } = req.params as any;
  const cancelled = paperBroker.cancelOrder(id);
  return { ok: cancelled };
});

// Backtesting API
app.post('/api/backtest', async (req) => {
  const config = req.body as any;
  return backtester.run(config);
});

// Screener routes
await app.register(screenerRoutes);

const PORT = 3001;
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 TradingView Gateway running on http://localhost:${PORT}`);
});
