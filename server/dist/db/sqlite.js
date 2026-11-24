import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'terminal.db');
mkdirSync(DB_DIR, { recursive: true });
const db = new Database(DB_PATH);
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
    db.prepare('INSERT INTO paper_account (id, balance, equity, created_at) VALUES (?, ?, ?, ?)').run('default', 100000, 100000, Date.now());
}
// Seed preset watchlists
const count = db.prepare('SELECT COUNT(*) as cnt FROM watchlists').get();
if (count.cnt === 0) {
    const insert = db.prepare('INSERT OR REPLACE INTO watchlists (id, name, symbols) VALUES (?, ?, ?)');
    insert.run('crypto', 'Crypto', JSON.stringify(['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT', 'BINANCE:BNBUSDT']));
    insert.run('stocks', 'US Stocks', JSON.stringify(['ALPACA:SPY', 'ALPACA:AAPL', 'ALPACA:TSLA', 'ALPACA:NVDA', 'ALPACA:MSFT']));
    insert.run('forex', 'Forex', JSON.stringify(['OANDA:EUR_USD', 'OANDA:GBP_USD', 'OANDA:USD_JPY', 'OANDA:AUD_USD']));
    insert.run('mixed', 'Mixed', JSON.stringify(['BINANCE:BTCUSDT', 'ALPACA:SPY', 'OANDA:EUR_USD', 'BINANCE:ETHUSDT']));
}
// ========================
// Repositories
// ========================
// Candles
export function insertCandle(bar, symbol, tf) {
    db.prepare(`
    INSERT OR REPLACE INTO candles (symbol, tf, time, open, high, low, close, volume, is_final)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(symbol, tf, bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume, bar.isFinal ? 1 : 0);
}
export function insertCandleBatch(bars, symbol, tf) {
    const insert = db.prepare(`
    INSERT OR REPLACE INTO candles (symbol, tf, time, open, high, low, close, volume, is_final)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const tx = db.transaction((items) => {
        for (const bar of items) {
            insert.run(symbol, tf, bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume, bar.isFinal ? 1 : 0);
        }
    });
    tx(bars);
}
export function getCandleRange(symbol, tf, limit, endSec) {
    let rows;
    if (endSec) {
        rows = db.prepare(`
      SELECT * FROM candles WHERE symbol = ? AND tf = ? AND time <= ?
      ORDER BY time DESC LIMIT ?
    `).all(symbol, tf, endSec, limit);
    }
    else {
        rows = db.prepare(`
      SELECT * FROM candles WHERE symbol = ? AND tf = ?
      ORDER BY time DESC LIMIT ?
    `).all(symbol, tf, limit);
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
export function getWatchlists() {
    const rows = db.prepare('SELECT * FROM watchlists').all();
    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        symbols: JSON.parse(r.symbols),
    }));
}
export function upsertWatchlist(id, name, symbols) {
    db.prepare('INSERT OR REPLACE INTO watchlists (id, name, symbols) VALUES (?, ?, ?)').run(id, name, JSON.stringify(symbols));
}
// Drawings
export function getDrawings(symbol) {
    const row = db.prepare('SELECT data FROM drawings WHERE symbol = ?').get(symbol);
    return row ? row.data : '{}';
}
export function saveDrawings(symbol, data) {
    db.prepare('INSERT OR REPLACE INTO drawings (symbol, data) VALUES (?, ?)').run(symbol, data);
}
// Alerts
export function getAlerts() {
    const rows = db.prepare('SELECT data FROM alerts').all();
    return rows.map((r) => JSON.parse(r.data));
}
export function saveAlert(alert) {
    db.prepare('INSERT OR REPLACE INTO alerts (id, data) VALUES (?, ?)').run(alert.id, JSON.stringify(alert));
}
export function deleteAlert(id) {
    db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
}
// Paper Account
export function getPaperAccount() {
    const row = db.prepare('SELECT balance, equity FROM paper_account WHERE id = ?').get('default');
    return row ?? { balance: 100000, equity: 100000 };
}
export function updatePaperAccount(balance, equity) {
    db.prepare('UPDATE paper_account SET balance = ?, equity = ? WHERE id = ?').run(balance, equity, 'default');
}
// Paper Orders
export function getPaperOrders() {
    const rows = db.prepare('SELECT data FROM paper_orders').all();
    return rows.map((r) => JSON.parse(r.data));
}
export function savePaperOrder(order) {
    db.prepare('INSERT OR REPLACE INTO paper_orders (id, data) VALUES (?, ?)').run(order.id, JSON.stringify(order));
}
export function deletePaperOrder(id) {
    db.prepare('DELETE FROM paper_orders WHERE id = ?').run(id);
}
// Paper Positions
export function getPaperPositions() {
    const rows = db.prepare('SELECT data FROM paper_positions').all();
    return rows.map((r) => JSON.parse(r.data));
}
export function savePaperPosition(pos) {
    db.prepare('INSERT OR REPLACE INTO paper_positions (id, data) VALUES (?, ?)').run(pos.id, JSON.stringify(pos));
}
export function deletePaperPosition(id) {
    db.prepare('DELETE FROM paper_positions WHERE id = ?').run(id);
}
export { db };
//# sourceMappingURL=sqlite.js.map