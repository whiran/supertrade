import WebSocket from 'ws';
import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
import { TickAggregator } from '../engine/tickAggregator.js';
import { getCandleRange, insertCandleBatch } from '../db/sqlite.js';

const TF_MAP: Record<Timeframe, string> = {
  '1s': '1s',
  '5s': '1s', // Binance spot min kline is 1s
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

function normalizeSymbol(symbol: string): string {
  return symbol.replace('BINANCE:', '').toUpperCase();
}

export class BinanceAdapter implements ProviderAdapter {
  readonly id = 'binance';
  readonly assetClass = 'crypto' as const;
  readonly feedQuality = 'LIVE_EXCHANGE' as const;

  private agg = new TickAggregator();
  private ws: WebSocket | null = null;
  private activeStreams = new Map<string, { symbol: string; tf: Timeframe }>();
  private onBarCallbacks = new Map<string, Set<(bar: CanonicalBar) => void>>();
  private onQuoteCallbacks = new Map<string, Set<(quote: LiveQuote) => void>>();
  private rolloverTimer: NodeJS.Timeout | null = null;

  async fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]> {
    // 1. Check SQLite cache first
    const cached = getCandleRange(symbol, tf, limit, endSec);
    if (cached.length >= Math.min(limit, 100)) {
      return cached;
    }

    // 2. Fetch from Binance REST API
    const cleanSym = normalizeSymbol(symbol);
    const interval = TF_MAP[tf] || '1m';
    const url = new URL('https://api.binance.com/api/v3/klines');
    url.searchParams.set('symbol', cleanSym);
    url.searchParams.set('interval', interval);
    url.searchParams.set('limit', String(Math.min(limit, 1000)));
    if (endSec) {
      url.searchParams.set('endTime', String(endSec * 1000));
    }

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Binance klines failed with HTTP ${res.status}`);
      }
      const data = (await res.json()) as any[][];
      const bars: CanonicalBar[] = data.map((k) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        isFinal: true,
      }));

      // Cache into SQLite
      insertCandleBatch(bars, symbol, tf);
      return bars;
    } catch (err) {
      console.warn(`[binance] fetchHistory error for ${symbol}:`, err);
      return cached;
    }
  }

  subscribe(
    symbol: string,
    tf: Timeframe,
    onBar: (bar: CanonicalBar) => void,
    onQuote: (quote: LiveQuote) => void
  ): () => void {
    const key = `${symbol}:${tf}`;
    if (!this.onBarCallbacks.has(key)) {
      this.onBarCallbacks.set(key, new Set());
      this.onQuoteCallbacks.set(key, new Set());
    }
    this.onBarCallbacks.get(key)!.add(onBar);
    this.onQuoteCallbacks.get(key)!.add(onQuote);

    this.activeStreams.set(key, { symbol, tf });
    this.ensureConnection();

    return () => {
      this.onBarCallbacks.get(key)?.delete(onBar);
      this.onQuoteCallbacks.get(key)?.delete(onQuote);
      if (this.onBarCallbacks.get(key)?.size === 0) {
        this.activeStreams.delete(key);
      }
    };
  }

  private ensureConnection(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Build combined stream URL
    const streams: string[] = [];
    for (const { symbol, tf } of this.activeStreams.values()) {
      const s = normalizeSymbol(symbol).toLowerCase();
      const interval = TF_MAP[tf] || '1m';
      streams.push(`${s}@aggTrade`, `${s}@bookTicker`, `${s}@kline_${interval}`);
    }

    const defaultStreams = ['btcusdt@aggTrade', 'btcusdt@bookTicker', 'btcusdt@kline_1m'];
    const streamList = streams.length > 0 ? Array.from(new Set(streams)) : defaultStreams;
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamList.join('/')}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log(`[binance] Connected to combined streams (${streamList.length} streams)`);
      // Proactive 23h connection rollover per spec
      if (this.rolloverTimer) clearTimeout(this.rolloverTimer);
      this.rolloverTimer = setTimeout(() => {
        console.log('[binance] Executing proactive 23-hour connection rollover');
        this.ws?.close();
      }, 23 * 60 * 60 * 1000);
    });

    this.ws.on('ping', (data) => {
      // Echo Ping in Pong frame per spec
      this.ws?.pong(data);
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const data = msg.data || msg;
        const stream = msg.stream || '';

        // Handle bookTicker for quotes
        if (stream.includes('@bookTicker')) {
          const sym = `BINANCE:${data.s}`;
          const bid = parseFloat(data.b);
          const ask = parseFloat(data.a);
          const mid = (bid + ask) / 2;
          const spreadBps = mid > 0 ? ((ask - bid) / mid) * 10000 : 0;
          const quote: LiveQuote = {
            symbol: sym,
            assetClass: 'crypto',
            feedQuality: 'LIVE_EXCHANGE',
            bid,
            ask,
            last: mid,
            spreadBps,
            timestampMs: Date.now(),
          };

          for (const [k, cbs] of this.onQuoteCallbacks.entries()) {
            if (k.startsWith(sym)) {
              cbs.forEach((cb) => cb(quote));
            }
          }
        }

        // Handle aggTrade for tick aggregator
        if (stream.includes('@aggTrade')) {
          const sym = `BINANCE:${data.s}`;
          const price = parseFloat(data.p);
          const vol = parseFloat(data.q);
          const timeMs = data.T;

          for (const [k, cbs] of this.onBarCallbacks.entries()) {
            if (k.startsWith(sym)) {
              const [, tf] = k.split(':') as [string, Timeframe];
              this.agg.addTick(sym, tf, price, vol, timeMs, (bar) => {
                cbs.forEach((cb) => cb(bar));
              });
            }
          }
        }

        // Handle kline messages
        if (stream.includes('@kline')) {
          const k = data.k;
          if (k && k.x) {
            const sym = `BINANCE:${data.s}`;
            const bar: CanonicalBar = {
              time: Math.floor(k.t / 1000),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isFinal: true,
            };
            for (const [key, cbs] of this.onBarCallbacks.entries()) {
              if (key.startsWith(sym)) {
                cbs.forEach((cb) => cb(bar));
              }
            }
          }
        }
      } catch (err) {
        // Ignore parse error
      }
    });

    this.ws.on('close', () => {
      console.log('[binance] WS connection closed, reconnecting in 2s...');
      setTimeout(() => this.ensureConnection(), 2000);
    });

    this.ws.on('error', (err) => {
      console.warn('[binance] WS error:', err.message);
    });
  }
}
