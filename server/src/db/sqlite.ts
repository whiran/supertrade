import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import type { CanonicalBar, Order, Position, AlertRule } from '@tv/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'terminal.db');

mkdirSync(DB_DIR, { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

// WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Schema definitions
db.exec(`
  CREATE TABLE IF NOT EXISTS candles (
    symbol TEXT NOT NULL,
    tf TEXT NOT NULL,
    time INTEGER NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL,
    is_final INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (symbol, tf, time)
  );

  CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbols TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drawings (
    symbol TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS paper_orders (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS paper_positions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS paper_account (
    id TEXT PRIMARY KEY,
    balance REAL NOT NULL,
    equity REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Seed default paper account ($100,000)
const existingAccount = db.prepare('SELECT id FROM paper_account WHERE id = ?').get('default');
if (!existingAccount) {
  db.prepare('INSERT INTO paper_account (id, balance, equity, created_at) VALUES (?, ?, ?, ?)').run(
    'default',
    100000,
    100000,
    Date.now()
  );
}

// Seed preset watchlists
const insertWatchlist = db.prepare('INSERT OR IGNORE INTO watchlists (id, name, symbols) VALUES (?, ?, ?)');
insertWatchlist.run(
  'crypto',
  'Crypto',
  JSON.stringify(['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT', 'BINANCE:BNBUSDT'])
);
insertWatchlist.run(
  'stocks',
  'US Stocks',
  JSON.stringify(['ALPACA:SPY', 'ALPACA:AAPL', 'ALPACA:TSLA', 'ALPACA:NVDA', 'ALPACA:MSFT'])
);
insertWatchlist.run(
  'forex',
  'Forex',
  JSON.stringify(['OANDA:EUR_USD', 'OANDA:GBP_USD', 'OANDA:USD_JPY', 'OANDA:AUD_USD'])
);
insertWatchlist.run(
  'commodities',
  'Commodities & Metals',
  JSON.stringify([
    'COMMODITY:USOIL',
    'COMMODITY:XAUUSD',
    'COMMODITY:XAGUSD',
    'COMMODITY:XPTUSD',
    'COMMODITY:XPDUSD',
  ])
);
insertWatchlist.run(
  'indices',
  'Major Indices',
  JSON.stringify(['INDEX:SPX', 'INDEX:DJI', 'INDEX:IXIC', 'INDEX:NDX'])
);
insertWatchlist.run(
  'mixed',
  'Mixed',
  JSON.stringify(['BINANCE:BTCUSDT', 'ALPACA:SPY', 'COMMODITY:XAUUSD', 'INDEX:SPX', 'OANDA:EUR_USD'])
);

// ========================
// Repositories
// ========================

// Candles
export function insertCandle(bar: CanonicalBar, symbol: string, tf: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO candles (symbol, tf, time, open, high, low, close, volume, is_final)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(symbol, tf, bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume, bar.isFinal ? 1 : 0);
}

export function insertCandleBatch(bars: CanonicalBar[], symbol: string, tf: string): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO candles (symbol, tf, time, open, high, low, close, volume, is_final)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items: CanonicalBar[]) => {
    for (const bar of items) {
      insert.run(symbol, tf, bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume, bar.isFinal ? 1 : 0);
    }
  });
  tx(bars);
}

export function getCandleRange(symbol: string, tf: string, limit: number, endSec?: number): CanonicalBar[] {
  let rows: any[];
  if (endSec) {
    rows = db.prepare(`
      SELECT * FROM candles WHERE symbol = ? AND tf = ? AND time <= ?
      ORDER BY time DESC LIMIT ?
    `).all(symbol, tf, endSec, limit) as any[];
  } else {
    rows = db.prepare(`
      SELECT * FROM candles WHERE symbol = ? AND tf = ?
      ORDER BY time DESC LIMIT ?
    `).all(symbol, tf, limit) as any[];
  }
  return rows.reverse().map((r) => ({
    time: r.time,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    isFinal: r.is_final === 1,
  }));
}

// Watchlists
export function getWatchlists(): Array<{ id: string; name: string; symbols: string[] }> {
  const rows = db.prepare('SELECT * FROM watchlists').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    symbols: JSON.parse(r.symbols),
  }));
}

export function upsertWatchlist(id: string, name: string, symbols: string[]): void {
  db.prepare('INSERT OR REPLACE INTO watchlists (id, name, symbols) VALUES (?, ?, ?)').run(
    id,
    name,
    JSON.stringify(symbols)
  );
}

// Drawings
export function getDrawings(symbol: string): string {
  const row = db.prepare('SELECT data FROM drawings WHERE symbol = ?').get(symbol) as any;
  return row ? row.data : '{}';
}

export function saveDrawings(symbol: string, data: string): void {
  db.prepare('INSERT OR REPLACE INTO drawings (symbol, data) VALUES (?, ?)').run(symbol, data);
}

// Alerts
export function getAlerts(): AlertRule[] {
  const rows = db.prepare('SELECT data FROM alerts').all() as any[];
  return rows.map((r) => JSON.parse(r.data));
}

export function saveAlert(alert: AlertRule): void {
  db.prepare('INSERT OR REPLACE INTO alerts (id, data) VALUES (?, ?)').run(alert.id, JSON.stringify(alert));
}

export function deleteAlert(id: string): void {
  db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
}

// Paper Account
export function getPaperAccount(): { balance: number; equity: number } {
  const row = db.prepare('SELECT balance, equity FROM paper_account WHERE id = ?').get('default') as any;
  return row ?? { balance: 100000, equity: 100000 };
}

export function updatePaperAccount(balance: number, equity: number): void {
  db.prepare('UPDATE paper_account SET balance = ?, equity = ? WHERE id = ?').run(balance, equity, 'default');
}

// Paper Orders
export function getPaperOrders(): Order[] {
  const rows = db.prepare('SELECT data FROM paper_orders').all() as any[];
  return rows.map((r) => JSON.parse(r.data));
}

export function savePaperOrder(order: Order): void {
  db.prepare('INSERT OR REPLACE INTO paper_orders (id, data) VALUES (?, ?)').run(order.id, JSON.stringify(order));
}

export function deletePaperOrder(id: string): void {
  db.prepare('DELETE FROM paper_orders WHERE id = ?').run(id);
}

// Paper Positions
export function getPaperPositions(): Position[] {
  const rows = db.prepare('SELECT data FROM paper_positions').all() as any[];
  return rows.map((r) => JSON.parse(r.data));
}

export function savePaperPosition(pos: Position): void {
  db.prepare('INSERT OR REPLACE INTO paper_positions (id, data) VALUES (?, ?)').run(pos.id, JSON.stringify(pos));
}

export function deletePaperPosition(id: string): void {
  db.prepare('DELETE FROM paper_positions WHERE id = ?').run(id);
}

export { db };
