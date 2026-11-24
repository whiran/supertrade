import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
import { TickAggregator, TF_SECONDS } from '../engine/tickAggregator.js';
import { getCandleRange, insertCandleBatch } from '../db/sqlite.js';
import { fetchYahooMarketData } from './yahooFinance.js';

const COMMODITY_BASE_PRICES: Record<string, { price: number; decimals: number; desc: string }> = {
  USOIL: { price: 79.92, decimals: 2, desc: 'WTI Crude Oil' },
  BCOUSD: { price: 83.5, decimals: 2, desc: 'Brent Crude Oil' },
  XAUUSD: { price: 3624.1, decimals: 2, desc: 'Gold Spot / US Dollar' },
  XAGUSD: { price: 42.02, decimals: 3, desc: 'Silver Spot / US Dollar' },
  XPTUSD: { price: 980.0, decimals: 2, desc: 'Platinum Spot / US Dollar' },
  XPDUSD: { price: 1020.0, decimals: 2, desc: 'Palladium Spot / US Dollar' },
};

function normalizeSymbol(symbol: string): string {
  return symbol.replace('COMMODITY:', '').replace('/', '').replace('_', '').toUpperCase();
}

function generateCommodityHistory(
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
    const volume = Math.floor(Math.random() * 5000 + 1000);
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

export class CommoditiesAdapter implements ProviderAdapter {
  readonly id = 'commodities';
  readonly assetClass = 'commodity' as const;
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
    const meta = COMMODITY_BASE_PRICES[sym] || { price: 100.0, decimals: 2, desc: sym };
    const bars = generateCommodityHistory(symbol, tf, limit, meta.price, meta.decimals);
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
    const meta = COMMODITY_BASE_PRICES[sym] || { price: 100.0, decimals: 2, desc: sym };
    let livePrice = this.lastPrices.get(sym) || meta.price;

    const timer = setInterval(() => {
      const lastBarTime = this.lastBarTimes.get(sym);
      const intervalSec = TF_SECONDS[tf] || 60;
      const nowSec = Math.floor(Date.now() / 1000);
      const isMarketClosed = Boolean(lastBarTime && (nowSec - lastBarTime > 4 * intervalSec));

      const changePct = (Math.random() - 0.498) * 0.0004;
      livePrice = +(livePrice * (1 + changePct)).toFixed(meta.decimals);
      this.lastPrices.set(sym, livePrice);

      const spreadBps = +(Math.random() * 0.8 + 0.5).toFixed(2);
      const halfSpread = (livePrice * (spreadBps / 10000)) / 2;
      const bid = +(livePrice - halfSpread).toFixed(meta.decimals);
      const ask = +(livePrice + halfSpread).toFixed(meta.decimals);

      onQuote({
        symbol,
        assetClass: 'commodity',
        feedQuality: 'LIVE_BROKER_DEMO',
        bid,
        ask,
        last: livePrice,
        spreadBps,
        timestampMs: Date.now(),
      });

      if (!isMarketClosed) {
        this.agg.addTick(symbol, tf, livePrice, Math.floor(Math.random() * 80 + 10), Date.now(), onBar);
      }
    }, 1100);

    return () => {
      clearInterval(timer);
    };
  }
}
