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
import { searchSymbols, getCompanyNews } from './adapters/finnhub.js';
import { getForexCalendar } from './adapters/forexfactory.js';

import { alertRunner } from './engine/alertRunner.js';
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

const adapters = [binance, bybit, alpaca, oanda];

// Initialize alert runner with DB rules
alertRunner.loadAlerts(getAlerts());

function getAdapterForSymbol(symbol: string) {
  if (symbol.startsWith('BINANCE:')) return binance;
  if (symbol.startsWith('BYBIT:')) return bybit;
  if (symbol.startsWith('ALPACA:')) return alpaca;
  if (symbol.startsWith('OANDA:')) return oanda;
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
  const { symbol, tf, limit = '500', endSec } = req.query as any;
  if (!symbol || !tf) return { error: 'symbol and tf required' };

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
  // Default crypto search items
  const cryptoDefaults = [
    { symbol: 'BINANCE:BTCUSDT', description: 'Bitcoin / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:ETHUSDT', description: 'Ethereum / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:SOLUSDT', description: 'Solana / Tether US', type: 'crypto' },
    { symbol: 'BINANCE:BNBUSDT', description: 'BNB / Tether US', type: 'crypto' },
    { symbol: 'OANDA:EUR_USD', description: 'Euro / US Dollar', type: 'forex' },
    { symbol: 'ALPACA:SPY', description: 'SPDR S&P 500 ETF Trust', type: 'equity' },
  ].filter((item) => item.symbol.toLowerCase().includes(q.toLowerCase()));

  return { results: [...cryptoDefaults, ...finnhubResults] };
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
