import WebSocket from 'ws';
import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
import { TickAggregator } from '../engine/tickAggregator.js';
import { getCandleRange, insertCandleBatch } from '../db/sqlite.js';

const BYBIT_TF: Record<Timeframe, string> = {
  '1s': '1',
  '5s': '1',
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
};

function normalizeSymbol(symbol: string): string {
  return symbol.replace('BINANCE:', '').replace('BYBIT:', '').toUpperCase();
}

export class BybitAdapter implements ProviderAdapter {
  readonly id = 'bybit';
  readonly assetClass = 'crypto' as const;
  readonly feedQuality = 'LIVE_EXCHANGE' as const;

  private agg = new TickAggregator();
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  async fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]> {
    const cached = getCandleRange(symbol, tf, limit, endSec);
    if (cached.length >= Math.min(limit, 100)) return cached;

    const sym = normalizeSymbol(symbol);
    const interval = BYBIT_TF[tf] || '1';
    const url = new URL('https://api.bybit.com/v5/market/kline');
    url.searchParams.set('category', 'spot');
    url.searchParams.set('symbol', sym);
    url.searchParams.set('interval', interval);
    url.searchParams.set('limit', String(Math.min(limit, 200)));
    if (endSec) url.searchParams.set('end', String(endSec * 1000));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Bybit HTTP error: ${res.status}`);
      const data = (await res.json()) as any;
      if (data.result?.list) {
        const bars: CanonicalBar[] = (data.result.list as any[][]).reverse().map((k) => ({
          time: Math.floor(parseInt(k[0]) / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          isFinal: true,
        }));
        insertCandleBatch(bars, symbol, tf);
        return bars;
      }
    } catch (e) {
      console.warn(`[bybit] fetchHistory failed:`, e);
    }
    return cached;
  }

  subscribe(
    symbol: string,
    tf: Timeframe,
    onBar: (bar: CanonicalBar) => void,
    onQuote: (quote: LiveQuote) => void
  ): () => void {
    const sym = normalizeSymbol(symbol);
    const interval = BYBIT_TF[tf] || '1';

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');

      this.ws.on('open', () => {
        this.ws?.send(
          JSON.stringify({
            op: 'subscribe',
            args: [`publicTrade.${sym}`, `orderbook.1.${sym}`, `kline.${interval}.${sym}`],
          })
        );

        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 'ping' }));
          }
        }, 20000);
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.topic?.startsWith('orderbook')) {
            const bids = msg.data?.b as [string, string][];
            const asks = msg.data?.a as [string, string][];
            if (bids?.[0] && asks?.[0]) {
              const bid = parseFloat(bids[0][0]);
              const ask = parseFloat(asks[0][0]);
              const mid = (bid + ask) / 2;
              onQuote({
                symbol,
                assetClass: 'crypto',
                feedQuality: 'LIVE_EXCHANGE',
                bid,
                ask,
                last: mid,
                spreadBps: mid > 0 ? ((ask - bid) / mid) * 10000 : 0,
                timestampMs: Date.now(),
              });
            }
          } else if (msg.topic?.startsWith('publicTrade')) {
            for (const t of msg.data || []) {
              this.agg.addTick(symbol, tf, parseFloat(t.p), parseFloat(t.v), parseInt(t.T), onBar);
            }
          }
        } catch {
          // ignore
        }
      });
    }

    return () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.ws?.close();
      this.ws = null;
    };
  }
}
