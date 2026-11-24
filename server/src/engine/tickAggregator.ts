import type { CanonicalBar, Timeframe } from '@tv/shared';
import { insertCandle } from '../db/sqlite.js';

export const TF_SECONDS: Record<Timeframe, number> = {
  '1s': 1,
  '5s': 5,
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
};

export class TickAggregator {
  private openBars = new Map<string, CanonicalBar>();

  /**
   * Adds a tick and aggregates it into a CanonicalBar bucket.
   * If the bar crossed a timeframe boundary, the previous bar is finalized (isFinal: true)
   * and persisted to SQLite, and a new forming bar begins.
   */
  addTick(
    symbol: string,
    tf: Timeframe,
    price: number,
    volume: number,
    timestampMs: number,
    onBar: (bar: CanonicalBar) => void
  ): void {
    const intervalSec = TF_SECONDS[tf] || 60;
    const timeSec = Math.floor(timestampMs / 1000);
    const barStartSec = Math.floor(timeSec / intervalSec) * intervalSec;
    const key = `${symbol}:${tf}`;

    const existing = this.openBars.get(key);

    if (existing && barStartSec > existing.time) {
      // Finalize the previous bar
      const finalBar: CanonicalBar = { ...existing, isFinal: true };
      this.openBars.delete(key);
      try {
        insertCandle(finalBar, symbol, tf);
      } catch (err) {
        // Fallback for tests or before DB init
      }
      onBar(finalBar);

      // Bridge any skipped intervals between existing.time and barStartSec to eliminate blank gaps
      const steps = Math.min(Math.floor((barStartSec - existing.time) / intervalSec), 120);
      for (let i = 1; i < steps; i++) {
        const bridgeBar: CanonicalBar = {
          time: existing.time + i * intervalSec,
          open: existing.close,
          high: existing.close,
          low: existing.close,
          close: existing.close,
          volume: 0,
          isFinal: true,
        };
        try {
          insertCandle(bridgeBar, symbol, tf);
        } catch {}
        onBar(bridgeBar);
      }
    }

    const current = this.openBars.get(key);
    if (!current) {
      const newBar: CanonicalBar = {
        time: barStartSec,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
        isFinal: false,
      };
      this.openBars.set(key, newBar);
      onBar({ ...newBar });
    } else {
      current.high = Math.max(current.high, price);
      current.low = Math.min(current.low, price);
      current.close = price;
      current.volume += volume;
      onBar({ ...current, isFinal: false });
    }
  }

  getOpenBar(symbol: string, tf: Timeframe): CanonicalBar | undefined {
    return this.openBars.get(`${symbol}:${tf}`);
  }

  clear(): void {
    this.openBars.clear();
  }
}
