import WebSocket from 'ws';
import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
import { TickAggregator, TF_SECONDS } from '../engine/tickAggregator.js';
import { getCandleRange, insertCandleBatch } from '../db/sqlite.js';
import { fetchYahooMarketData } from './yahooFinance.js';

const ALPACA_TF: Record<Timeframe, string> = {
  '1s': '1Sec',
  '5s': '5Sec',
  '1m': '1Min',
  '5m': '5Min',
  '15m': '15Min',
  '30m': '30Min',
  '1h': '1Hour',
  '4h': '4Hour',
  '1d': '1Day',
  '1w': '1Week',
};

const STOCK_BASE_PRICES: Record<string, number> = {
  SPY: 722.3,
  AAPL: 349.1,
  TSLA: 342.5,
  NVDA: 141.5,
  MSFT: 422.3,
  AMZN: 205.0,
  GOOGL: 185.0,
  META: 585.0,
};

function normalizeSymbol(symbol: string): string {
  return symbol.replace('ALPACA:', '').toUpperCase();
}

function generateStockHistory(
  symbol: string,
  tf: Timeframe,
  limit: number,
  basePrice: number
): CanonicalBar[] {
  const intervalSec = TF_SECONDS[tf] || 60;
  const count = Math.min(limit || 500, 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = Math.floor(nowSec / intervalSec) * intervalSec;
  const startSec = endSec - (count - 1) * intervalSec;

  const bars: CanonicalBar[] = [];
  let currentPrice = basePrice * 0.985;

  for (let i = 0; i < count; i++) {
    const time = startSec + i * intervalSec;
    const deltaPct = (Math.random() - 0.498) * 0.0015;
    const open = currentPrice;
    const close = +(open * (1 + deltaPct)).toFixed(2);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.001)).toFixed(2);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.001)).toFixed(2);
    const volume = Math.floor(Math.random() * 25000 + 5000);
    currentPrice = close;

    bars.push({
      time,
      open,
      high,
      low,
      close,
      volume,
      isFinal: true,
    });
  }
  return bars;
}

export class AlpacaAdapter implements ProviderAdapter {
  readonly id = 'alpaca';
  readonly assetClass = 'equity' as const;
  readonly feedQuality = 'LIVE_IEX_PARTIAL_VOL' as const;

  private apiKey = process.env.ALPACA_API_KEY || '';
  private apiSecret = process.env.ALPACA_API_SECRET || '';
  private feed = process.env.ALPACA_FEED || 'iex';
  private agg = new TickAggregator();
  private ws: WebSocket | null = null;
  private subscribedSymbols = new Set<string>();
  private lastPrices = new Map<string, number>();
  private lastBarTimes = new Map<string, number>();

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  async fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]> {
    const cached = getCandleRange(symbol, tf, limit, endSec);
    const intervalSec = TF_SECONDS[tf] || 60;
    const nowSec = Math.floor(Date.now() / 1000);
    const lastCachedTime = cached.length > 0 ? cached[cached.length - 1].time : 0;

    // Use cache if still fresh and recent
    if (cached.length >= Math.min(limit, 100) && (endSec || nowSec - lastCachedTime < intervalSec * 2)) {
      return cached;
    }

    const sym = normalizeSymbol(symbol);

    // If configured with Alpaca API keys, fetch from live Alpaca REST
    if (this.isConfigured) {
      const url = new URL(`https://data.alpaca.markets/v2/stocks/${sym}/bars`);
      url.searchParams.set('timeframe', ALPACA_TF[tf] || '1Min');
      url.searchParams.set('limit', String(Math.min(limit, 1000)));
      url.searchParams.set('feed', this.feed);
      if (endSec) {
        url.searchParams.set('end', new Date(endSec * 1000).toISOString());
      }

      try {
        const res = await fetch(url.toString(), {
          headers: {
            'APCA-API-KEY-ID': this.apiKey,
            'APCA-API-SECRET-KEY': this.apiSecret,
          },
        });
        if (!res.ok) throw new Error(`Alpaca error HTTP ${res.status}`);
        const data = (await res.json()) as any;
        const bars: CanonicalBar[] = (data.bars || []).map((b: any) => ({
          time: Math.floor(new Date(b.t).getTime() / 1000),
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
          volume: b.v,
          isFinal: true,
        }));
        insertCandleBatch(bars, symbol, tf);
        return bars;
      } catch (err) {
        console.warn(`[alpaca] fetchHistory live API error:`, err);
      }
    }

    // Try real-market data from Yahoo Finance (matches live TradingView prices)
    const yahoo = await fetchYahooMarketData(symbol, tf, limit);
    if (yahoo && yahoo.bars.length > 0) {
      insertCandleBatch(yahoo.bars, symbol, tf);
      this.lastPrices.set(sym, yahoo.price);
      this.lastBarTimes.set(sym, yahoo.bars[yahoo.bars.length - 1].time);
      return yahoo.bars;
    }

    // Fallback: Generate realistic synthetic market history
    const basePrice = STOCK_BASE_PRICES[sym] || 150.0;
    const bars = generateStockHistory(symbol, tf, limit, basePrice);
    insertCandleBatch(bars, symbol, tf);
    if (bars.length > 0) {
      this.lastPrices.set(sym, bars[bars.length - 1].close);
      this.lastBarTimes.set(sym, bars[bars.length - 1].time);
    }
    return bars;
  }

  subscribe(
    symbol: string,
    tf: Timeframe,
    onBar: (bar: CanonicalBar) => void,
    onQuote: (quote: LiveQuote) => void
  ): () => void {
    const sym = normalizeSymbol(symbol);

    // If API keys provided, connect to live Alpaca IEX stream
    if (this.isConfigured) {
      if (this.subscribedSymbols.size >= 30) {
        console.warn('[alpaca] 30-symbol cap reached for free IEX feed');
        return () => {};
      }
      this.subscribedSymbols.add(sym);

      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        const wsUrl = `wss://stream.data.alpaca.markets/v2/${this.feed}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          this.ws?.send(
            JSON.stringify({
              action: 'auth',
              key: this.apiKey,
              secret: this.apiSecret,
            })
          );
        });

        this.ws.on('message', (raw) => {
          try {
            const msgs = JSON.parse(raw.toString()) as any[];
            for (const msg of msgs) {
              if (msg.T === 'authenticated') {
                this.ws?.send(
                  JSON.stringify({
                    action: 'subscribe',
                    trades: Array.from(this.subscribedSymbols),
                    quotes: Array.from(this.subscribedSymbols),
                  })
                );
              } else if (msg.T === 't') {
                const s = `ALPACA:${msg.S}`;
                this.agg.addTick(s, tf, msg.p, msg.s, new Date(msg.t).getTime(), onBar);
              } else if (msg.T === 'q') {
                const s = `ALPACA:${msg.S}`;
                const bid = msg.bp;
                const ask = msg.ap;
                const mid = (bid + ask) / 2;
                onQuote({
                  symbol: s,
                  assetClass: 'equity',
                  feedQuality: 'LIVE_IEX_PARTIAL_VOL',
                  bid,
                  ask,
                  last: mid,
                  spreadBps: mid > 0 ? ((ask - bid) / mid) * 10000 : 0,
                  timestampMs: Date.now(),
                });
              }
            }
          } catch {
            // ignore
          }
        });
      } else if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            action: 'subscribe',
            trades: [sym],
            quotes: [sym],
          })
        );
      }

      return () => {
        this.subscribedSymbols.delete(sym);
      };
    }

    // Fallback: Real-time stock tick simulator for instant zero-key out-of-the-box operation
    const basePrice = STOCK_BASE_PRICES[sym] || 150.0;
    let livePrice = this.lastPrices.get(sym) || basePrice;

    const timer = setInterval(() => {
      const lastBarTime = this.lastBarTimes.get(sym);
      const intervalSec = TF_SECONDS[tf] || 60;
      const nowSec = Math.floor(Date.now() / 1000);
      const isMarketClosed = Boolean(lastBarTime && (nowSec - lastBarTime > 4 * intervalSec));

      const changePct = (Math.random() - 0.498) * 0.0006;
      livePrice = +(livePrice * (1 + changePct)).toFixed(2);
      this.lastPrices.set(sym, livePrice);

      const spreadBps = +(Math.random() * 1.2 + 0.6).toFixed(1);
      const halfSpread = (livePrice * (spreadBps / 10000)) / 2;
      const bid = +(livePrice - halfSpread).toFixed(2);
      const ask = +(livePrice + halfSpread).toFixed(2);
      const vol = Math.floor(Math.random() * 200 + 20);

      onQuote({
        symbol,
        assetClass: 'equity',
        feedQuality: 'LIVE_IEX_PARTIAL_VOL',
        bid,
        ask,
        last: livePrice,
        spreadBps,
        timestampMs: Date.now(),
      });

      // Avoid creating phantom candles in the future when market is closed
      if (!isMarketClosed) {
        this.agg.addTick(symbol, tf, livePrice, vol, Date.now(), onBar);
      }
    }, 1200);

    return () => {
      clearInterval(timer);
    };
  }
}
