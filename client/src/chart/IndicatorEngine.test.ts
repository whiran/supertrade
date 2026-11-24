import { describe, it, expect } from 'vitest';
import { EMA, RSI } from 'trading-signals';

describe('Incremental streaming indicators vs batch calculation', () => {
  it('incremental .add() and .replace() produces identical values to batch calculation', () => {
    const prices = [
      10, 11, 12, 11.5, 13, 14, 13.5, 15, 16, 15.5,
      17, 18, 17.5, 19, 20, 19.5, 21, 22, 21.5, 23,
    ];

    // Batch EMA
    const batchEMA = new EMA(5);
    for (const p of prices) {
      batchEMA.add(p);
    }
    const batchResult = Number(batchEMA.getResult());

    // Incremental: add historical bars, then start the forming bar with add(), followed by replace() updates
    const streamingEMA = new EMA(5);
    for (let i = 0; i < prices.length - 1; i++) {
      streamingEMA.add(prices[i]);
    }
    // Forming bar begins
    streamingEMA.add(22.2);
    // Forming bar intra-bar updates
    const fluctuations = [22.8, 23.5, 22.9, 23.0];
    for (const tick of fluctuations) {
      streamingEMA.replace(tick);
    }

    const streamingResult = Number(streamingEMA.getResult());
    expect(streamingResult).toBeCloseTo(batchResult, 5);
  });

  it('RSI incremental calculation stability check', () => {
    const rsi = new RSI(14);
    for (let i = 1; i <= 30; i++) {
      rsi.add(100 + (i % 2 === 0 ? 2 : -1));
    }
    expect(rsi.isStable).toBe(true);
    expect(Number(rsi.getResult())).toBeGreaterThan(0);
    expect(Number(rsi.getResult())).toBeLessThan(100);
  });
});
