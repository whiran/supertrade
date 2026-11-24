import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
import { TickAggregator, TF_SECONDS } from '../engine/tickAggregator.js';
import { getCandleRange, insertCandleBatch } from '../db/sqlite.js';
import { fetchYahooMarketData } from './yahooFinance.js';

const INDEX_BASE_PRICES: Record<string, { price: number; decimals: number; desc: string }> = {
  SPX: { price: 7237.2, decimals: 2, desc: 'S&P 500 Index' },
  DJI: { price: 49595.3, decimals: 2, desc: 'Dow Jones Industrial Average' },
  IXIC: { price: 24089.5, decimals: 2, desc: 'Nasdaq Composite' },
  NDX: { price: 25100.0, decimals: 2, desc: 'Nasdaq 100 Index' },
  RUT: { price: 2450.0, decimals: 2, desc: 'Russell 2000 Index' },
};

function normalizeSymbol(symbol: string): string {
  return symbol.replace('INDEX:', '').toUpperCase();
}

function generateIndexHistory(
  symbol: string,
  tf: Timeframe,
  limit: number,
  basePrice: number,
  decimals: number
): CanonicalBar[] {
  const intervalSec = TF_SECONDS[tf] || 60;
  const count = Math.min(limit || 500, 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = Math.floor(nowSec / intervalSec) * intervalSec;
  const startSec = endSec - (count - 1) * intervalSec;

  const bars: CanonicalBar[] = [];
  let currentPrice = basePrice * 0.995;

  for (let i = 0; i < count; i++) {
    const time = startSec + i * intervalSec;
    const deltaPct = (Math.random() - 0.498) * 0.0008;
    const open = +currentPrice.toFixed(decimals);
    const close = +(open * (1 + deltaPct)).toFixed(decimals);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.0005)).toFixed(decimals);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.0005)).toFixed(decimals);
    const volume = Math.floor(Math.random() * 100000 + 20000);
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

export class IndicesAdapter implements ProviderAdapter {
  readonly id = 'indices';
  readonly assetClass = 'index' as const;
  readonly feedQuality = 'LIVE_BROKER_DEMO' as const;

  private agg = new TickAggregator();
  private lastPrices = new Map<string, number>();
  private lastBarTimes = new Map<string, number>();

  async fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]> {
    const cached = getCandleRange(symbol, tf, limit, endSec);
    const intervalSec = TF_SECONDS[tf] || 60;
    const nowSec = Math.floor(Date.now() / 1000);
    const lastCachedTime = cached.length > 0 ? cached[cached.length - 1].time : 0;

    if (cached.length >= Math.min(limit, 100) && (endSec || nowSec - lastCachedTime < intervalSec * 2)) {
      return cached;
    }

    const sym = normalizeSymbol(symbol);

    // Try real-market data from Yahoo Finance (matches live TradingView prices)
    const yahoo = await fetchYahooMarketData(symbol, tf, limit);
    if (yahoo && yahoo.bars.length > 0) {
      insertCandleBatch(yahoo.bars, symbol, tf);
      this.lastPrices.set(sym, yahoo.price);
      this.lastBarTimes.set(sym, yahoo.bars[yahoo.bars.length - 1].time);
      return yahoo.bars;
    }

    // Fallback: Generate realistic synthetic market history
    const meta = INDEX_BASE_PRICES[sym] || { price: 5000.0, decimals: 2, desc: sym };
    const bars = generateIndexHistory(symbol, tf, limit, meta.price, meta.decimals);
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
    const meta = INDEX_BASE_PRICES[sym] || { price: 5000.0, decimals: 2, desc: sym };
    let livePrice = this.lastPrices.get(sym) || meta.price;

    const timer = setInterval(() => {
      const lastBarTime = this.lastBarTimes.get(sym);
      const intervalSec = TF_SECONDS[tf] || 60;
      const nowSec = Math.floor(Date.now() / 1000);
      const isMarketClosed = Boolean(lastBarTime && (nowSec - lastBarTime > 4 * intervalSec));

      const changePct = (Math.random() - 0.498) * 0.0003;
      livePrice = +(livePrice * (1 + changePct)).toFixed(meta.decimals);
      this.lastPrices.set(sym, livePrice);

      const spreadBps = +(Math.random() * 0.4 + 0.2).toFixed(2);
      const halfSpread = (livePrice * (spreadBps / 10000)) / 2;
      const bid = +(livePrice - halfSpread).toFixed(meta.decimals);
      const ask = +(livePrice + halfSpread).toFixed(meta.decimals);

      onQuote({
        symbol,
        assetClass: 'index',
        feedQuality: 'LIVE_BROKER_DEMO',
        bid,
        ask,
        last: livePrice,
        spreadBps,
        timestampMs: Date.now(),
      });

      if (!isMarketClosed) {
        this.agg.addTick(symbol, tf, livePrice, Math.floor(Math.random() * 500 + 50), Date.now(), onBar);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }
}
