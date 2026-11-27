import type { CanonicalBar, Timeframe } from '@tv/shared';

const YAHOO_INTERVAL_MAP: Record<Timeframe, { interval: string; range: string }> = {
  '1s': { interval: '1m', range: '1d' },
  '5s': { interval: '1m', range: '1d' },
  '1m': { interval: '1m', range: '1d' },
  '5m': { interval: '5m', range: '5d' },
  '15m': { interval: '15m', range: '5d' },
  '30m': { interval: '30m', range: '1mo' },
  '1h': { interval: '1h', range: '1mo' },
  '4h': { interval: '1h', range: '3mo' }, // Aggregated to 4h
  '1d': { interval: '1d', range: '1y' },
  '1w': { interval: '1wk', range: '2y' },
};

export function mapToYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();

  // Major Indices
  if (clean.includes('INDEX:SPX') || clean === 'SPX' || clean === 'SP500') return '^GSPC';
  if (clean.includes('INDEX:DJI') || clean === 'DJI' || clean === 'US30') return '^DJI';
  if (clean.includes('INDEX:IXIC') || clean === 'IXIC') return '^IXIC';
  if (clean.includes('INDEX:NDX') || clean === 'NDX' || clean === 'NAS100') return '^NDX';
  if (clean.includes('INDEX:RUT') || clean === 'RUT') return '^RUT';

  // Commodities & Precious Metals
  if (clean.includes('COMMODITY:USOIL') || clean.includes('WTICO_USD') || clean === 'USOIL' || clean === 'CL') return 'CL=F';
  if (clean.includes('COMMODITY:BCOUSD') || clean.includes('BCO_USD') || clean === 'BCO') return 'BZ=F';
  if (clean.includes('COMMODITY:XAUUSD') || clean.includes('XAU_USD') || clean.includes('XAUUSD')) return 'GC=F';
  if (clean.includes('COMMODITY:XAGUSD') || clean.includes('XAG_USD') || clean.includes('XAGUSD')) return 'SI=F';
  if (clean.includes('COMMODITY:XPTUSD') || clean.includes('XPT_USD') || clean.includes('XPTUSD')) return 'PL=F';
  if (clean.includes('COMMODITY:XPDUSD') || clean.includes('XPD_USD') || clean.includes('XPDUSD')) return 'PA=F';

  // Forex
  if (clean.startsWith('OANDA:') || clean.includes('/') || clean.includes('_')) {
    const pair = clean.replace('OANDA:', '').replace('/', '').replace('_', '');
    if (pair.length === 6) {
      return `${pair}=X`;
    }
  }

  // Equities (ALPACA:SPY -> SPY)
  return clean.replace('ALPACA:', '').replace(/[/_]/g, '');
}

export interface YahooMarketData {
  price: number;
  bid: number;
  ask: number;
  bars: CanonicalBar[];
}

export async function fetchYahooMarketData(
  symbol: string,
  tf: Timeframe,
  limit: number = 500
): Promise<YahooMarketData | null> {
  const yahooSym = mapToYahooSymbol(symbol);
  const cfg = YAHOO_INTERVAL_MAP[tf] || { interval: '1m', range: '1d' };
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${cfg.interval}&range=${cfg.range}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp || result.timestamp.length === 0) return null;

    const meta = result.meta || {};
    const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
    const quote = result.indicators?.quote?.[0] || {};
    const timestamps: number[] = result.timestamp;
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];

    const rawBars: CanonicalBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (o === null || h === null || l === null || c === null || isNaN(c)) continue;

      rawBars.push({
        time: timestamps[i],
        open: +o.toFixed(4),
        high: +h.toFixed(4),
        low: +l.toFixed(4),
        close: +c.toFixed(4),
        volume: volumes[i] ? Math.round(volumes[i]!) : 100,
        isFinal: true,
      });
    }

    if (rawBars.length === 0) return null;

    // Bucket-align ALL timeframes so LWC sees clean, regularly-spaced timestamps
    const TF_BUCKET_SEC: Record<string, number> = {
      '1s': 1, '5s': 5, '1m': 60, '5m': 300, '15m': 900,
      '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800,
    };
    const bucketSec = TF_BUCKET_SEC[tf] || 60;
    let finalBars = aggregateBars(rawBars, bucketSec);

    const sliced = finalBars.slice(-limit);
    const lastPrice = sliced[sliced.length - 1]?.close || price;

    return {
      price: lastPrice,
      bid: +(lastPrice * 0.9999).toFixed(4),
      ask: +(lastPrice * 1.0001).toFixed(4),
      bars: sliced,
    };
  } catch (err: any) {
    console.warn(`[yahooFinance] Failed to fetch ${yahooSym}:`, err?.message || err);
    return null;
  }
}

function aggregateBars(bars: CanonicalBar[], bucketSec: number): CanonicalBar[] {
  const map = new Map<number, CanonicalBar>();
  for (const b of bars) {
    const bucket = Math.floor(b.time / bucketSec) * bucketSec;
    const existing = map.get(bucket);
    if (!existing) {
      map.set(bucket, {
        time: bucket,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
        isFinal: true,
      });
    } else {
      existing.high = Math.max(existing.high, b.high);
      existing.low = Math.min(existing.low, b.low);
      existing.close = b.close;
      existing.volume += b.volume;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}
